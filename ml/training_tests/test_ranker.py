"""Feature builder checks for the GBDT ranker pilot, using invented profiles only."""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ranker_features import FEATURE_NAMES, build_features, fit_vectoriser, mentions, pair_features


def profile(person_id, role, headline, bio, skills, industry):
    return {'person_id': person_id, 'role': role, 'split': 'train', 'headline': headline,
            'bio': bio, 'skills': skills, 'industry': industry}


MENTEE = profile('MTE-1', 'mentee', 'Junior analyst', 'Learning Python and R for pricing models.',
                 ['Python', 'R', 'Pricing', 'SQL'], 'Insurance')
MENTOR = profile('MTR-1', 'mentor', 'Pricing actuary', 'I coach analysts on pricing and Python tooling.',
                 ['python', 'Actuarial Science', ' Pricing '], 'insurance')
OTHER = profile('MTR-2', 'mentor', 'Warehouse lead', 'Cold chain depots and carrier audits.',
                ['Logistics'], 'Pharmaceuticals')
EMPTY = profile('MTR-3', 'mentor', '', '', [], '')
PROFILES = [MENTEE, MENTOR, OTHER, EMPTY]


class FeatureTests(unittest.TestCase):
    def setUp(self):
        self.vectoriser = fit_vectoriser(PROFILES)

    def test_feature_values_for_a_known_pair(self):
        row = dict(zip(FEATURE_NAMES, pair_features(MENTEE, MENTOR, self.vectoriser), strict=True))
        # Shared skills are python and pricing; the union has five distinct skills.
        self.assertEqual(row['skill_overlap_count'], 2.0)
        self.assertAlmostEqual(row['skill_jaccard'], 2 / 5)
        self.assertEqual(row['industry_match'], 1.0)
        # Python and Pricing appear in the mentor text. 'R' and 'SQL' do not,
        # and 'R' must not match inside other words.
        self.assertAlmostEqual(row['mentee_skill_mention_share'], 2 / 4)
        self.assertGreater(row['tfidf_cosine'], 0.0)
        self.assertLess(row['tfidf_cosine'], 1.0)

    def test_identical_text_has_unit_cosine_and_unrelated_pair_scores_lower(self):
        same = pair_features(MENTEE, MENTEE, self.vectoriser)
        self.assertAlmostEqual(same[0], 1.0)
        related = pair_features(MENTEE, MENTOR, self.vectoriser)
        unrelated = pair_features(MENTEE, OTHER, self.vectoriser)
        self.assertGreater(related[0], unrelated[0])
        self.assertEqual(unrelated[1:], [0.0, 0.0, 0.0, 0.0])

    def test_empty_profiles_give_zero_features(self):
        self.assertEqual(pair_features(MENTEE, EMPTY, self.vectoriser), [0.0] * len(FEATURE_NAMES))
        self.assertEqual(pair_features(EMPTY, EMPTY, self.vectoriser), [0.0] * len(FEATURE_NAMES))

    def test_mentions_respect_symbols_inside_skill_names(self):
        self.assertFalse(mentions('c', 'c++ and embedded work'))
        self.assertFalse(mentions('r', 'r&d scale-up'))
        self.assertFalse(mentions('r', 'researcher'))
        self.assertFalse(mentions('node', 'node.js services'))
        self.assertFalse(mentions('b testing', 'a/b testing'))
        self.assertTrue(mentions('python', 'python tooling.'))
        self.assertTrue(mentions('python', 'i teach python, sql and r.'))
        self.assertTrue(mentions('r', 'i teach python, sql and r.'))
        self.assertTrue(mentions('c++', 'modern c++ (and rust)'))
        self.assertTrue(mentions('node.js', 'we run node.js.'))

    def test_mentions_treat_a_slash_as_a_separator_between_terms(self):
        self.assertTrue(mentions('c++', 'wwise/c++ integration'))
        self.assertTrue(mentions('wwise', 'wwise/c++ integration'))
        self.assertTrue(mentions('aws', 'terraform/aws security lab'))
        self.assertTrue(mentions('terraform', 'terraform/aws security lab'))
        self.assertTrue(mentions('pytorch', 'xgboost/pytorch models'))
        self.assertTrue(mentions('a/b testing', 'search ranking and a/b testing'))
        self.assertTrue(mentions('cac/ltv', 'cac/ltv modelling'))
        self.assertFalse(mentions('c', 'wwise/c++ integration'))
        self.assertFalse(mentions('b testing', 'a/b testing'))
        self.assertFalse(mentions('go', 'go-to-market planning'))

    def test_mention_share_ignores_the_labels_added_by_text(self):
        mentee = profile('MTE-2', 'mentee', 'Graduate', 'Exploring options.', ['Skills', 'Industry', 'C'], 'Retail')
        mentor = profile('MTR-4', 'mentor', 'Embedded engineer', 'Firmware reviews.', ['C++'], 'Automotive')
        row = dict(zip(FEATURE_NAMES, pair_features(mentee, mentor, self.vectoriser), strict=True))
        self.assertEqual(row['mentee_skill_mention_share'], 0.0)
        self.assertEqual(row['skill_overlap_count'], 0.0)

    def test_missing_values_never_count_as_a_match(self):
        blank = profile('MTR-5', 'mentor', 'Coach', 'General advice.', None, None)
        row = dict(zip(FEATURE_NAMES, pair_features(blank, blank, self.vectoriser), strict=True))
        self.assertEqual(row['industry_match'], 0.0)
        self.assertEqual(row['skill_jaccard'], 0.0)
        self.assertEqual(row['mentee_skill_mention_share'], 0.0)

    def test_vectoriser_refuses_profiles_outside_the_training_split(self):
        with self.assertRaises(ValueError):
            fit_vectoriser([MENTEE, {**MENTOR, 'split': 'validation'}])

    def test_matrix_has_one_row_per_pair_in_pair_order(self):
        pairs = [{'mentee_id': 'MTE-1', 'mentor_id': 'MTR-2'}, {'mentee_id': 'MTE-1', 'mentor_id': 'MTR-1'}]
        matrix = build_features(PROFILES, pairs, self.vectoriser)
        self.assertEqual(matrix.shape, (2, len(FEATURE_NAMES)))
        self.assertEqual(matrix[0].tolist(), pair_features(MENTEE, OTHER, self.vectoriser))
        self.assertEqual(matrix[1].tolist(), pair_features(MENTEE, MENTOR, self.vectoriser))
        self.assertEqual(build_features(PROFILES, [], self.vectoriser).shape, (0, len(FEATURE_NAMES)))


if __name__ == '__main__':
    unittest.main()
