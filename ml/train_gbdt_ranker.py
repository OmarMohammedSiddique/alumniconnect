"""LightGBM LambdaMART ranker pilot (#98). Training/validation only; never test scoring.

Hyperparameters are chosen by cross-validation on the training split alone, with
folds grouped by mentee. The validation pools are scored once, after the final
fit, and never influence the model or its settings.
"""
import argparse
import hashlib
from itertools import product
import json
from pathlib import Path
import platform
import random
import subprocess

import lightgbm
import numpy as np
import sklearn

from ranker_features import FEATURE_NAMES, build_features, fit_vectoriser, load_jsonl
from train_scratch_pilot import evaluate, ranking_metrics

RUNS_ROOT = Path(__file__).resolve().parent / 'runs'
DATA_FILES = ('train_profiles.jsonl', 'train_pairs.jsonl', 'validation_profiles.jsonl', 'validation_pairs.jsonl')
FOLDS = 5
# Ordered so that simpler models come first: ties in the cross-validation score
# go to the earliest entry.
GRID = {
    'num_leaves': (4, 8),
    'min_child_samples': (5, 3),
    'n_estimators': (20, 50),
    'learning_rate': (0.05, 0.1),
}


def grid_candidates():
    return [dict(zip(GRID, values, strict=True)) for values in product(*GRID.values())]


def check_split(split, profiles, pairs):
    """Same structural checks as the from-scratch pilot applies before training."""
    lookup = {profile['person_id']: profile for profile in profiles}
    if len(lookup) != len(profiles) or not pairs:
        raise ValueError('Invalid/empty pool')
    seen = set()
    for pair in pairs:
        if type(pair['relevance_score']) is not int or pair['relevance_score'] not in range(4):
            raise ValueError('Invalid grade')
        if pair['split'] != split:
            raise ValueError('Pair split mismatch')
        for key, role in (('mentee_id', 'mentee'), ('mentor_id', 'mentor')):
            if lookup[pair[key]]['role'] != role or lookup[pair[key]]['split'] != split:
                raise ValueError('Invalid reference')
        if (pair['mentee_id'], pair['mentor_id']) in seen:
            raise ValueError('Duplicate pair')
        seen.add((pair['mentee_id'], pair['mentor_id']))


def ordered(pairs):
    """Pairs sorted so that each mentee's candidates are contiguous, as LightGBM needs."""
    return sorted(pairs, key=lambda pair: (pair['mentee_id'], pair['mentor_id']))


def group_sizes(pairs):
    """Candidates per mentee, in row order; refuses pairs that are not contiguous."""
    sizes, previous = {}, None
    for pair in pairs:
        if pair['mentee_id'] != previous and pair['mentee_id'] in sizes:
            raise ValueError('Pairs must be ordered so that each mentee is contiguous')
        previous = pair['mentee_id']
        sizes[previous] = sizes.get(previous, 0) + 1
    return list(sizes.values())


def grouped_folds(mentee_ids, folds, seed):
    """Split mentees into held-out folds, so no mentee is in both sides of a fold."""
    mentees = sorted(set(mentee_ids))
    if len(mentees) < folds:
        raise ValueError('Fewer mentees than cross-validation folds')
    random.Random(seed).shuffle(mentees)
    return [sorted(mentees[index::folds]) for index in range(folds)]


def fit_ranker(features, pairs, params, seed):
    """Fit LambdaMART on pairs that are already ordered by mentee."""
    model = lightgbm.LGBMRanker(objective='lambdarank', random_state=seed, n_jobs=1, deterministic=True,
                                force_col_wise=True, verbose=-1, **params)
    model.fit(features, [pair['relevance_score'] for pair in pairs], group=group_sizes(pairs))
    return model


def mean_ndcg5(pairs, scores):
    """Mean nDCG@5 over the mentees in `pairs`, ranked as `evaluate` ranks them."""
    labels, scored = {}, {}
    for pair, score in zip(pairs, scores, strict=True):
        labels.setdefault(pair['mentee_id'], {})[pair['mentor_id']] = pair['relevance_score']
        scored.setdefault(pair['mentee_id'], {})[pair['mentor_id']] = float(score)
    rankings = {mentee: sorted(candidates, key=lambda mentor: (-candidates[mentor], mentor))
                for mentee, candidates in scored.items()}
    return ranking_metrics(rankings, labels)['aggregate']['ndcg5']


def cross_validate(features, pairs, seed, folds=FOLDS):
    """Score every grid entry on held-out mentees from the training split only."""
    held_out_folds = grouped_folds([pair['mentee_id'] for pair in pairs], folds, seed)
    results = []
    for params in grid_candidates():
        fold_scores = []
        for held_out in held_out_folds:
            inside = [index for index, pair in enumerate(pairs) if pair['mentee_id'] not in held_out]
            outside = [index for index, pair in enumerate(pairs) if pair['mentee_id'] in held_out]
            model = fit_ranker(features[inside], [pairs[index] for index in inside], params, seed)
            fold_scores.append(mean_ndcg5([pairs[index] for index in outside], model.predict(features[outside])))
        results.append({'params': params, 'fold_ndcg5': fold_scores, 'mean_ndcg5': sum(fold_scores) / len(fold_scores)})
    best = results[0]
    for result in results[1:]:
        if result['mean_ndcg5'] > best['mean_ndcg5']:
            best = result
    return best, results, held_out_folds


