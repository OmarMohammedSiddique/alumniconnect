"""Training script checks for the GBDT ranker pilot, using invented profiles only."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR))
import train_gbdt_ranker
from train_gbdt_ranker import (FOLDS, GRID, RANDOM_BASELINE_SEEDS, cross_validate, fit_ranker, grid_candidates,
                               group_sizes, grouped_folds, matches_recorded, mean_ndcg5, ordered, random_baseline, run,
                               tfidf_scores)

TOPICS = [
    ('Pricing', 'Insurance', 'actuarial pricing models and reserving'),
    ('Logistics', 'Pharmaceuticals', 'cold chain depots and carrier audits'),
    ('Python', 'Software', 'backend services and data pipelines'),
    ('Welding', 'Manufacturing', 'fabrication lines and weld inspection'),
    ('Nursing', 'Healthcare', 'ward rotas and patient handover'),
    ('Baking', 'Hospitality', 'sourdough production and pastry kitchens'),
]


def person(person_id, role, split, topic):
    skill, industry, phrase = TOPICS[topic % len(TOPICS)]
    return {'person_id': person_id, 'role': role, 'split': split, 'headline': skill + ' ' + role,
            'bio': 'Experience with ' + phrase + '.', 'skills': [skill], 'industry': industry}


def fixture(split, mentees, candidates):
    """Each mentee gets one on-topic mentor (grade 3) and off-topic ones (grades 1, 0, 0...)."""
    prefix = split[:2].upper()
    profiles, pairs = [], []
    for mentee in range(mentees):
        mentee_id = f'{prefix}-MTE-{mentee:02d}'
        profiles.append(person(mentee_id, 'mentee', split, mentee))
        for candidate in range(candidates):
            mentor_id = f'{prefix}-MTR-{mentee:02d}-{candidate}'
            profiles.append(person(mentor_id, 'mentor', split, mentee + candidate))
            pairs.append({'pair_id': f'{mentee_id}:{mentor_id}', 'mentee_id': mentee_id, 'mentor_id': mentor_id,
                          'split': split, 'relevance_score': (3, 1, 0, 0)[min(candidate, 3)],
                          'rationale': 'Invented.'})
    return profiles, pairs


def write_jsonl(path, rows):
    path.write_text(''.join(json.dumps(row) + '\n' for row in rows), encoding='utf-8')


def write_data(directory, validation_pairs=None):
    directory.mkdir()
    train_profiles, train_pairs = fixture('train', 10, 3)
    val_profiles, val_pairs = fixture('validation', 3, 1)
    # Validation is a complete pool: every mentee is judged against every mentor.
    mentors = [profile for profile in val_profiles if profile['role'] == 'mentor']
    val_pairs = [{'mentee_id': f'VA-MTE-{mentee:02d}', 'mentor_id': mentor['person_id'], 'split': 'validation',
                  'relevance_score': 3 if index == mentee else 0}
                 for mentee in range(3) for index, mentor in enumerate(mentors)]
    write_jsonl(directory / 'train_profiles.jsonl', train_profiles)
    write_jsonl(directory / 'train_pairs.jsonl', train_pairs)
    write_jsonl(directory / 'validation_profiles.jsonl', val_profiles)
    write_jsonl(directory / 'validation_pairs.jsonl', validation_pairs or val_pairs)
    return val_pairs


def group_sizes_or_none(pairs):
    try:
        return group_sizes(pairs)
    except ValueError:
        return None


def read_outputs(output):
    return {name: json.loads((output / name).read_text(encoding='utf-8'))
            for name in ('metrics.json', 'feature_importance.json', 'config.json')}


class TemporaryRunCase(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name).resolve()
        self.data = self.root / 'data'
        self.runs = self.root / 'runs'
        self.validation_pairs = write_data(self.data)


class RunTests(TemporaryRunCase):
    def test_run_writes_the_three_files_into_a_new_directory(self):
        output = self.runs / 'first'
        summary = run(self.data, output, runs_root=self.runs)
        self.assertEqual(sorted(path.name for path in output.iterdir()),
                         ['config.json', 'feature_importance.json', 'metrics.json'])
        outputs = read_outputs(output)
        config, metrics, importance = outputs['config.json'], outputs['metrics.json'], outputs['feature_importance.json']
        self.assertEqual(config['objective'], 'lambdarank')
        self.assertEqual(config['seed'], 42)
        self.assertEqual(config['lightgbm'], '4.7.0')
        self.assertIn(config['chosen_params'], grid_candidates())
        self.assertEqual(config['chosen_params'], summary['chosen_params'])
        self.assertEqual(len(config['cross_validation']['results']), len(grid_candidates()))
        self.assertEqual((config['train_queries'], config['train_pairs']), (10, 30))
        self.assertEqual(sorted(config['data_sha256']), sorted(train_gbdt_ranker.DATA_FILES))
        self.assertFalse(metrics['test_performance_accessed'])
        self.assertFalse(metrics['human_reviewed'])
        self.assertEqual((metrics['validation_queries'], metrics['validation_pairs']), (3, 9))
        aggregate = metrics['validation']['gbdt_ranker']['aggregate']
        self.assertEqual(aggregate, summary['validation'])
        for key in ('ndcg5', 'p1', 'mrr5'):
            self.assertGreaterEqual(aggregate[key], 0.0)
            self.assertLessEqual(aggregate[key], 1.0)
        self.assertEqual(len(metrics['gbdt_ranker_predictions']), 9)
        self.assertEqual([row['feature'] for row in sorted(importance['features'], key=lambda row: row['feature'])],
                         sorted(train_gbdt_ranker.FEATURE_NAMES))
        gains = [row['gain'] for row in importance['features']]
        self.assertEqual(gains, sorted(gains, reverse=True))
        self.assertGreater(sum(gains), 0.0)

    def test_the_trained_ranker_learns_the_planted_signal(self):
        # On-topic mentors are grade 3 in training, so the on-topic validation mentor must rank first.
        run(self.data, self.runs / 'signal', runs_root=self.runs)
        aggregate = read_outputs(self.runs / 'signal')['metrics.json']['validation']['gbdt_ranker']['aggregate']
        self.assertEqual(aggregate['p1'], 1.0)
        self.assertEqual(aggregate['ndcg5'], 1.0)

    def test_chosen_configuration_has_the_best_cross_validation_score(self):
        run(self.data, self.runs / 'cv', runs_root=self.runs)
        outputs = read_outputs(self.runs / 'cv')
        results = outputs['config.json']['cross_validation']['results']
        best = max(result['mean_ndcg5'] for result in results)
        first_best = next(result for result in results if result['mean_ndcg5'] == best)
        self.assertEqual(outputs['config.json']['chosen_params'], first_best['params'])
        self.assertEqual(outputs['metrics.json']['cross_validation']['mean_ndcg5'], best)
        for result in results:
            self.assertEqual(len(result['fold_ndcg5']), FOLDS)
            self.assertAlmostEqual(result['mean_ndcg5'], sum(result['fold_ndcg5']) / FOLDS)

    def test_two_runs_with_the_same_seed_write_identical_files(self):
        run(self.data, self.runs / 'a', runs_root=self.runs)
        run(self.data, self.runs / 'b', runs_root=self.runs)
        for name in ('metrics.json', 'feature_importance.json', 'config.json'):
            self.assertEqual((self.runs / 'a' / name).read_bytes(), (self.runs / 'b' / name).read_bytes(), name)

    def test_validation_labels_never_influence_the_model_or_its_settings(self):
        run(self.data, self.runs / 'original', runs_root=self.runs)
        flipped_data = self.root / 'flipped'
        flipped = [{**pair, 'relevance_score': 3 - pair['relevance_score']} for pair in self.validation_pairs]
        write_data(flipped_data, validation_pairs=flipped)
        run(flipped_data, self.runs / 'flipped', runs_root=self.runs)
        original, changed = read_outputs(self.runs / 'original'), read_outputs(self.runs / 'flipped')
        self.assertEqual(original['feature_importance.json'], changed['feature_importance.json'])
        for key in ('chosen_params', 'cross_validation', 'grid', 'seed'):
            self.assertEqual(original['config.json'][key], changed['config.json'][key], key)
        scores = lambda outputs: [(row['query_id'], row['mentor_id'], row['score'])
                                  for row in outputs['metrics.json']['gbdt_ranker_predictions']]
        self.assertEqual(sorted(scores(original)), sorted(scores(changed)))
        self.assertNotEqual(original['metrics.json']['validation'], changed['metrics.json']['validation'])

    def test_row_order_of_the_training_pairs_file_does_not_change_the_result(self):
        run(self.data, self.runs / 'sorted', runs_root=self.runs)
        shuffled_data = self.root / 'shuffled'
        write_data(shuffled_data)
        pairs = [json.loads(line) for line in
                 (shuffled_data / 'train_pairs.jsonl').read_text(encoding='utf-8').splitlines()]
        # Stride 7 is coprime with 30, so every mentee's candidates are interleaved with others.
        interleaved = [pairs[(index * 7) % len(pairs)] for index in range(len(pairs))]
        self.assertNotEqual(group_sizes_or_none(interleaved), [3] * 10)
        write_jsonl(shuffled_data / 'train_pairs.jsonl', interleaved)
        run(shuffled_data, self.runs / 'shuffled', runs_root=self.runs)
        expected, actual = read_outputs(self.runs / 'sorted'), read_outputs(self.runs / 'shuffled')
        self.assertEqual(expected['feature_importance.json'], actual['feature_importance.json'])
        self.assertEqual(expected['metrics.json'], actual['metrics.json'])
        for key in ('chosen_params', 'cross_validation'):
            self.assertEqual(expected['config.json'][key], actual['config.json'][key], key)

    def test_final_fit_uses_every_training_pair_and_the_chosen_parameters(self):
        from unittest import mock
        calls = []
        real_fit = train_gbdt_ranker.fit_ranker

        def recording_fit(features, pairs, params, seed):
            calls.append({'rows': features.shape[0], 'pairs': [(pair['mentee_id'], pair['mentor_id']) for pair in pairs],
                          'params': dict(params), 'seed': seed})
            return real_fit(features, pairs, params, seed)

        with mock.patch.object(train_gbdt_ranker, 'fit_ranker', recording_fit):
            run(self.data, self.runs / 'final', seed=7, runs_root=self.runs)
        config = read_outputs(self.runs / 'final')['config.json']
        # Every cross-validation fit comes first; the single final fit is last.
        self.assertEqual(len(calls), len(grid_candidates()) * FOLDS + 1)
        for call in calls[:-1]:
            self.assertEqual(call['rows'], 24)
        _, train_pairs = fixture('train', 10, 3)
        final = calls[-1]
        self.assertEqual(final['rows'], 30)
        self.assertEqual(final['pairs'], sorted((pair['mentee_id'], pair['mentor_id']) for pair in train_pairs))
        self.assertEqual(final['params'], config['chosen_params'])
        self.assertEqual({call['seed'] for call in calls}, {7})
        self.assertEqual(config['seed'], 7)

    def test_run_refuses_to_overwrite_an_existing_directory(self):
        output = self.runs / 'taken'
        output.mkdir(parents=True)
        (output / 'keep.txt').write_text('keep', encoding='utf-8')
        with self.assertRaises(FileExistsError):
            run(self.data, output, runs_root=self.runs)
        self.assertEqual([path.name for path in output.iterdir()], ['keep.txt'])

    def test_run_refuses_an_output_directory_outside_the_runs_root(self):
        for output in (self.root / 'elsewhere', self.runs, self.runs / '..' / 'escaped'):
            with self.subTest(output=str(output)), self.assertRaises(ValueError):
                run(self.data, output, runs_root=self.runs)
            self.assertFalse((self.root / 'elsewhere').exists())
            self.assertFalse((self.root / 'escaped').exists())

    def test_default_runs_root_is_ml_runs(self):
        self.assertEqual(train_gbdt_ranker.RUNS_ROOT, ML_DIR / 'runs')
        with self.assertRaises(ValueError):
            run(self.data, self.root / 'not-under-ml-runs')

    def test_invalid_training_data_is_rejected_before_anything_is_written(self):
        pairs = [json.loads(line) for line in (self.data / 'train_pairs.jsonl').read_text(encoding='utf-8').splitlines()]
        for label, damaged in (('grade', {**pairs[0], 'relevance_score': 4}),
                               ('split', {**pairs[0], 'split': 'validation'}),
                               ('duplicate', pairs[1])):
            write_jsonl(self.data / 'train_pairs.jsonl', [damaged, *pairs[1:]])
            with self.subTest(label=label), self.assertRaises(ValueError):
                run(self.data, self.runs / label, runs_root=self.runs)
            self.assertFalse((self.runs / label).exists())


AUDIT_SCRIPT = """
import json, os, sys
sys.path.insert(0, sys.argv[1])
import train_gbdt_ranker
data = os.path.realpath(sys.argv[2])
opened = set()
def hook(event, args):
    if event == 'open' and isinstance(args[0], (str, bytes, os.PathLike)):
        path = os.path.realpath(os.fsdecode(args[0]))
        if os.path.dirname(path) == data:
            opened.add(os.path.basename(path))
