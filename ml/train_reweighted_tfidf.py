"""Learned TF-IDF reweighting encoder (scratch v2b). Training and validation only; never final-test scoring.

Follow-up to train_scratch_v2.py, designed after its negative result (docs/ml-scratch-v2.md). The v2 bag
encoder had to learn 13,000 feature vectors from 60 judged pairs and could not. This model instead starts
from the behaviour of the train-fitted TF-IDF baseline and learns, from the judged pairs, how much each
character n-gram should count, separately for the Mentee (query) side and the Mentor side:

    score(mentee, mentor) = cosine(w_q * tfidf(mentee), w_m * tfidf(mentor))

w_q and w_m start at 1 plus small random noise, so the untrained model ranks almost exactly like TF-IDF.
A penalty pulls them back towards 1, so the model departs from TF-IDF only where the labels support it.
No pretrained weights or external components are used; the TF-IDF statistics are fitted on training
profiles only. Selection uses grouped cross-validation on the training split; validation is scored once.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import itertools
import json
from pathlib import Path
import platform
import random
import statistics
import subprocess
import sys

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

ML_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ML_DIR))
from ranker_features import fit_vectoriser, load_jsonl  # noqa: E402
from train_gbdt_ranker import check_split, grouped_folds, mean_ndcg5, ordered, tfidf_scores  # noqa: E402
from train_scratch_pilot import evaluate, text  # noqa: E402
from train_scratch_v2 import pools, summarise  # noqa: E402

RUNS_ROOT = ML_DIR / 'runs'
FOLDS = 5
SEEDS = (42, 43, 44, 45, 46)
EPOCHS = 40
LEARNING_RATE = 0.05
INIT_NOISE = 0.01
# Pre-declared grid: strength of the pull back towards plain TF-IDF.
GRID = {'anchor': (0.1, 1.0, 10.0)}


class ReweightedTfidf(nn.Module):
    """Per-feature, per-side non-negative weights on TF-IDF vectors; cosine similarity."""

    def __init__(self, features):
        super().__init__()
        self.query_weight = nn.Parameter(1 + INIT_NOISE * torch.randn(features))
        self.mentor_weight = nn.Parameter(1 + INIT_NOISE * torch.randn(features))

    def encode(self, x, query):
        weight = F.relu(self.query_weight if query else self.mentor_weight)
        return F.normalize(x * weight, dim=1)

    def anchor_penalty(self):
        return ((self.query_weight - 1) ** 2).mean() + ((self.mentor_weight - 1) ** 2).mean()


def dense(vectoriser, profiles):
    return torch.tensor(vectoriser.transform([text(p) for p in profiles]).toarray(), dtype=torch.float32)


def train(profiles, pairs, config, seed, epochs, evaluate_on=None):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    vectoriser = fit_vectoriser([p for p in profiles if p['split'] == 'train'])
    model = ReweightedTfidf(len(vectoriser.vocabulary_))
    lookup = {p['person_id']: p for p in profiles}
    grouped = pools(pairs)
    mentees = list(grouped)
    query_x = dense(vectoriser, [lookup[m] for m in mentees])
    mentor_x = {m: dense(vectoriser, [lookup[pair['mentor_id']] for pair in grouped[m]]) for m in mentees}
    grades = {m: torch.tensor([float(pair['relevance_score']) for pair in grouped[m]]) for m in mentees}
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    curve = []
    for _ in range(epochs):
        model.train()
        queries = model.encode(query_x, True)
        losses = []
        for index, mentee in enumerate(mentees):
            logits = (queries[index:index + 1] @ model.encode(mentor_x[mentee], False).T).squeeze(0) * 10
            losses.append(-(F.softmax(grades[mentee], dim=0) * F.log_softmax(logits, dim=0)).sum())
        loss = torch.stack(losses).mean() + config['anchor'] * model.anchor_penalty()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        if evaluate_on is not None:
            held_profiles, held_pairs = evaluate_on
            curve.append(mean_ndcg5(held_pairs, pair_scores(model, vectoriser, held_profiles, held_pairs)))
    return model, vectoriser, curve


@torch.no_grad()
def pair_scores(model, vectoriser, profiles, pairs):
    lookup = {p['person_id']: p for p in profiles}
    q = model.encode(dense(vectoriser, [lookup[pair['mentee_id']] for pair in pairs]), True)
    m = model.encode(dense(vectoriser, [lookup[pair['mentor_id']] for pair in pairs]), False)
    return (q * m).sum(1).tolist()


@torch.no_grad()
def pool_scores(model, vectoriser, profiles):
    mentees = sorted((p for p in profiles if p['role'] == 'mentee'), key=lambda p: p['person_id'])
    mentors = sorted((p for p in profiles if p['role'] == 'mentor'), key=lambda p: p['person_id'])
    return (model.encode(dense(vectoriser, mentees), True) @ model.encode(dense(vectoriser, mentors), False).T).numpy()


def cross_validate(profiles, pairs, config, seed):
    lookup = {p['person_id']: p for p in profiles}
    curves, untrained = [], []
    for held_out in grouped_folds([pair['mentee_id'] for pair in pairs], FOLDS, seed):
        held = set(held_out)
        fit_pairs = [pair for pair in pairs if pair['mentee_id'] not in held]
        held_pairs = [pair for pair in pairs if pair['mentee_id'] in held]
        fit_profiles = [lookup[i] for i in sorted({pair[k] for pair in fit_pairs for k in ('mentee_id', 'mentor_id')})]
        held_profiles = [lookup[i] for i in sorted({pair[k] for pair in held_pairs for k in ('mentee_id', 'mentor_id')})]
        model, vectoriser, curve = train(fit_profiles, fit_pairs, config, seed, EPOCHS, (held_profiles, held_pairs))
        curves.append(curve)
        baseline_vectoriser = fit_vectoriser(fit_profiles)
        lookup_held = {p['person_id']: p for p in held_profiles}
        q = baseline_vectoriser.transform([text(lookup_held[pair['mentee_id']]) for pair in held_pairs])
        m = baseline_vectoriser.transform([text(lookup_held[pair['mentor_id']]) for pair in held_pairs])
        untrained.append(mean_ndcg5(held_pairs, np.asarray(q.multiply(m).sum(1)).ravel().tolist()))
    mean_curve = [statistics.fmean(values) for values in zip(*curves)]
    return mean_curve, statistics.fmean(untrained)


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

    selection = []
    for values in itertools.product(*GRID.values()):
        config = dict(zip(GRID, values))
        results = [cross_validate(train_profiles, train_pairs, config, seed) for seed in seeds]
        mean_curve = [statistics.fmean(v) for v in zip(*(r[0] for r in results))]
        best_epoch = max(range(len(mean_curve)), key=lambda i: (round(mean_curve[i], 9), -i)) + 1
        selection.append({'config': config, 'best_epoch': best_epoch, 'cv_mean_ndcg5': mean_curve[best_epoch - 1],
                          'cv_tfidf_ndcg5': statistics.fmean(r[1] for r in results), 'cv_curve': mean_curve})
    chosen = max(selection, key=lambda row: (round(row['cv_mean_ndcg5'], 9), row['config']['anchor']))

    output.mkdir(parents=True)
    runs = []
    for seed in seeds:
        model, vectoriser, _ = train(train_profiles, train_pairs, chosen['config'], seed, chosen['best_epoch'])
        result = evaluate(val_profiles, val_pairs, pool_scores(model, vectoriser, val_profiles))
        runs.append({'seed': seed, 'aggregate': result['aggregate'], 'per_query': result['per_query']})
        if seed == seeds[0]:
            torch.save({'state_dict': model.state_dict(), 'config': chosen['config'], 'epochs': chosen['best_epoch'],
                        'seed': seed}, output / 'model.pt')
            changed = float(((model.query_weight - 1).abs() > 0.05).float().mean())
            features = len(vectoriser.vocabulary_)
    tfidf = evaluate(val_profiles, val_pairs, tfidf_scores(val_profiles, fit_vectoriser(train_profiles)))
    metrics = ('ndcg5', 'p1', 'p3', 'p5', 'mrr5', 'hit5')
    try:
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True, cwd=ML_DIR).strip()
    except (subprocess.SubprocessError, OSError):
        commit = 'unknown'
    summary = {
        'engineering_pilot_only': True, 'human_reviewed': False, 'test_performance_accessed': False,
        'created_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'architecture': 'train-fitted char 3-5 gram TF-IDF -> learned non-negative per-feature weights per side -> cosine',
        'initialisation': f'weights 1 + N(0, {INIT_NOISE}); no pretrained components',
        'loss': 'ListNet over each mentee\'s judged pool + anchor * mean squared distance of weights from 1',
        'grid': {k: list(v) for k, v in GRID.items()}, 'seeds': list(seeds), 'folds': FOLDS, 'epochs_budget': EPOCHS,
        'learning_rate': LEARNING_RATE,
        'selection': [{k: v for k, v in row.items() if k != 'cv_curve'} for row in selection],
        'chosen': {k: v for k, v in chosen.items() if k != 'cv_curve'},
        'parameters': 2 * features, 'share_of_query_weights_moved_over_0_05': changed,
        'validation': {'reweighted_tfidf': {m: summarise([r['aggregate'][m] for r in runs]) for m in metrics},
                       'tfidf': tfidf['aggregate']},
        'validation_queries': len({p['mentee_id'] for p in val_pairs}),
        'code_commit': commit, 'implementation_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'python': platform.python_version(), 'torch': torch.__version__,
        'caveat': '60 unreviewed training pairs and 5 validation queries; designed after seeing the v2 result.',
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