def score_pools(model, profiles, vectoriser):
    """Score every mentee and mentor combination; labels are not read here."""
    mentees = sorted(profile['person_id'] for profile in profiles if profile['role'] == 'mentee')
    mentors = sorted(profile['person_id'] for profile in profiles if profile['role'] == 'mentor')
    grid = [{'mentee_id': mentee, 'mentor_id': mentor} for mentee in mentees for mentor in mentors]
    return model.predict(build_features(profiles, grid, vectoriser)).reshape(len(mentees), len(mentors))


def run(data_dir, output_dir, seed=42, runs_root=RUNS_ROOT):
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
    if {profile['person_id'] for profile in train_profiles} & {profile['person_id'] for profile in val_profiles}:
        raise ValueError('Split overlap')

    vectoriser = fit_vectoriser(train_profiles)
    train_features = build_features(train_profiles, train_pairs, vectoriser)
    best, cv_results, held_out_folds = cross_validate(train_features, train_pairs, seed)
    model = fit_ranker(train_features, train_pairs, best['params'], seed)

    # The validation split is used from here on only, for the final comparison.
    validation = evaluate(val_profiles, val_pairs, score_pools(model, val_profiles, vectoriser))
    booster = model.booster_
    gain = booster.feature_importance(importance_type='gain')
    splits = booster.feature_importance(importance_type='split')
    importance = {'importance_type': 'gain', 'model': 'gbdt_ranker', 'features': sorted(
        ({'feature': name, 'gain': float(gain[index]), 'splits': int(splits[index])}
         for index, name in enumerate(FEATURE_NAMES)), key=lambda row: (-row['gain'], row['feature']))}
    metrics = {
        'engineering_pilot_only': True, 'human_reviewed': False, 'test_performance_accessed': False,
        'validation_queries': len({pair['mentee_id'] for pair in val_pairs}), 'validation_pairs': len(val_pairs),
        'cross_validation': {'metric': 'ndcg5', 'mean_ndcg5': best['mean_ndcg5'], 'fold_ndcg5': best['fold_ndcg5']},
        'validation': {'gbdt_ranker': {'aggregate': validation['aggregate'], 'per_query': validation['per_query']}},
        'gbdt_ranker_predictions': validation['predictions'],
    }
    try:
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True, cwd=Path(__file__).parent).strip()
    except (subprocess.SubprocessError, OSError):
        commit = 'unknown'
    here = Path(__file__).resolve().parent
    config = {
        'issue': 98, 'model': 'lightgbm.' + type(model).__name__, 'objective': model.get_params()['objective'], 'seed': seed,
        'fixed_params': {'n_jobs': 1, 'deterministic': True, 'force_col_wise': True},
        'feature_names': list(FEATURE_NAMES),
        'vectoriser': {'analyzer': 'char', 'ngram_range': [3, 5], 'lowercase': True, 'fitted_on': 'train profiles'},
        'grid': {name: list(values) for name, values in GRID.items()},
        'cross_validation': {'design': 'folds grouped by mentee, training split only', 'folds': FOLDS,
                             'selection': 'highest mean nDCG@5 over folds; ties go to the earlier grid entry',
                             'held_out_mentees': held_out_folds, 'results': cv_results},
        'chosen_params': best['params'],
        'train_queries': len({pair['mentee_id'] for pair in train_pairs}), 'train_pairs': len(train_pairs),
        'data_sha256': {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in DATA_FILES},
        'implementation_sha256': {name: hashlib.sha256((here / name).read_bytes()).hexdigest()
                                  for name in ('train_gbdt_ranker.py', 'ranker_features.py', 'train_scratch_pilot.py')},
        'code_commit': commit, 'python': platform.python_version(), 'lightgbm': lightgbm.__version__,
        'scikit_learn': sklearn.__version__, 'numpy': np.__version__,
        'caveat': 'Unreviewed machine labels and very few validation queries; an engineering pilot, not research evidence.',
    }
    output.mkdir(parents=True)
    for name, value in (('metrics.json', metrics), ('feature_importance.json', importance), ('config.json', config)):
        (output / name).write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    return {'output_dir': str(output), 'chosen_params': best['params'],
            'cross_validation_ndcg5': best['mean_ndcg5'], 'validation': validation['aggregate']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('data_dir')
    parser.add_argument('output_dir')
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(run(args.data_dir, args.output_dir, args.seed), indent=2))
