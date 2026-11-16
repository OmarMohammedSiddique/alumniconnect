"""Hand-computed checks for the shared v3 evaluator and the lexical baselines."""
from pathlib import Path
import math
import sys
import unittest

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR))
import numpy as np
import baselines_v3
import eval_v3
from train_scratch_pilot import ranking_metrics


class MetricTests(unittest.TestCase):
    def test_hand_computed_query(self):
        # Ranked grades 3,0,2,0,0,1,0. DCG@5 = 7/1 + 3/log2(4) = 8.5.
        # Ideal 3,2,1,0,0: 7 + 3/log2(3) + 1/log2(4) = 9.392789...
        result = eval_v3.query_metrics([3, 0, 2, 0, 0, 1, 0])
        ideal5 = 7 + 3 / math.log2(3) + 0.5
        self.assertAlmostEqual(result['ndcg5'], 8.5 / ideal5, places=12)
        self.assertAlmostEqual(result['ndcg5'], 0.904950, places=6)
        # @10 adds the grade 1 at rank 6: 1/log2(7).
        self.assertAlmostEqual(result['ndcg10'], (8.5 + 1 / math.log2(7)) / ideal5, places=12)
        self.assertEqual((result['mrr5'], result['p1'], result['p5'], result['hit5']), (1.0, 1.0, 0.4, 1.0))

    def test_first_relevant_rank_and_cutoffs(self):
        result = eval_v3.query_metrics([1, 0, 2, 0, 0, 3])
        self.assertEqual((result['mrr5'], result['p1'], result['p5'], result['hit5']), (1 / 3, 0.0, 0.2, 1.0))
        late = eval_v3.query_metrics([0, 0, 0, 0, 0, 3])
        self.assertEqual((late['mrr5'], late['p5'], late['hit5'], late['ndcg5']), (0.0, 0.0, 0.0, 0.0))
        self.assertAlmostEqual(late['ndcg10'], (7 / math.log2(7)) / 7, places=12)
        self.assertEqual(eval_v3.query_metrics([3, 2, 1, 0])['ndcg5'], 1.0)

    def test_grade_one_is_gain_but_not_relevant(self):
        only_tangential = eval_v3.query_metrics([0, 1, 0])
        self.assertAlmostEqual(only_tangential['ndcg5'], (1 / math.log2(3)) / 1, places=12)
        self.assertIsNone(only_tangential['mrr5'])
        self.assertIsNone(only_tangential['p5'])

    def test_no_gain_is_undefined_or_zero_in_legacy_mode(self):
        empty = eval_v3.query_metrics([0, 0, 0])
        self.assertTrue(all(value is None for value in empty.values()))
        legacy = eval_v3.query_metrics([0, 0, 0], legacy=True)
        self.assertTrue(all(value == 0.0 for value in legacy.values()))

    def test_legacy_mode_reproduces_the_recorded_pilot_metric_code(self):
        rng = np.random.default_rng(3)
        labels = {f'Q{q}': {f'M{m}': int(rng.choice([0, 0, 0, 1, 2, 3])) for m in range(10)} for q in range(6)}
        labels['Q0'] = {f'M{m}': 0 for m in range(10)}
        scores = {q: {m: float(rng.random()) for m in pool} for q, pool in labels.items()}
        rows = eval_v3.evaluate(scores, labels, legacy=True)
        old = ranking_metrics({row['mentee_id']: row['ranking'] for row in rows}, labels)['aggregate']
        for metric in ('ndcg5', 'p1', 'p5', 'mrr5', 'hit5'):
            self.assertAlmostEqual(eval_v3.mean_of(rows, metric)[0], old[metric], places=12)


