"""Checks for the learned TF-IDF reweighting encoder, using invented profiles only."""
from pathlib import Path
import sys
import tempfile
import unittest

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import numpy as np
import torch
from ranker_features import fit_vectoriser
from train_gbdt_ranker import tfidf_scores
from train_reweighted_tfidf import ReweightedTfidf, pool_scores, run, train
from test_train_gbdt_ranker import fixture, write_data


class ReweightedTests(unittest.TestCase):
    def test_untrained_model_ranks_like_tfidf(self):
        profiles, pairs = fixture('train', 6, 3)
        model, vectoriser, _ = train(profiles, pairs, {'anchor': 1.0}, 42, epochs=0)
        ours = pool_scores(model, vectoriser, profiles)
        baseline = tfidf_scores(profiles, fit_vectoriser(profiles))
        self.assertTrue(np.allclose(ours, baseline, atol=0.02))

    def test_weights_stay_non_negative_and_move_with_training(self):
        torch.manual_seed(0)
        model = ReweightedTfidf(5)
        with torch.no_grad():
            model.query_weight[0] = -3.0
        encoded = model.encode(torch.ones(1, 5), True)
        self.assertEqual(float(encoded[0, 0]), 0.0)
        profiles, pairs = fixture('train', 6, 3)
        before, _, _ = train(profiles, pairs, {'anchor': 0.1}, 3, epochs=0)
        after, _, _ = train(profiles, pairs, {'anchor': 0.1}, 3, epochs=5)
        self.assertFalse(torch.equal(before.query_weight, after.query_weight))

    def test_a_strong_anchor_keeps_weights_near_tfidf(self):
        profiles, pairs = fixture('train', 6, 3)
        loose, _, _ = train(profiles, pairs, {'anchor': 0.0}, 5, epochs=30)
        tight, _, _ = train(profiles, pairs, {'anchor': 100.0}, 5, epochs=30)
        self.assertLess(float(tight.anchor_penalty()), float(loose.anchor_penalty()))

    def test_run_guards_and_end_to_end_on_invented_data(self):
        with self.assertRaises(ValueError):
            run('missing', 'missing')
        with tempfile.TemporaryDirectory() as tmp:
            data = Path(tmp) / 'data'
            write_data(data)
            (data / 'test_pairs.jsonl').write_text('this file must never be read\n')
            runs = Path(tmp) / 'runs'
            summary = run(data, runs / 'rw', runs_root=runs, seeds=(42,), allow_machine_labels=True)
            self.assertFalse(summary['test_performance_accessed'])
            self.assertIn(summary['chosen']['config']['anchor'], (0.1, 1.0, 10.0))


if __name__ == '__main__':
    unittest.main()
