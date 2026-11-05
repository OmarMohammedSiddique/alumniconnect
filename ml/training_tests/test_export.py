"""Exercise the patched ONNX exporter using invented weights and inputs only."""
import contextlib
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
import onnx
from onnx.reference import ReferenceEvaluator
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from export_scratch_pilot import export
from train_scratch_pilot import Encoder, encode, vocabulary


class ExportTests(unittest.TestCase):
    def test_export_preserves_both_heads_and_dynamic_batch(self):
        with tempfile.TemporaryDirectory() as directory, torch.random.fork_rng():
            root = Path(directory)
            torch.manual_seed(42)
            vocab = vocabulary(["Mentorship engineering safety Straße İ Σς ﬃ"])
            encoder = Encoder(len(vocab)).eval()
            checkpoint = root / "synthetic.pt"
            torch.save({"vocabulary": vocab, "state_dict": encoder.state_dict()}, checkpoint)
            output = root / "export"
            with contextlib.redirect_stdout(io.StringIO()):
                export(checkpoint, output)

            graph = onnx.load(output / "encoder.onnx")
            onnx.checker.check_model(graph, full_check=True)
            self.assertEqual(graph.opset_import[0].version, 17)
            self.assertEqual(graph.graph.input[0].type.tensor_type.shape.dim[0].dim_param, "batch")
            self.assertTrue(all(not tensor.external_data for tensor in graph.graph.initializer))
            manifest = json.loads((output / "manifest.json").read_text())
            self.assertEqual(manifest["onnx_sha256"], hashlib.sha256((output / "encoder.onnx").read_bytes()).hexdigest())
            self.assertEqual(manifest["vocabulary"], vocab)
            self.assertEqual(manifest["casefold"]["ß"], "ss")

            fixtures = json.loads((output / "parity.json").read_text())
            evaluator = ReferenceEvaluator(graph)
            # Single and multi-row batches include empty, sparse, Unicode,
            # unknown and truncated long input from the exporter fixtures.
            for batch in [fixtures[:1], fixtures]:
                tokens = encode([row["text"] for row in batch], vocab)
                actual = evaluator.run(None, {"tokens": tokens.numpy()})
                for index, head in enumerate(["query", "mentor"]):
                    with self.subTest(batch=len(batch), head=head), torch.no_grad():
                        expected = encoder(tokens, head == "query").numpy()
                        self.assertEqual(actual[index].shape, (len(batch), 64))
                        self.assertTrue(np.isfinite(actual[index]).all())
                        np.testing.assert_allclose(actual[index], expected, atol=1e-5, rtol=0)
                        np.testing.assert_allclose(actual[index], [row[head] for row in batch], atol=1e-5, rtol=0)


if __name__ == "__main__":
    unittest.main()