class EvaluateTests(unittest.TestCase):
    labels = {'Q1': {'A': 3, 'B': 0, 'C': 2}, 'Q2': {'A': 0, 'B': 0, 'C': 0}, 'Q3': {'A': 1, 'B': 0, 'C': 0}}

    def test_ties_break_by_mentor_id_and_rankings_are_kept(self):
        scores = {'Q1': {'A': 0.5, 'B': 0.5, 'C': 0.9}, 'Q2': {'A': 0, 'B': 0, 'C': 0}, 'Q3': {'A': 0.1, 'B': 0.2, 'C': 0.3}}
        rows = eval_v3.evaluate(scores, self.labels)
        self.assertEqual(rows[0]['ranking'], ['C', 'A', 'B'])
        self.assertEqual(rows[0]['ranked_grades'], [2, 3, 0])
        self.assertEqual(rows[0]['ranked_scores'], [0.9, 0.5, 0.5])
        self.assertEqual(rows[1]['ranking'], ['A', 'B', 'C'])

    def test_means_leave_out_undefined_queries_and_report_counts(self):
        scores = {q: {'A': 3.0, 'B': 2.0, 'C': 1.0} for q in self.labels}
        summary = eval_v3.summarise(eval_v3.evaluate(scores, self.labels))
        self.assertEqual(summary['queries'], 3)
        self.assertEqual(summary['ndcg5']['n'], 2)
        self.assertEqual(summary['p1']['n'], 1)
        self.assertEqual(summary['p1']['mean'], 1.0)
        # Q1 ranks grades 3,0,2 (ideal 3,2,0); Q3 ranks its only grade 1 first; Q2 has no gain and is left out.
        self.assertAlmostEqual(summary['ndcg5']['mean'], ((7 + 3 / 2) / (7 + 3 / math.log2(3)) + 1) / 2, places=12)

    def test_incomplete_extra_or_invalid_scores_are_refused(self):
        good = {q: {'A': 1.0, 'B': 2.0, 'C': 3.0} for q in self.labels}
        for broken in ({**good, 'Q1': {'A': 1.0, 'B': 2.0}}, {**good, 'Q1': {**good['Q1'], 'D': 1.0}},
                       {q: good[q] for q in ('Q1', 'Q2')}, {**good, 'Q1': {'A': float('nan'), 'B': 1.0, 'C': 2.0}}):
            with self.assertRaises(ValueError):
                eval_v3.evaluate(broken, self.labels)
        with self.assertRaises(ValueError):
            eval_v3.labels_from_pairs([{'mentee_id': 'Q', 'mentor_id': 'M', 'relevance_score': 1}] * 2)


class BootstrapTests(unittest.TestCase):
    def test_interval_is_seeded_contains_the_mean_and_shrinks_with_more_queries(self):
        rng = np.random.default_rng(0)
        values = rng.random(40)
        first, second = eval_v3.bootstrap_interval(values), eval_v3.bootstrap_interval(values)
        self.assertEqual(first, second)
        self.assertLess(first[0], values.mean())
        self.assertGreater(first[1], values.mean())
        wide = eval_v3.bootstrap_interval(values[:10])
        self.assertGreater(wide[1] - wide[0], first[1] - first[0])
        self.assertEqual(eval_v3.bootstrap_interval([0.5] * 8), [0.5, 0.5])
        self.assertIsNone(eval_v3.bootstrap_interval([0.5]))

    def rows(self, values):
        return [{'mentee_id': f'Q{i}', 'ndcg5': value} for i, value in enumerate(values)]

    def test_paired_difference_verdicts(self):
        base = [0.2, 0.4, 0.6, 0.5, 0.3, 0.7, 0.1, 0.9]
        better = eval_v3.paired_difference(self.rows([v + 0.05 for v in base]), self.rows(base), 'ndcg5')
        self.assertAlmostEqual(better['mean'], 0.05)
        self.assertEqual(better['verdict'], 'a is better than b')
        self.assertEqual(eval_v3.paired_difference(self.rows(base), self.rows([v + 0.05 for v in base]), 'ndcg5')['verdict'],
                         'a is worse than b')
        mixed = [v + (0.3 if i % 2 else -0.3) for i, v in enumerate(base)]
        self.assertEqual(eval_v3.paired_difference(self.rows(mixed), self.rows(base), 'ndcg5')['verdict'], 'not distinguishable')

    def test_paired_difference_skips_undefined_and_needs_the_same_queries(self):
        a, b = self.rows([0.5, None, 0.7, 0.9]), self.rows([0.4, 0.2, None, 0.8])
        self.assertEqual(eval_v3.paired_difference(a, b, 'ndcg5')['n'], 2)
        self.assertEqual(eval_v3.paired_difference(a, b, 'ndcg5', mentees={'Q0'})['verdict'], 'too few Mentees')
        with self.assertRaises(ValueError):
            eval_v3.paired_difference(a, b[:3], 'ndcg5')


class CollapseTests(unittest.TestCase):
    def test_query_independent_scores_are_flagged(self):
        mentors = [f'M{j}' for j in range(6)]
        labels = {f'Q{i}': {m: int(j == i) * 3 for j, m in enumerate(mentors)} for i in range(6)}
        same_order = {q: {m: float(j) + 0.001 * i for j, m in enumerate(mentors)} for i, q in enumerate(labels)}
        self.assertGreater(eval_v3.collapse_share(same_order), 0.99)
        check = eval_v3.collapse_check(same_order, labels)
        self.assertFalse(check['passed'])
        self.assertAlmostEqual(check['ndcg5'], check['ndcg5_of_mentor_mean_order'], places=6)
        # A constant added per Mentee does not hide the collapse.
        shifted = {q: {m: value + 10 * i for m, value in pool.items()} for i, (q, pool) in enumerate(same_order.items())}
        self.assertGreater(eval_v3.collapse_share(shifted), 0.99)

    def test_query_specific_scores_pass(self):
        mentors = [f'M{j}' for j in range(6)]
        labels = {f'Q{i}': {m: int(j == i) * 3 for j, m in enumerate(mentors)} for i in range(6)}
        diagonal = {q: {m: float(labels[q][m]) for m in mentors} for q in labels}
        check = eval_v3.collapse_check(diagonal, labels)
        self.assertLess(check['mentor_mean_variance_share'], 1e-9)
        self.assertTrue(check['passed'])
        self.assertEqual(check['ndcg5'], 1.0)
        self.assertEqual(eval_v3.collapse_share({q: {m: 1.0 for m in mentors} for q in labels}), 1.0)

    def test_random_baseline_is_seeded(self):
        labels = {f'Q{i}': {f'M{j}': (i + j) % 4 for j in range(8)} for i in range(5)}
        self.assertEqual(eval_v3.random_baseline(labels, seeds=5), eval_v3.random_baseline(labels, seeds=5))
        self.assertEqual(eval_v3.random_scores(labels, 1), eval_v3.random_scores(labels, 1))


