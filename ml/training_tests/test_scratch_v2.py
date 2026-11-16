"""Checks for the from-scratch v2 encoder, using invented profiles only."""
from pathlib import Path
import random
import sys
import tempfile
import unittest

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import torch
from train_scratch_v2 import (BagEncoder, feature_ids, fit_vocabulary, listwise_loss, pair_scores, pools, raw_features,
                              run, thin, train)
from test_train_gbdt_ranker import fixture, write_data

CONFIG = {'dimension': 16, 'pretrain': True}


class FeatureTests(unittest.TestCase):
    def test_only_whitelisted_fields_reach_features(self):
        base = {'person_id': 'A', 'role': 'mentee', 'split': 'train', 'headline': 'Pricing analyst',
                'bio': 'Reserving models.', 'skills': ['Pricing'], 'industry': 'Insurance'}
        noisy = {**base, 'person_id': 'SECRET-ID', 'relevance_score': 3, 'label_rationale': 'SECRET',
                 'ambiguity_flag': True, 'annotation_status': 'SECRET'}
        self.assertEqual(raw_features(base), raw_features(noisy))
        self.assertFalse(any('secret' in feature for feature in raw_features(noisy)))

    def test_vocabulary_is_fitted_on_training_profiles_only(self):
        profiles, _ = fixture('train', 2, 2)
        vocabulary = fit_vocabulary(profiles)
        with self.assertRaises(ValueError):
            fit_vocabulary(profiles + [{**profiles[0], 'split': 'validation'}])
        unseen = {**profiles[0], 'headline': 'zzqx', 'bio': '', 'skills': [], 'industry': ''}
        before = dict(vocabulary)
        self.assertEqual(feature_ids(unseen, vocabulary), [])
        self.assertEqual(vocabulary, before)

    def test_character_ngrams_link_related_words(self):
        profiles, _ = fixture('train', 1, 1)
        features = raw_features({**profiles[0], 'headline': 'scheduling', 'bio': '', 'skills': [], 'industry': ''})
        self.assertIn('c:<sch', features)
        self.assertIn('w:scheduling', features)

    def test_thinning_always_keeps_a_feature(self):
        generator = random.Random(1)
        self.assertEqual(len(thin([5], 1.0, generator)), 1)
        self.assertEqual(thin([], 0.5, generator), [0])


class ModelTests(unittest.TestCase):
    def test_random_encoder_outputs_unit_vectors_with_gradients(self):
        torch.manual_seed(42)
        model = BagEncoder(20, 8)
        q, m = model([[1, 2], [3]], True), model([[4], [5, 6]], False)
        self.assertEqual(tuple(q.shape), (2, 8))
        self.assertTrue(torch.allclose(q.norm(dim=1), torch.ones(2), atol=1e-5))
        (q * m).sum().backward()
        self.assertGreater(float(model.embedding.weight.grad.abs().sum()), 0)

    def test_listwise_loss_prefers_the_graded_order(self):
        profiles, pairs = fixture('train', 6, 3)
        model, vocabulary, _ = train(profiles, pairs, CONFIG, 42, epochs=0)
        bags = {p['person_id']: feature_ids(p, vocabulary) for p in profiles}
        before = float(listwise_loss(model, pools(pairs), bags, random.Random(0), 0.0).detach())
        trained, vocabulary, _ = train(profiles, pairs, CONFIG, 42, epochs=30)
        bags = {p['person_id']: feature_ids(p, vocabulary) for p in profiles}
        after = float(listwise_loss(trained, pools(pairs), bags, random.Random(0), 0.0).detach())
        self.assertLess(after, before)

    def test_training_is_deterministic_for_a_seed(self):
        profiles, pairs = fixture('train', 6, 3)
        first, vocabulary, _ = train(profiles, pairs, CONFIG, 7, epochs=5)
        second, _, _ = train(profiles, pairs, CONFIG, 7, epochs=5)
        self.assertEqual(pair_scores(first, vocabulary, profiles, pairs), pair_scores(second, vocabulary, profiles, pairs))

    def test_weights_change_from_random_initialisation(self):
        profiles, pairs = fixture('train', 6, 3)
        untrained, _, _ = train(profiles, pairs, CONFIG, 3, epochs=0)
        trained, _, _ = train(profiles, pairs, CONFIG, 3, epochs=3)
        self.assertFalse(torch.equal(untrained.query_head.weight, trained.query_head.weight))


class RunGuardTests(unittest.TestCase):
    def test_machine_labels_need_explicit_opt_in(self):
        with self.assertRaises(ValueError):
            run('missing', 'missing')

    def test_output_must_be_a_fresh_directory_under_runs(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                run(tmp, Path(tmp) / 'out', runs_root=Path(tmp) / 'runs', allow_machine_labels=True)

    def test_end_to_end_on_invented_data_never_reads_test_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            data = Path(tmp) / 'data'
            write_data(data)
            (data / 'test_pairs.jsonl').write_text('this file must never be read\n')
            runs = Path(tmp) / 'runs'
            summary = run(data, runs / 'v2', runs_root=runs, seeds=(42, 43), allow_machine_labels=True)
            self.assertFalse(summary['test_performance_accessed'])
            self.assertIn(summary['chosen']['config']['dimension'], (32, 64))
            self.assertTrue((runs / 'v2' / 'model.pt').exists())
            self.assertGreaterEqual(summary['validation']['scratch_v2']['ndcg5']['mean'], 0.0)


if __name__ == '__main__':
    unittest.main()
