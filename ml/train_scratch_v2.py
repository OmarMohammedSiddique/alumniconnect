"""From-scratch mentorship encoder, version 2. Training and validation only; never final-test scoring.

What changes from the v1 character CNN, and why (see docs/ml-scratch-v2.md):

1. Input features: a bag of word unigrams, word bigrams and character 3 to 5 grams, with a
   vocabulary fitted on training profiles only. Validation mentees share no exact skill strings
   with validation mentors, and character n-grams are what lets TF-IDF still match them.
2. Encoder: a randomly initialised EmbeddingBag (mean of feature vectors) with separate query
   and mentor heads. No pretrained weights or components are loaded.
3. Self-supervised warm-up on training profile text only: two randomly thinned views of the
   same profile are pulled together and other profiles pushed apart (contrastive InfoNCE).
   No labels are used in this stage.
4. Supervised loss: listwise. Each mentee's judged candidates are ranked together, matching how
   the model is used, instead of v1's pointwise regression of one pair at a time.
5. Selection: configuration and epoch count are chosen by five-fold cross-validation on the training
   split. Folds hold out Mentees, and fit pairs whose Mentor also appears in the held-out fold are
   dropped, so held-out Mentees and Mentors are both unseen. The validation split is scored once per
   seed, after selection. One epoch is one full-batch Adam step over every judged pool.

Unjudged mentee and mentor combinations are never treated as negatives.
"""
import argparse
from collections import Counter
import time
from datetime import datetime, timezone
import hashlib
import itertools
import json
from pathlib import Path
import platform
import random
import re
import statistics
import subprocess
import sys

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

ML_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ML_DIR))
from ranker_features import load_jsonl  # noqa: E402  (refuses test split files)
from train_gbdt_ranker import check_split, grouped_folds, mean_ndcg5, ordered, tfidf_scores  # noqa: E402
from ranker_features import fit_vectoriser  # noqa: E402
from train_scratch_pilot import evaluate, text  # noqa: E402

RUNS_ROOT = ML_DIR / 'runs'
FOLDS = 5
SEEDS = (42, 43, 44, 45, 46)
EPOCHS = 40
LEARNING_RATE = 5e-3
FEATURE_DROPOUT = 0.2
PRETRAIN_STEPS = 150
TEMPERATURE = 0.1
# Pre-declared grid. Chosen before any v2 result was seen; kept small because 20 training
# mentees cannot support a wide search.
GRID = {'dimension': (32, 64), 'pretrain': (False, True)}

WORD = re.compile(r"[a-z0-9][a-z0-9+#.]*")


def tokens(profile):
    return WORD.findall(text(profile).casefold())


def raw_features(profile):
    """Word unigrams and bigrams plus character 3 to 5 grams inside word boundaries."""
    words = tokens(profile)
    features = ['w:' + word for word in words]
    features += ['b:' + left + '_' + right for left, right in zip(words, words[1:])]
    for word in words:
        padded = '<' + word + '>'
        for size in (3, 4, 5):
            features += ['c:' + padded[i:i + size] for i in range(len(padded) - size + 1)]
    return features


PAD = '<PAD>'  # index 0: an empty bag maps here and contributes a zero vector


def fit_vocabulary(train_profiles, min_count=1):
    """Feature vocabulary from training profiles only. Refuses any profile from another split."""
    if any(profile['split'] != 'train' for profile in train_profiles):
        raise ValueError('The vocabulary may only be fitted on training profiles')
    counts = Counter(feature for profile in train_profiles for feature in set(raw_features(profile)))
    kept = sorted(feature for feature, count in counts.items() if count >= min_count)
    return {PAD: 0, **{feature: index + 1 for index, feature in enumerate(kept)}}


def feature_ids(profile, vocabulary):
    """Known feature ids for a profile (never the padding index); unseen features are dropped, never added."""
    return [vocabulary[feature] for feature in raw_features(profile) if feature in vocabulary and feature != PAD]


class BagEncoder(nn.Module):
    """Random feature embeddings averaged into one vector, then directional heads."""

    def __init__(self, vocabulary_size, dimension):
        super().__init__()
        self.embedding = nn.EmbeddingBag(vocabulary_size, dimension, mode='mean', padding_idx=0)
        nn.init.normal_(self.embedding.weight, std=0.1)
        with torch.no_grad():
            self.embedding.weight[0].zero_()
        self.query_head = nn.Linear(dimension, dimension)
        self.mentor_head = nn.Linear(dimension, dimension)
        self.log_scale = nn.Parameter(torch.tensor(np.log(10.0), dtype=torch.float32))

    def base(self, bags):
        flat = torch.tensor([i for bag in bags for i in bag], dtype=torch.long)
        offsets = torch.tensor(list(itertools.accumulate([0] + [len(bag) for bag in bags[:-1]])), dtype=torch.long)
        return self.embedding(flat, offsets)

    def forward(self, bags, query):
        head = self.query_head if query else self.mentor_head
        return F.normalize(head(self.base(bags)), dim=1)