def person(person_id, role, split, headline, bio='', skills=(), industry=''):
    return {'person_id': person_id, 'role': role, 'split': split, 'headline': headline, 'bio': bio,
            'skills': list(skills), 'industry': industry}


class BaselineTests(unittest.TestCase):
    train = [person('T1', 'mentor', 'train', 'Runway planner', 'Plans runway slots daily.', ['Scheduling']),
             person('T2', 'mentor', 'train', 'Ledger keeper', 'Keeps ledger books tidy.', ['Accounts']),
             person('T3', 'mentee', 'train', 'Student', 'Wants runway work.', [])]
    mentees = [person('Q1', 'mentee', 'validation', 'Graduate', 'I want runway slots experience.')]
    mentors = [person('M1', 'mentor', 'validation', 'Ledger lead', 'Ledger books and accounts.'),
               person('M2', 'mentor', 'validation', 'Runway lead', 'Runway slots and scheduling.')]

    def test_lexical_baselines_prefer_the_overlapping_mentor(self):
        for system in (baselines_v3.tfidf_scores, baselines_v3.bm25_scores):
            scores = system(self.train, self.mentees, self.mentors)
            self.assertGreater(scores['Q1']['M2'], scores['Q1']['M1'], system.__name__)

    def test_fitted_statistics_refuse_non_training_profiles(self):
        for system in (baselines_v3.tfidf_scores, baselines_v3.bm25_scores):
            with self.assertRaises(ValueError):
                system(self.train + self.mentors, self.mentees, self.mentors)

    def test_bm25_matches_a_hand_computation(self):
        train = [person('T1', 'mentor', 'train', 'alpha beta'), person('T2', 'mentor', 'train', 'alpha gamma gamma')]
        mentee = [person('Q', 'mentee', 'validation', 'beta gamma')]
        mentor = [person('M', 'mentor', 'validation', 'gamma gamma delta')]
        # N=2, average length 2.5; df(beta)=1, df(gamma)=1; only gamma is in the Mentor text, tf=2, length 3.
        idf = math.log(1 + (2 - 1 + 0.5) / (1 + 0.5))
        expected = idf * 2 * 2.5 / (2 + 1.5 * (1 - 0.75 + 0.75 * 3 / 2.5))
        self.assertAlmostEqual(baselines_v3.bm25_scores(train, mentee, mentor)['Q']['M'], expected, places=12)

    def test_text_uses_only_the_four_input_fields(self):
        profile = person('X', 'mentee', 'train', 'Head', 'Bio', ['a', 'b'], 'Sector')
        self.assertEqual(baselines_v3.text(profile), 'Head\nBio\nSkills: a, b\nIndustry: Sector')
        self.assertEqual(baselines_v3.text({**profile, 'person_id': 'SECRET', 'relevance_score': 3}), baselines_v3.text(profile))

    def test_vector_scores_are_cosines(self):
        vectors = {'Q1': [1, 0], 'M1': [0, 2], 'M2': [3, 0]}
        scores = baselines_v3.vector_scores(vectors, self.mentees, self.mentors)
        self.assertEqual((scores['Q1']['M1'], scores['Q1']['M2']), (0.0, 1.0))


class FixtureTests(unittest.TestCase):
    def test_committed_fixture_is_complete_and_scores_with_the_shared_evaluator(self):
        folder = ML_DIR / 'synth' / 'fixture'
        profiles = eval_v3.load_jsonl(folder / 'profiles.jsonl')
        labels = eval_v3.labels_from_pairs(eval_v3.load_jsonl(folder / 'pairs.jsonl'))
        mentees, mentors = baselines_v3.split_roles(profiles)
        self.assertEqual({len(pool) for pool in labels.values()}, {len(mentors)})
        for profile in profiles:
            self.assertEqual(set(profile), {'person_id', 'role', 'split', 'headline', 'bio', 'skills', 'industry'})
        perfect = {q: {m: float(g) for m, g in pool.items()} for q, pool in labels.items()}
        self.assertEqual(eval_v3.summarise(eval_v3.evaluate(perfect, labels))['ndcg5']['mean'], 1.0)


if __name__ == '__main__':
    unittest.main()
