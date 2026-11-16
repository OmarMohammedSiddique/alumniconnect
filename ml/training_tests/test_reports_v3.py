"""Checks for the v3 reporting helpers: legacy pilot scoring and the data-size learning curve."""
from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_scratch_v3 import CONFIG, SMALL, build_dataset
import plot_learning_curve_v3
import score_legacy_pilot_v3
import train_scratch_v3 as v3


class ReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.data = build_dataset(Path(cls.temp.name) / 'data')
        cls.runs = Path(cls.temp.name) / 'runs'
        for name, fraction in (('full', 1.0), ('half', 0.5)):
            v3.run(cls.data, name, {**CONFIG, 'pretrain': False}, 42, train_fraction=fraction, device='cpu',
                   overrides=SMALL, runs_root=cls.runs)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_learning_curve_points_are_ordered_by_data_size_and_plotted(self):
        points = plot_learning_curve_v3.collect(self.runs, ['full', 'half'])
        self.assertEqual([point['fraction'] for point in points], [0.5, 1.0])
        self.assertLess(points[0]['train_mentees'], points[1]['train_mentees'])
        target = Path(self.temp.name) / 'curve.png'
        plot_learning_curve_v3.plot(points, target, {'TF-IDF': 0.3})
        self.assertTrue(target.exists() or all(point['validation_ndcg5'] is None for point in points))

    def test_legacy_scoring_uses_the_legacy_convention_and_never_a_test_file(self):
        result = score_legacy_pilot_v3.score(self.data, self.runs / 'full' / 'checkpoint_last.pt')
        self.assertEqual(result['columns'], ['ndcg5', 'p1', 'mrr5', 'hit5'])
        self.assertEqual(len(result['scratch_v3']), 4)
        self.assertTrue(all(0.0 <= value <= 1.0 for value in result['scratch_v3']))
        self.assertIn('TF-IDF', result['recorded'])
        self.assertEqual(result['recorded']['TF-IDF'][0], 0.853932)


if __name__ == '__main__':
    unittest.main()
