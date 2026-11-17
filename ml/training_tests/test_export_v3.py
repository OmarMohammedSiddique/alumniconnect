"""Checks for the v3 ONNX export, on a model trained on the invented dataset."""
from pathlib import Path
import json
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_scratch_v3 import CONFIG, SMALL, build_dataset
import export_scratch_v3
import train_scratch_v3 as v3


class ExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.data = build_dataset(Path(cls.temp.name) / 'data')
        cls.runs = Path(cls.temp.name) / 'runs'

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_export_writes_a_checked_model_manifest_and_parity_fixtures(self):
        import onnx
        for name, config in (('transformer', CONFIG), ('conv', {'encoder': 'conv', 'width': 16, 'pretrain': False})):
            v3.run(self.data, name, config, 42, device='cpu', overrides=SMALL, runs_root=self.runs)
            target = Path(self.temp.name) / f'export-{name}'
            manifest = export_scratch_v3.export(self.runs / name / 'checkpoint_last.pt', target)
            onnx.checker.check_model(onnx.load(target / 'encoder.onnx'))
            self.assertEqual(manifest['dimensions'], 64)
            self.assertEqual(manifest['pretrained_components'], [])
            self.assertEqual(manifest['onnx_sha256'], export_scratch_v3.sha256(target / 'encoder.onnx'))
            self.assertEqual(manifest['tokenizer_sha256'], export_scratch_v3.sha256(target / 'tokenizer.json'))
            fixtures = json.loads((target / 'parity.json').read_text())
            self.assertEqual(len(fixtures), len(export_scratch_v3.EXAMPLES))
            self.assertEqual(fixtures[0]['tokens'], [1])
            self.assertEqual(len(fixtures[-1]['tokens']), manifest['max_length'])
            self.assertEqual(len(fixtures[2]['query']), 64)
            self.assertNotEqual(fixtures[2]['query'], fixtures[2]['mentor'])


if __name__ == '__main__':
    unittest.main()