def thin(bag, rate, generator):
    """Randomly drop feature ids (always keeping at least one) for augmentation and regularisation."""
    if not bag:
        return [0]
    kept = [i for i in bag if generator.random() >= rate]
    return kept or [bag[generator.randrange(len(bag))]]


def pretrain(model, bags, steps, generator, learning_rate=LEARNING_RATE):
    """Contrastive warm-up on profile text alone: two thinned views of the same profile match."""
    if len(bags) < 2 or steps <= 0:
        return
    optimizer = torch.optim.Adam(model.embedding.parameters(), lr=learning_rate)
    targets = torch.arange(len(bags))
    for _ in range(steps):
        first = F.normalize(model.base([thin(bag, 0.4, generator) for bag in bags]), dim=1)
        second = F.normalize(model.base([thin(bag, 0.4, generator) for bag in bags]), dim=1)
        logits = first @ second.T / TEMPERATURE
        loss = (F.cross_entropy(logits, targets) + F.cross_entropy(logits.T, targets)) / 2
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()


def pools(pairs):
    """Judged candidates grouped by mentee, in a stable order."""
    grouped = {}
    for pair in ordered(pairs):
        grouped.setdefault(pair['mentee_id'], []).append(pair)
    return grouped


def listwise_loss(model, grouped, bags, generator, dropout):
    """ListNet: softmax over each mentee's judged pool against a softmax of the grades."""
    losses = []
    for mentee, candidates in grouped.items():
        query = model([thin(bags[mentee], dropout, generator)], True)
        mentors = model([thin(bags[pair['mentor_id']], dropout, generator) for pair in candidates], False)
        logits = (query @ mentors.T).squeeze(0) * model.log_scale.exp()
        grades = torch.tensor([float(pair['relevance_score']) for pair in candidates])
        losses.append(-(F.softmax(grades, dim=0) * F.log_softmax(logits, dim=0)).sum())
    return torch.stack(losses).mean()


