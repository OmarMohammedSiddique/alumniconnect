"""Export a trained v3 checkpoint to ONNX with its tokeniser, manifest and parity fixtures.

Loads the checkpoint only: no data is read and nothing is retrained.

    python ml/export_scratch_v3.py ml/runs/<run>/checkpoint_best.pt ml/models/scratch-v3 [--lock ml/runs/<run>/LOCK.json]

Outputs: encoder.onnx (input `tokens` int64 [batch, max_length]; outputs `query` and `mentor`
float32 [batch, dimensions]), tokenizer.json, manifest.json and parity.json. The parity file
holds invented texts with the token ids and vectors PyTorch produced, so the Node application
can prove its tokeniser and runtime agree.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import onnx
import torch
from torch import nn

ML_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ML_DIR))
from train_scratch_v3 import load_checkpoint  # noqa: E402

MODEL_ID = "scratch-v3"
SIZE_LIMIT = 25 * 1024 * 1024
EXAMPLES = [
    "", "Skills: engineering", "Aircraft maintenance lead\nI help new technicians prepare for licence exams.\nSkills: hydraulics, inspection\nIndustry: Aviation",
    "Final-year student hoping to move into supply chain planning.\nSkills: spreadsheets\nIndustry: Logistics",
    "UPPER lower MiXeD C++ A/B x_y 3.5%", "Straße İ Σς ﬃ 🛩️ 未知 École", "Career mentoring and guidance. " * 80,
]


class DualEncoder(nn.Module):
    def __init__(self, encoder):
        super().__init__()
        self.encoder = encoder

    def forward(self, tokens):
        return self.encoder(tokens, True), self.encoder(tokens, False)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def export(checkpoint_path, output, lock_path=None):
    checkpoint_path, output = Path(checkpoint_path), Path(output)
    output.mkdir(parents=True, exist_ok=True)
    model, tokenizer, saved = load_checkpoint(checkpoint_path)
    dual = DualEncoder(model).eval()
    tokens = torch.tensor(tokenizer.encode(EXAMPLES), dtype=torch.long)
    target = output / "encoder.onnx"
    torch.onnx.export(dual, (tokens[:2],), target, input_names=["tokens"], output_names=["query", "mentor"],
                      dynamic_axes={"tokens": {0: "batch"}, "query": {0: "batch"}, "mentor": {0: "batch"}},
                      opset_version=17, dynamo=False)
    onnx.checker.check_model(onnx.load(target))
    if target.stat().st_size > SIZE_LIMIT:
        raise ValueError("exported model is over the 25 MB limit")
    tokenizer.save(output / "tokenizer.json")
    with torch.no_grad():
        query, mentor = dual(tokens)
    dimensions = query.shape[1]
    manifest = {
        "id": MODEL_ID, "dimensions": dimensions, "max_length": tokenizer.max_length,
        "vocabulary_size": len(tokenizer.vocabulary), "encoder": saved["config"]["encoder"], "width": saved["config"]["width"],
        "self_supervised_pretraining": saved["config"]["pretrain"], "seed": saved["seed"], "epoch": saved["epoch"],
        "parameters": sum(v.numel() for n, v in model.named_parameters() if n != "lm_bias"),
        "checkpoint_sha256": sha256(checkpoint_path), "onnx_sha256": sha256(target), "onnx_bytes": target.stat().st_size,
        "tokenizer_sha256": sha256(output / "tokenizer.json"), "input_fields": ["headline", "bio", "skills", "industry"],
        "trained_from_random_initialisation": True, "pretrained_components": [],
        "training_data": "synth-v3 (synthetic, generated labels, not human-reviewed)", "experimental": True,
    }
    if lock_path:
        manifest["lock_sha256"] = sha256(lock_path)
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    fixtures = [{"text": value, "tokens": tokenizer.ids(value), "query": query[i].tolist(), "mentor": mentor[i].tolist()}
                for i, value in enumerate(EXAMPLES)]
    (output / "parity.json").write_text(json.dumps(fixtures) + "\n")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("checkpoint")
    parser.add_argument("output")
    parser.add_argument("--lock")
    args = parser.parse_args()
    print(json.dumps(export(args.checkpoint, args.output, args.lock), indent=1))
