"""Feature builder checks for the GBDT ranker pilot, using invented profiles only."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR))
from ranker_features import FEATURE_NAMES, build_features, fit_vectoriser, load_jsonl, mentions, pair_features
from train_scratch_pilot import text


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


PAIRS = [{'mentee_id': 'MTE-1', 'mentor_id': 'MTR-1'}, {'mentee_id': 'MTE-1', 'mentor_id': 'MTR-2'},
         {'mentee_id': 'MTE-1', 'mentor_id': 'MTR-3'}]
# Invented letter runs that occur nowhere in the fixtures above, so any trace of
# them in a vocabulary or a feature value proves a leak.
ID_MARKER, LABEL_MARKER, UNSEEN_MARKER = 'qxjqxj', 'zvkzvk', 'wqzwqz'


def tampered_profiles(split):
    """Same input fields; every other profile field changed or added."""
    return [{**item, 'person_id': ID_MARKER.upper() + '-' + item['person_id'],
             'role': 'mentor' if item['role'] == 'mentee' else 'mentee', 'split': split,
             'relevance_score': 3, 'label_rationale': LABEL_MARKER + ' python pricing insurance',
             'annotation_status': LABEL_MARKER, 'ambiguity_flag': True} for item in PROFILES]


def tampered_pairs(split):
    """Same pairs in the same order; IDs renamed and label fields filled in."""
    return [{'pair_id': f'{ID_MARKER}-{index}', 'split': split, 'relevance_score': 3 - index,
             'mentee_id': ID_MARKER.upper() + '-' + pair['mentee_id'],
             'mentor_id': ID_MARKER.upper() + '-' + pair['mentor_id'],
             'label_rationale': LABEL_MARKER + ' python pricing insurance logistics',
             'annotation_status': LABEL_MARKER, 'ambiguity_flag': index % 2 == 0}
            for index, pair in enumerate(PAIRS)]


class ForbiddenFieldTests(unittest.TestCase):
    def test_ids_split_scores_rationales_and_annotations_do_not_change_features(self):
        expected = build_features(PROFILES, PAIRS, fit_vectoriser(PROFILES))
        self.assertTrue(expected.any())
        for split in ('train', 'validation'):
            with self.subTest(split=split):
                actual = build_features(tampered_profiles(split), tampered_pairs(split), fit_vectoriser(PROFILES))
                self.assertEqual(actual.tobytes(), expected.tobytes())

    def test_forbidden_fields_do_not_change_the_fitted_vectoriser(self):
        clean, tampered = fit_vectoriser(PROFILES), fit_vectoriser(tampered_profiles('train'))
        self.assertEqual(tampered.vocabulary_, clean.vocabulary_)
        self.assertEqual(tampered.idf_.tobytes(), clean.idf_.tobytes())
        for marker in (ID_MARKER, LABEL_MARKER):
            self.assertFalse([term for term in tampered.vocabulary_ if marker[:3] in term or marker[1:4] in term])

    def test_each_relevance_score_gives_the_same_row(self):
        vectoriser = fit_vectoriser(PROFILES)
        rows = {build_features(PROFILES, [{**PAIRS[0], 'relevance_score': score}], vectoriser).tobytes()
                for score in (0, 1, 2, 3, None)}
        self.assertEqual(len(rows), 1)


class VocabularyTests(unittest.TestCase):
    def setUp(self):
        self.vectoriser = fit_vectoriser(PROFILES)
        self.unseen_mentee = {**profile('MTE-9', 'mentee', UNSEEN_MARKER, '', [], ''), 'split': 'validation'}
        self.unseen_mentor = {**profile('MTR-9', 'mentor', UNSEEN_MARKER, '', [], ''), 'split': 'validation'}

    def test_every_vocabulary_term_occurs_in_training_text(self):
        # The character analyser replaces each run of two or more white space
        # characters with one space and leaves single ones (such as a newline) alone.
        training_text = [re.sub(r'\s\s+', ' ', text(item).lower()) for item in PROFILES]
        self.assertTrue(self.vectoriser.vocabulary_)
        for term in self.vectoriser.vocabulary_:
            self.assertTrue(any(term in document for document in training_text), term)

    def test_building_validation_features_leaves_the_vectoriser_unchanged(self):
        vocabulary, idf = dict(self.vectoriser.vocabulary_), self.vectoriser.idf_.tobytes()
        profiles = [*PROFILES, self.unseen_mentee, self.unseen_mentor]
        matrix = build_features(profiles, [{'mentee_id': 'MTE-9', 'mentor_id': 'MTR-9'},
                                           {'mentee_id': 'MTE-9', 'mentor_id': 'MTR-1'}], self.vectoriser)
        # Identical text that is absent from training: a cosine of one here would
        # mean the builder had fitted on the profiles it was asked to score.
        self.assertEqual(matrix[0, 0], 0.0)
        self.assertEqual(matrix.tolist(), [pair_features(self.unseen_mentee, self.unseen_mentor, self.vectoriser),
                                           pair_features(self.unseen_mentee, MENTOR, self.vectoriser)])
        self.assertEqual(self.vectoriser.vocabulary_, vocabulary)
        self.assertEqual(self.vectoriser.idf_.tobytes(), idf)
        self.assertFalse([term for term in self.vectoriser.vocabulary_ if UNSEEN_MARKER[:3] in term])

    def test_text_seen_only_outside_training_carries_no_cosine_weight(self):
        # The two profiles are identical, yet none of their text is in the
        # training vocabulary, so the cosine must be zero rather than one.
        row = pair_features(self.unseen_mentee, self.unseen_mentor, self.vectoriser)
        self.assertEqual(row[0], 0.0)
        known = fit_vectoriser([*PROFILES, {**self.unseen_mentee, 'split': 'train'}])
        self.assertAlmostEqual(pair_features(self.unseen_mentee, self.unseen_mentor, known)[0], 1.0)

    def test_vectoriser_refuses_any_non_training_profile(self):
        for split in ('validation', 'test', 'TRAIN', None):
            with self.subTest(split=split), self.assertRaises(ValueError):
                fit_vectoriser([*PROFILES, {**self.unseen_mentee, 'split': split}])


HASH_SEED_SCRIPT = """
import json, sys
sys.path.insert(0, sys.argv[1])
from ranker_features import build_features, fit_vectoriser
fixture = json.load(sys.stdin)
matrix = build_features(fixture['profiles'], fixture['pairs'], fit_vectoriser(fixture['profiles']))
print(matrix.tobytes().hex())
"""


class DeterminismTests(unittest.TestCase):
    def test_repeated_builds_are_byte_identical(self):
        first = build_features(PROFILES, PAIRS, fit_vectoriser(PROFILES))
        second = build_features(PROFILES, PAIRS, fit_vectoriser(PROFILES))
        self.assertEqual(first.dtype, second.dtype)
        self.assertEqual(first.tobytes(), second.tobytes())

    def test_profile_order_does_not_change_features(self):
        expected = build_features(PROFILES, PAIRS, fit_vectoriser(PROFILES))
        shuffled = PROFILES[::-1]
        self.assertEqual(build_features(shuffled, PAIRS, fit_vectoriser(shuffled)).tobytes(), expected.tobytes())

    def test_output_does_not_depend_on_the_string_hash_seed(self):
        # Skill sets are unordered, so run fresh interpreters with different hash seeds.
        fixture = json.dumps({'profiles': PROFILES, 'pairs': PAIRS})
        outputs = set()
        for seed in ('0', '1', '4242'):
            result = subprocess.run([sys.executable, '-B', '-c', HASH_SEED_SCRIPT, str(ML_DIR)], input=fixture,
                                    env={**os.environ, 'PYTHONHASHSEED': seed}, capture_output=True, text=True,
                                    check=True, timeout=120)
            outputs.add(result.stdout.strip())
        self.assertEqual(outputs, {build_features(PROFILES, PAIRS, fit_vectoriser(PROFILES)).tobytes().hex()})


class LoaderTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.directory = Path(directory.name)

    def write(self, name):
        path = self.directory / name
        path.write_text(json.dumps(MENTEE) + '\n\n' + json.dumps(MENTOR) + '\n', encoding='utf-8')
        return path

    def test_loader_reads_training_and_validation_files(self):
        for name in ('train_profiles.jsonl', 'validation_profiles.jsonl'):
            self.assertEqual(load_jsonl(self.write(name)), [MENTEE, MENTOR])
        self.assertEqual(load_jsonl(str(self.write('train_pairs.jsonl'))), [MENTEE, MENTOR])

    def test_loader_refuses_file_names_containing_test(self):
        for name in ('test_profiles.jsonl', 'test_pairs.jsonl', 'TEST_pairs.jsonl', 'pilot_test_pairs.jsonl',
                     'train_test_pairs.jsonl'):
            path = self.write(name)
            for candidate in (path, str(path)):
                with self.subTest(name=name, kind=type(candidate).__name__), self.assertRaises(ValueError):
                    load_jsonl(candidate)

    def test_loader_refuses_before_touching_the_file(self):
        # A missing file would raise FileNotFoundError if the loader tried to read it.
        with self.assertRaises(ValueError):
            load_jsonl(self.directory / 'test_pairs.jsonl')

    def test_loader_refuses_an_innocent_name_that_links_to_a_test_file(self):
        target = self.write('test_pairs.jsonl')
        link = self.directory / 'train_pairs.jsonl'
        link.symlink_to(target)
        with self.assertRaises(ValueError):
            load_jsonl(link)

    def test_loader_refuses_a_test_name_that_links_to_an_innocent_file(self):
        link = self.directory / 'test_pairs.jsonl'
        link.symlink_to(self.write('train_pairs.jsonl'))
        with self.assertRaises(ValueError):
            load_jsonl(link)


if __name__ == '__main__':
    unittest.main()