def train(profiles, pairs, config, seed, epochs, evaluate_on=None):
    """Fit one model. Returns the model, vocabulary and (optionally) per-epoch nDCG@5 on held-out pairs."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    generator = random.Random(seed)
    vocabulary = fit_vocabulary([profile for profile in profiles if profile['split'] == 'train'])
    model = BagEncoder(len(vocabulary), config['dimension'])
    bags = {profile['person_id']: feature_ids(profile, vocabulary) for profile in profiles}
    if config['pretrain']:
        pretrain(model, list(bags.values()), PRETRAIN_STEPS, generator)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    grouped = pools(pairs)
    curve = []
    for _ in range(epochs):
        model.train()
        loss = listwise_loss(model, grouped, bags, generator, FEATURE_DROPOUT)
        if not torch.isfinite(loss):
            raise ValueError('Nonfinite loss')
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        if evaluate_on is not None:
            held_profiles, held_pairs = evaluate_on
            curve.append(mean_ndcg5(held_pairs, pair_scores(model, vocabulary, held_profiles, held_pairs)))
    return model, vocabulary, curve


@torch.no_grad()
def pair_scores(model, vocabulary, profiles, pairs):
    model.eval()
    lookup = {profile['person_id']: profile for profile in profiles}
    queries = model([feature_ids(lookup[pair['mentee_id']], vocabulary) or [0] for pair in pairs], True)
    mentors = model([feature_ids(lookup[pair['mentor_id']], vocabulary) or [0] for pair in pairs], False)
    return (queries * mentors).sum(1).tolist()


@torch.no_grad()
def pool_scores(model, vocabulary, profiles):
    """Score matrix in the order `evaluate` expects: sorted mentees by sorted mentors."""
    model.eval()
    mentees = sorted((p for p in profiles if p['role'] == 'mentee'), key=lambda p: p['person_id'])
    mentors = sorted((p for p in profiles if p['role'] == 'mentor'), key=lambda p: p['person_id'])
    q = model([feature_ids(p, vocabulary) or [0] for p in mentees], True)
    m = model([feature_ids(p, vocabulary) or [0] for p in mentors], False)
    return (q @ m.T).numpy()


def fold_split(pairs, profiles, held_out):
    """One cross-validation fold. Held-out Mentees and every Mentor judged for them are kept out of
    fitting: fit pairs that use a held-out Mentor are dropped, so neither side is seen in training."""
    lookup = {profile['person_id']: profile for profile in profiles}
    held = set(held_out)
    held_pairs = [pair for pair in pairs if pair['mentee_id'] in held]
    held_mentors = {pair['mentor_id'] for pair in held_pairs}
    fit_pairs = [pair for pair in pairs if pair['mentee_id'] not in held and pair['mentor_id'] not in held_mentors]
    fit_ids = {pair[key] for pair in fit_pairs for key in ('mentee_id', 'mentor_id')}
    held_ids = {pair[key] for pair in held_pairs for key in ('mentee_id', 'mentor_id')}
    if fit_ids & held_ids:
        raise ValueError('Fold overlap')
    return ([lookup[i] for i in sorted(fit_ids)], fit_pairs, [lookup[i] for i in sorted(held_ids)], held_pairs)


def cross_validate(profiles, pairs, config, seed):
    """Per-epoch mean nDCG@5 over Mentee and Mentor disjoint folds. Each fold refits the vocabulary."""
    curves = []
    for held_out in grouped_folds([pair['mentee_id'] for pair in pairs], FOLDS, seed):
        fit_profiles, fit_pairs, held_profiles, held_pairs = fold_split(pairs, profiles, held_out)
        _, _, curve = train(fit_profiles, fit_pairs, config, seed, EPOCHS, (held_profiles, held_pairs))
        curves.append(curve)
    mean_curve = [statistics.fmean(values) for values in zip(*curves)]
    best_epoch = max(range(len(mean_curve)), key=lambda i: (round(mean_curve[i], 9), -i)) + 1
    return {'mean_curve': mean_curve, 'best_epoch': best_epoch, 'best_mean_ndcg5': mean_curve[best_epoch - 1]}


def query_independent_share(scores):
    """Share of score variance explained by each Mentor's mean score (1.0 = every Mentee gets the same order)."""
    scores = np.asarray(scores, dtype=float)
    total = scores.var()
    return float(np.broadcast_to(scores.mean(axis=0, keepdims=True), scores.shape).var() / total) if total else 1.0


def git_state():
    try:
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True, cwd=ML_DIR).strip()
        dirty = bool(subprocess.check_output(['git', 'status', '--porcelain', '--', '.'], text=True, cwd=ML_DIR).strip())
    except (subprocess.SubprocessError, OSError):
        commit, dirty = 'unknown', True
    return commit, dirty


def summarise(values):
    return {'mean': statistics.fmean(values), 'sd': statistics.stdev(values) if len(values) > 1 else 0.0,
            'min': min(values), 'max': max(values)}