sys.addaudithook(hook)
train_gbdt_ranker.run(sys.argv[2], sys.argv[3], runs_root=sys.argv[4])
print(json.dumps(sorted(opened)))
"""


class BaselineTests(TemporaryRunCase):
    def load(self, name):
        return [json.loads(line) for line in (self.data / name).read_text(encoding='utf-8').splitlines()]

    def validation(self):
        return self.load('validation_profiles.jsonl'), self.load('validation_pairs.jsonl')

    def test_run_reports_random_and_tfidf_next_to_the_ranker_on_the_same_pools(self):
        summary = run(self.data, self.runs / 'baselines', runs_root=self.runs)
        outputs = read_outputs(self.runs / 'baselines')
        metrics, validation = outputs['metrics.json'], outputs['metrics.json']['validation']
        self.assertEqual(sorted(validation), ['gbdt_ranker', 'random', 'tfidf'])
        pools = lambda rows: sorted((row['query_id'], row['mentor_id'], row['grade']) for row in rows)
        self.assertEqual(pools(metrics['tfidf_predictions']), pools(metrics['gbdt_ranker_predictions']))
        self.assertEqual(len(metrics['tfidf_predictions']), 9)
        self.assertEqual([row['query_id'] for row in validation['tfidf']['per_query']],
                         [row['query_id'] for row in validation['gbdt_ranker']['per_query']])
        self.assertEqual(validation['random']['seeds'], list(range(100)))
        self.assertEqual(outputs['config.json']['baselines']['random_seeds'], list(range(100)))
        self.assertEqual(summary['baselines'], {'tfidf': validation['tfidf']['aggregate'],
                                                'random_mean_of_100_seeds': validation['random']['aggregate']})
        # The written figures are the ones the two baseline functions produce for these pools.
        profiles, pairs = self.validation()
        vectoriser = train_gbdt_ranker.fit_vectoriser(self.load('train_profiles.jsonl'))
        expected = train_gbdt_ranker.evaluate(profiles, pairs, tfidf_scores(profiles, vectoriser))
        self.assertEqual(validation['tfidf']['aggregate'], expected['aggregate'])
        self.assertEqual(metrics['tfidf_predictions'], expected['predictions'])
        self.assertEqual(validation['random'], random_baseline(profiles, pairs))

    def test_tfidf_baseline_is_the_from_scratch_pilot_computation_fitted_on_training_text(self):
        from sklearn.feature_extraction.text import TfidfVectorizer
        from train_scratch_pilot import evaluate, text
        run(self.data, self.runs / 'tfidf', runs_root=self.runs)
        profiles, pairs = self.validation()
        # Restated from train_scratch_pilot.run, which cannot be called without also training the neural model.
        vectoriser = TfidfVectorizer(analyzer='char', ngram_range=(3, 5), lowercase=True)
        vectoriser.fit([text(profile) for profile in self.load('train_profiles.jsonl')])
        by_id = lambda role: sorted((p for p in profiles if p['role'] == role), key=lambda p: p['person_id'])
        scores = (vectoriser.transform([text(p) for p in by_id('mentee')])
                  @ vectoriser.transform([text(p) for p in by_id('mentor')]).T).toarray()
        expected = evaluate(profiles, pairs, scores)
        metrics = read_outputs(self.runs / 'tfidf')['metrics.json']
        self.assertEqual(metrics['validation']['tfidf']['aggregate'], expected['aggregate'])
        self.assertEqual(metrics['validation']['tfidf']['per_query'], expected['per_query'])
        self.assertEqual(metrics['tfidf_predictions'], expected['predictions'])
        # The on-topic mentor shares the mentee's wording, so the lexical baseline ranks it first.
        self.assertEqual(expected['aggregate']['ndcg5'], 1.0)

    def test_tfidf_scores_ignore_forbidden_fields_and_validation_vocabulary(self):
        profiles, _ = self.validation()
        vectoriser = train_gbdt_ranker.fit_vectoriser(self.load('train_profiles.jsonl'))
        vocabulary = dict(vectoriser.vocabulary_)
        before = tfidf_scores(profiles, vectoriser)
        noisy = [{**profile, 'rationale': 'zzqx actuarial pricing', 'relevance_score': 3, 'notes': 'Insurance'}
                 for profile in reversed(profiles)]
        self.assertEqual(tfidf_scores(noisy, vectoriser).tolist(), before.tolist())
        self.assertEqual(vectoriser.vocabulary_, vocabulary)
        self.assertEqual(before.shape, (3, 3))

    def test_random_baseline_is_the_mean_over_one_hundred_fixed_seeds(self):
        import numpy as np
        profiles, pairs = self.validation()
        self.assertEqual(RANDOM_BASELINE_SEEDS, tuple(range(100)))
        result = random_baseline(profiles, pairs)
        self.assertEqual(result, random_baseline(profiles, pairs))
        self.assertEqual(result['seeds'], list(range(100)))
        per_seed = [train_gbdt_ranker.evaluate(profiles, pairs, np.random.default_rng(seed).random((3, 3)))['aggregate']
                    for seed in range(100)]
        for key in ('ndcg5', 'p1', 'p3', 'p5', 'mrr5', 'hit5'):
            self.assertAlmostEqual(result['aggregate'][key], sum(row[key] for row in per_seed) / 100, places=12)
            self.assertAlmostEqual(result['std_over_seeds'][key], float(np.std([row[key] for row in per_seed])), places=12)
        # One relevant mentor in a pool of three: a random ranking puts it first a third of the time.
        self.assertGreater(result['aggregate']['p1'], 0.2)
        self.assertLess(result['aggregate']['p1'], 0.47)
        self.assertLess(result['aggregate']['ndcg5'], 1.0)
        self.assertNotEqual(result['aggregate'], random_baseline(profiles, pairs, seeds=(0,))['aggregate'])

    def test_random_baseline_scores_do_not_depend_on_the_labels(self):
        profiles, pairs = self.validation()
        seen = []
        original = train_gbdt_ranker.evaluate
        self.addCleanup(setattr, train_gbdt_ranker, 'evaluate', original)

        def recording(profiles, pairs, scores):
            seen.append(scores.tolist())
            return original(profiles, pairs, scores)

        train_gbdt_ranker.evaluate = recording
        random_baseline(profiles, pairs)
        first, seen[:] = list(seen), []
        random_baseline(profiles, [{**pair, 'relevance_score': 3 - pair['relevance_score']} for pair in pairs])
        self.assertEqual(first, seen)
        self.assertEqual(len(first), 100)
        self.assertEqual(len({json.dumps(scores) for scores in first}), 100)

    def test_tfidf_figures_are_not_the_rankers_when_the_two_disagree(self):
        # The ranker is replaced by one that ranks in the opposite order to TF-IDF, so the two must differ.
        original = train_gbdt_ranker.score_pools
        self.addCleanup(setattr, train_gbdt_ranker, 'score_pools', original)
        train_gbdt_ranker.score_pools = lambda model, profiles, vectoriser: -tfidf_scores(profiles, vectoriser)
        summary = run(self.data, self.runs / 'disagree', runs_root=self.runs)
        metrics = read_outputs(self.runs / 'disagree')['metrics.json']
        tfidf, ranker = metrics['validation']['tfidf'], metrics['validation']['gbdt_ranker']
        self.assertEqual(tfidf['aggregate']['ndcg5'], 1.0)
        self.assertTrue(all(row['ndcg5'] == 1.0 for row in tfidf['per_query']))
        self.assertLess(ranker['aggregate']['ndcg5'], 1.0)
        self.assertTrue(all(row['ndcg5'] < 1.0 for row in ranker['per_query']))
        self.assertEqual(summary['baselines']['tfidf'], tfidf['aggregate'])
        self.assertEqual(summary['validation'], ranker['aggregate'])
        first = lambda rows: {row['query_id']: row['mentor_id'] for row in rows if row['rank'] == 1}
        self.assertTrue(all(first(metrics['tfidf_predictions'])[query] != mentor
                            for query, mentor in first(metrics['gbdt_ranker_predictions']).items()))

    def test_matches_recorded_rounds_to_exactly_six_decimals(self):
        self.assertTrue(matches_recorded(0.8539321651209489))
        self.assertTrue(matches_recorded(0.8539324))
        self.assertTrue(matches_recorded(0.8539316))
        self.assertFalse(matches_recorded(0.8539326))
        self.assertFalse(matches_recorded(0.8539314))
        self.assertFalse(matches_recorded(0.8541))
        self.assertFalse(matches_recorded(1.0, 0.999999))
        self.assertFalse(matches_recorded(1.0, 1.000001))
        self.assertTrue(matches_recorded(1.0, 1.0))

    def test_recorded_tfidf_check_compares_to_six_decimals(self):
        self.assertEqual(train_gbdt_ranker.RECORDED_TFIDF_NDCG5, 0.853932)
        self.addCleanup(setattr, train_gbdt_ranker, 'RECORDED_TFIDF_NDCG5', train_gbdt_ranker.RECORDED_TFIDF_NDCG5)
        for near_miss in (0.999999, 1.000001):
            train_gbdt_ranker.RECORDED_TFIDF_NDCG5 = near_miss
            summary = run(self.data, self.runs / f'near-{near_miss}', runs_root=self.runs)
            self.assertIs(summary['tfidf_ndcg5_matches_recorded'], False)
        train_gbdt_ranker.RECORDED_TFIDF_NDCG5 = 0.853932
        run(self.data, self.runs / 'recorded', runs_root=self.runs)
        check = read_outputs(self.runs / 'recorded')['metrics.json']['recorded_tfidf_check']
        self.assertEqual(check['recorded_ndcg5'], 0.853932)
        # The invented fixture scores 1.0, so it must not be reported as matching the recorded pilot figure.
        self.assertIs(check['matches_to_six_decimals'], False)
        original = train_gbdt_ranker.RECORDED_TFIDF_NDCG5
        self.addCleanup(setattr, train_gbdt_ranker, 'RECORDED_TFIDF_NDCG5', original)
        train_gbdt_ranker.RECORDED_TFIDF_NDCG5 = 1.0
        summary = run(self.data, self.runs / 'recorded-match', runs_root=self.runs)
        self.assertIs(summary['tfidf_ndcg5_matches_recorded'], True)
        self.assertIs(read_outputs(self.runs / 'recorded-match')['metrics.json']['recorded_tfidf_check']
                      ['matches_to_six_decimals'], True)


class TestSplitIsolationTests(TemporaryRunCase):
    def test_run_opens_only_training_and_validation_files(self):
        # Test split files are present and unreadable as JSON; an audit hook records every open.
        for name in ('test_profiles.jsonl', 'test_pairs.jsonl', 'test_labels.jsonl'):
            (self.data / name).write_text('not json\n', encoding='utf-8')
        result = subprocess.run([sys.executable, '-B', '-c', AUDIT_SCRIPT, str(ML_DIR), str(self.data),
                                 str(self.runs / 'audited'), str(self.runs)],
                                capture_output=True, text=True, check=True, timeout=300)
        self.assertEqual(json.loads(result.stdout.strip().splitlines()[-1]), sorted(train_gbdt_ranker.DATA_FILES))
        self.assertTrue((self.runs / 'audited' / 'metrics.json').exists())

    def test_script_names_no_test_split_file(self):
        self.assertFalse(any('test_' in name for name in train_gbdt_ranker.DATA_FILES))

    def test_command_line_refuses_an_output_outside_ml_runs(self):
        # The command line always uses ml/runs, so only its refusal path is exercised here.
        result = subprocess.run([sys.executable, '-B', str(ML_DIR / 'train_gbdt_ranker.py'), str(self.data),
                                 str(self.root / 'outside')], capture_output=True, text=True, timeout=300)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('must be inside', result.stderr)
        self.assertFalse((self.root / 'outside').exists())


class QueryGroupTests(unittest.TestCase):
    PAIRS = [{'mentee_id': mentee, 'mentor_id': mentor, 'relevance_score': grade} for mentee, mentor, grade in (
        ('Q2', 'B', 0), ('Q1', 'D', 1), ('Q3', 'A', 3), ('Q2', 'A', 3), ('Q1', 'A', 2), ('Q3', 'C', 0),
        ('Q1', 'C', 0), ('Q3', 'B', 1), ('Q1', 'B', 3))]

    def test_ordered_makes_each_mentee_contiguous(self):
        self.assertEqual([(pair['mentee_id'], pair['mentor_id']) for pair in ordered(self.PAIRS)],
                         [('Q1', 'A'), ('Q1', 'B'), ('Q1', 'C'), ('Q1', 'D'), ('Q2', 'A'), ('Q2', 'B'),
                          ('Q3', 'A'), ('Q3', 'B'), ('Q3', 'C')])

    def test_group_sizes_follow_row_order(self):
        self.assertEqual(group_sizes(ordered(self.PAIRS)), [4, 2, 3])
        self.assertEqual(group_sizes(ordered(self.PAIRS)[::-1]), [3, 2, 4])

    def test_group_sizes_refuse_interleaved_mentees(self):
        with self.assertRaises(ValueError):
            group_sizes(self.PAIRS)

    def test_fit_ranker_is_a_seeded_lambdarank_model_with_one_group_per_mentee(self):
        import numpy as np
        from unittest import mock
        pairs = ordered(self.PAIRS)
        features = np.asarray([[pair['relevance_score'], index % 2] for index, pair in enumerate(pairs)], dtype=np.float64)
        params = {'num_leaves': 4, 'min_child_samples': 1, 'n_estimators': 5, 'learning_rate': 0.1}
        real_fit = train_gbdt_ranker.lightgbm.LGBMRanker.fit
        with mock.patch.object(train_gbdt_ranker.lightgbm.LGBMRanker, 'fit', autospec=True, side_effect=real_fit) as fit:
            model = fit_ranker(features, pairs, params, seed=123)
        self.assertEqual(fit.call_args.kwargs['group'], [4, 2, 3])
        self.assertEqual(list(fit.call_args.args[2]), [pair['relevance_score'] for pair in pairs])
        self.assertIsInstance(model, train_gbdt_ranker.lightgbm.LGBMRanker)
        settings = model.get_params()
        self.assertEqual(settings['objective'], 'lambdarank')
        self.assertEqual(model.booster_.params['objective'], 'lambdarank')
        self.assertEqual(settings['random_state'], 123)
        self.assertTrue(settings['deterministic'])
        self.assertEqual(settings['n_jobs'], 1)
        for name, value in params.items():
            self.assertEqual(settings[name], value)
        with self.assertRaises(ValueError):
            fit_ranker(features, self.PAIRS, params, seed=123)


class CrossValidationTests(unittest.TestCase):
    def test_folds_partition_the_mentees_without_overlap(self):
        mentees = [f'M{index:02d}' for index in range(20)]
        folds = grouped_folds(mentees * 3, FOLDS, seed=42)
        self.assertEqual(len(folds), FOLDS)
        self.assertEqual(sorted(mentee for fold in folds for mentee in fold), mentees)
        self.assertEqual([len(fold) for fold in folds], [4] * FOLDS)
        self.assertEqual(folds, grouped_folds(mentees[::-1], FOLDS, seed=42))
        self.assertNotEqual(folds, grouped_folds(mentees, FOLDS, seed=7))

    def test_folds_need_at_least_one_mentee_each(self):
        with self.assertRaises(ValueError):
            grouped_folds(['A', 'B', 'C', 'D'], FOLDS, seed=42)

    def test_no_mentee_is_fitted_and_scored_in_the_same_fold(self):
        import numpy as np
        from unittest import mock
        _, pairs = fixture('train', 10, 3)
        features = np.arange(len(pairs) * 5, dtype=np.float64).reshape(len(pairs), 5) % 7
        fitted = []
        real_fit, real_score = train_gbdt_ranker.fit_ranker, train_gbdt_ranker.mean_ndcg5

        def recording_fit(fold_features, fold_pairs, params, seed):
            fitted.append({pair['mentee_id'] for pair in fold_pairs})
            return real_fit(fold_features, fold_pairs, params, seed)

        def checking_score(fold_pairs, scores):
            self.assertFalse(fitted[-1] & {pair['mentee_id'] for pair in fold_pairs})
            self.assertEqual(fitted[-1] | {pair['mentee_id'] for pair in fold_pairs},
                             {pair['mentee_id'] for pair in pairs})
            return real_score(fold_pairs, scores)

        with mock.patch.object(train_gbdt_ranker, 'fit_ranker', recording_fit), \
                mock.patch.object(train_gbdt_ranker, 'mean_ndcg5', checking_score):
            best, results, folds = cross_validate(features, pairs, seed=42)
        self.assertEqual(len(fitted), len(grid_candidates()) * FOLDS)
        self.assertEqual(len(results), len(grid_candidates()))
        self.assertIn(best, results)

    def test_grid_is_small_and_complete(self):
        candidates = grid_candidates()
        self.assertEqual(len(candidates), 16)
        self.assertEqual(len({json.dumps(candidate, sort_keys=True) for candidate in candidates}), 16)
        for candidate in candidates:
            self.assertEqual(set(candidate), set(GRID))

    def test_mean_ndcg5_ranks_by_score_then_mentor_id(self):
        pairs = [{'mentee_id': 'Q', 'mentor_id': 'A', 'relevance_score': 0},
                 {'mentee_id': 'Q', 'mentor_id': 'B', 'relevance_score': 3}]
        self.assertEqual(mean_ndcg5(pairs, [0.1, 0.9]), 1.0)
        self.assertLess(mean_ndcg5(pairs, [0.9, 0.1]), 1.0)
        # A tie is broken by mentor ID, so the grade 0 mentor 'A' comes first.
        self.assertEqual(mean_ndcg5(pairs, [0.5, 0.5]), mean_ndcg5(pairs, [0.9, 0.1]))


if __name__ == '__main__':
    unittest.main()
