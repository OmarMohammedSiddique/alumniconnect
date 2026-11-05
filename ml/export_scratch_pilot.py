"""Export the selected engineering checkpoint, never load data or retrain it.

Run with the pilot requirements plus onnx==1.20.1. The public export contains
weights, vocabulary, Unicode casefold rules and invented parity inputs only.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import onnx
import torch
from torch import nn

from train_scratch_pilot import Encoder, encode


class DualEncoder(nn.Module):
    def __init__(self, encoder):
        super().__init__()
        self.encoder = encoder

    def forward(self, tokens):
        return self.encoder(tokens, True), self.encoder(tokens, False)


def export(checkpoint_path, output):
    output.mkdir(parents=True, exist_ok=True)
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    vocab = checkpoint["vocabulary"]
    model = Encoder(len(vocab))
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    # Fixed 512-codepoint padding/truncation is part of the trained contract.
    target = output / "encoder.onnx"
    torch.onnx.export(
        DualEncoder(model).eval(), (encode(["Mentorship"], vocab),), target,
        input_names=["tokens"], output_names=["query", "mentor"],
        dynamic_axes={"tokens": {0: "batch"}, "query": {0: "batch"}, "mentor": {0: "batch"}},
        opset_version=17, dynamo=False,
    )
    onnx.checker.check_model(onnx.load(target))
    # JS lowercasing is not Python casefold. Preserve the exact trained mapping.
    casefold = {chr(i): chr(i).casefold() for i in range(sys.maxunicode + 1)
                if chr(i).casefold() != chr(i)}
    manifest = {
        "id": "scratch-pilot-v1", "dimensions": 64, "max_length": 512,
        "checkpoint_sha256": hashlib.sha256(checkpoint_path.read_bytes()).hexdigest(),
        "onnx_sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "vocabulary": vocab, "casefold": casefold,
        "human_reviewed": False, "engineering_pilot_only": True,
    }
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=True, indent=2) + "\n")
    examples = ["", "Skills: engineering", "Headline\nAviation mentor\nSkills: logistics, safety",
                "Straße İ Σς ﬃ 🛩️ 未知", "Career mentoring. " * 100]
    with torch.no_grad():
        query, mentor = DualEncoder(model)(encode(examples, vocab))
    fixtures = [{"text": value, "query": query[i].tolist(), "mentor": mentor[i].tolist()}
                for i, value in enumerate(examples)]
    (output / "parity.json").write_text(json.dumps(fixtures, indent=2) + "\n")
    print(json.dumps({k: v for k, v in manifest.items() if k not in ("vocabulary", "casefold")}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    export(args.checkpoint, args.output)