def run(data_dir, output_dir, runs_root=RUNS_ROOT, seeds=SEEDS, allow_machine_labels=False):
    if not allow_machine_labels:
        raise ValueError('Unreviewed pilot data requires explicit allow_machine_labels=True')
    root, output, runs_root = Path(data_dir), Path(output_dir).resolve(), Path(runs_root).resolve()
    if output == runs_root or not output.is_relative_to(runs_root):
        raise ValueError('The output directory must be inside ' + str(runs_root))
    if output.exists():
        raise FileExistsError('Choose a fresh run directory')
    # Deliberately no test-profile or test-label loading here.
    train_profiles = load_jsonl(root / 'train_profiles.jsonl')
    train_pairs = ordered(load_jsonl(root / 'train_pairs.jsonl'))
    val_profiles = load_jsonl(root / 'validation_profiles.jsonl')
    val_pairs = ordered(load_jsonl(root / 'validation_pairs.jsonl'))
    check_split('train', train_profiles, train_pairs)
    check_split('validation', val_profiles, val_pairs)
    if {p['person_id'] for p in train_profiles} & {p['person_id'] for p in val_profiles}:
        raise ValueError('Split overlap')
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)

    started = time.perf_counter()
    # 1. Selection on the training split only.
    configs = [dict(zip(GRID, values)) for values in itertools.product(*GRID.values())]
    selection = []
    for config in configs:
        per_seed = [cross_validate(train_profiles, train_pairs, config, seed) for seed in seeds]
        mean_curve = [statistics.fmean(values) for values in zip(*(r['mean_curve'] for r in per_seed))]
        best_epoch = max(range(len(mean_curve)), key=lambda i: (round(mean_curve[i], 9), -i)) + 1
        selection.append({'config': config, 'best_epoch': best_epoch, 'cv_mean_ndcg5': mean_curve[best_epoch - 1],
                          'cv_curve': mean_curve})
    chosen = max(selection, key=lambda row: (round(row['cv_mean_ndcg5'], 9), -row['config']['dimension'],
                                             not row['config']['pretrain']))

    # 2. Final fits on all training data with the chosen settings; validation scored once per seed.
    runs = []
    output.mkdir(parents=True)
    selection_seconds = time.perf_counter() - started
    for seed in seeds:
        model, vocabulary, _ = train(train_profiles, train_pairs, chosen['config'], seed, chosen['best_epoch'])
        scores = pool_scores(model, vocabulary, val_profiles)
        result = evaluate(val_profiles, val_pairs, scores)
        # Ranking by each Mentor's mean score alone, ignoring the Mentee: a collapse diagnostic.
        flat = evaluate(val_profiles, val_pairs, np.broadcast_to(scores.mean(axis=0, keepdims=True), scores.shape))
        runs.append({'seed': seed, 'aggregate': result['aggregate'], 'per_query': result['per_query'],
                     'predictions': result['predictions'], 'query_independent_share': query_independent_share(scores),
                     'mentor_mean_only_ndcg5': flat['aggregate']['ndcg5']})
        if seed == seeds[0]:
            torch.save({'state_dict': model.state_dict(), 'vocabulary': vocabulary, 'config': chosen['config'],
                        'epochs': chosen['best_epoch'], 'seed': seed}, output / 'model.pt')
            parameters = sum(p.numel() for p in model.parameters())
            vocabulary_size = len(vocabulary)

    vectoriser = fit_vectoriser(train_profiles)
    tfidf = evaluate(val_profiles, val_pairs, tfidf_scores(val_profiles, vectoriser))
    metrics = ('ndcg5', 'p1', 'p3', 'p5', 'mrr5', 'hit5')
    commit, dirty = git_state()
    summary = {
        'engineering_pilot_only': True, 'human_reviewed': False, 'test_performance_accessed': False,
        'created_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'architecture': 'random EmbeddingBag(mean) over train-fitted word 1-2 grams and char 3-5 grams '
                        '-> directional Linear heads -> L2 normalise; scaled cosine',
        'loss': 'ListNet over each mentee\'s judged pool; optional contrastive warm-up on training text',
        'grid': {key: list(values) for key, values in GRID.items()}, 'seeds': list(seeds), 'folds': FOLDS,
        'epochs_budget': EPOCHS, 'learning_rate': LEARNING_RATE, 'feature_dropout': FEATURE_DROPOUT,
        'pretrain_steps': PRETRAIN_STEPS, 'temperature': TEMPERATURE,
        'selection': [{k: v for k, v in row.items() if k != 'cv_curve'} for row in selection],
        'chosen': {k: v for k, v in chosen.items() if k != 'cv_curve'},
        'parameters': parameters, 'vocabulary_size': vocabulary_size,
        'validation': {
            'scratch_v2': {metric: summarise([r['aggregate'][metric] for r in runs]) for metric in metrics},
            'tfidf': tfidf['aggregate'],
        },
        'collapse_diagnostic': {
            'query_independent_share': summarise([r['query_independent_share'] for r in runs]),
            'mentor_mean_only_ndcg5': summarise([r['mentor_mean_only_ndcg5'] for r in runs]),
        },
        'seconds': {'selection': selection_seconds, 'total': time.perf_counter() - started},
        'validation_queries': len({pair['mentee_id'] for pair in val_pairs}),
        'code_commit': commit, 'working_tree_dirty': dirty, 'implementation_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'data_sha256': {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in
                        ('train_profiles.jsonl', 'train_pairs.jsonl', 'validation_profiles.jsonl', 'validation_pairs.jsonl')},
        'python': platform.python_version(), 'torch': torch.__version__,
        'caveat': '60 unreviewed training pairs and 5 validation queries; no adequacy or real-user suitability claim.',
    }
    (output / 'metrics.json').write_text(json.dumps(summary, indent=2) + '\n')
    (output / 'validation-runs.json').write_text(json.dumps(runs, indent=2) + '\n')
    (output / 'selection-curves.json').write_text(json.dumps(selection, indent=2) + '\n')
    (output / 'implementation.py').write_bytes(Path(__file__).read_bytes())
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('data_dir')
    parser.add_argument('output')
    parser.add_argument('--allow-machine-labels', action='store_true')
    args = parser.parse_args()
    print(json.dumps(run(args.data_dir, args.output, allow_machine_labels=args.allow_machine_labels), indent=2))
