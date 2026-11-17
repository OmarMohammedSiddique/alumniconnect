"""From-scratch mentorship encoder, version 3. Reads training and validation files only.

What changes from v1 and v2 (see docs/ml-scratch-v3.md):

- Data: the synth-v3 dataset (thousands of judged pairs, pools of about 45 candidates per
  training Mentee, 150 validation Mentees judged against the whole validation pool).
- Tokeniser: byte-pair encoding learned here from training profile text only.
- Encoder: a small Transformer or a convolutional encoder over token embeddings, every
  parameter randomly initialised. Separate Mentee (query) and Mentor heads without biases,
  L2 normalised output of 64 values. Nothing pretrained is loaded and nothing is distilled.
- Optional self-supervised pre-training: masked-token prediction on training profile text
  only, starting from the same random weights. It uses no labels and no outside data.
- Loss: a graded listwise (softmax) ranking loss. A training batch holds several Mentees and
  the Mentors sampled for them (graded positives and hard negatives); every Mentor in the
  batch is a candidate for every Mentee in it, with its true rule-based grade looked up in
  the complete training grade matrix. Nothing ungraded is ever treated as a negative.
- Against collapse: pooled features are centred across profiles separately for each role, the
  heads have no biases and both heads start from the same random matrix. Pooling is a learned
  weighted average of token features.
- Collapse check: after each epoch the share of score variance explained by the Mentor's
  average score is computed. Validation metrics of an epoch are only recorded when it passes.

The weights after every epoch depend on training data and the seed only. Validation grades
choose which epoch is kept as `checkpoint_best.pt` (selection on validation) but never change
the weight trajectory; `checkpoint_last.pt` and the logged weight hashes show this.

    python ml/train_scratch_v3.py ml/data/synth-v3 <run name> --encoder transformer --width 64 [--pretrain] [--seed 42]
"""
import argparse
import hashlib
import json
import math
import platform
import random
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

ML_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ML_DIR))
import bpe_tokenizer  # noqa: E402
import eval_v3  # noqa: E402
from baselines_v3 import split_roles, text  # noqa: E402
from ranker_features import load_jsonl  # noqa: E402  (refuses test split files)

RUNS_ROOT = ML_DIR / "runs"
# The fixed settings below (loss, pooling, centring, epochs, learning rate) were settled with
# smoke tests on a development split carved out of the TRAINING data only; no validation or test
# file was read while choosing them. docs/ml-scratch-v3.md lists those smoke tests.
# Grid fixed before the first v3 run and committed with this file. Eight configurations, one
# seed each (42); the two best by validation nDCG@5 are then repeated with all of SEEDS.
GRID = {"encoder": ("transformer", "conv"), "width": (64, 128), "pretrain": (False, True)}
SEEDS = (42, 43, 44)
FIXED = {
    "output": 64, "layers": 2, "heads": 4, "vocabulary_size": 3000, "max_length": 160, "dropout": 0.1,
    "token_dropout": 0.1, "learning_rate": 2e-3, "weight_decay": 0.01, "batch_queries": 16, "epochs": 40,
    "patience": 8, "logit_scale": 16.0, "warmup_steps": 50, "pretrain_epochs": 10, "pretrain_batch": 64,
    "mask_rate": 0.15, "time_limit_minutes": 24, "loss": "listwise", "pooling": "attention",
}


class Block(nn.Module):
    """Pre-norm Transformer block with its own attention, so the ONNX export stays simple."""

    def __init__(self, width, heads, dropout):
        super().__init__()
        self.heads = heads
        self.norm1, self.norm2 = nn.LayerNorm(width), nn.LayerNorm(width)
        self.qkv, self.out = nn.Linear(width, 3 * width), nn.Linear(width, width)
        self.feed = nn.Sequential(nn.Linear(width, 2 * width), nn.GELU(), nn.Linear(2 * width, width))
        self.drop = nn.Dropout(dropout)

    def forward(self, x, mask):
        batch, length, width = x.shape
        q, k, v = self.qkv(self.norm1(x)).view(batch, length, 3, self.heads, width // self.heads).permute(2, 0, 3, 1, 4)
        attention = (q @ k.transpose(-1, -2)) / math.sqrt(width // self.heads)
        attention = self.drop(attention.masked_fill(~mask[:, None, None, :], -1e4).softmax(-1))
        x = x + self.drop(self.out((attention @ v).transpose(1, 2).reshape(batch, length, width)))
        return x + self.drop(self.feed(self.norm2(x)))


class Encoder(nn.Module):
    """Token ids -> L2 normalised vector, with a Mentee (query) head and a Mentor head."""

    def __init__(self, vocabulary_size, encoder, width, max_length, output=64, layers=2, heads=4, dropout=0.1,
                 pooling="attention"):
        super().__init__()
        self.kind = encoder
        self.pooling = pooling
        self.attend = nn.Linear(width, 1, bias=False)  # one learned importance score per token
        self.embedding = nn.Embedding(vocabulary_size, width, padding_idx=0)
        self.drop = nn.Dropout(dropout)
        if encoder == "transformer":
            self.position = nn.Embedding(max_length, width)
            self.blocks = nn.ModuleList(Block(width, heads, dropout) for _ in range(layers))
        elif encoder == "conv":
            self.convs = nn.ModuleList(nn.Conv1d(width, width, size, padding=size // 2) for size in (1, 3, 5))
            self.mix = nn.Linear(3 * width, width)
        else:
            raise ValueError(f"unknown encoder {encoder!r}")
        # No learned offsets after pooling: v2-A collapsed when head biases outweighed the text signal.
        # Pooled features are centred and scaled across profiles, separately for each role. Without
        # this every Mentee vector shares one dominant direction, and the Mentor side can lower the
        # loss by scoring popular Mentors highly for everyone (seen in a smoke test on training data).
        self.query_norm = nn.BatchNorm1d(width, affine=False)
        self.mentor_norm = nn.BatchNorm1d(width, affine=False)
        self.query_head = nn.Linear(width, output, bias=False)
        self.mentor_head = nn.Linear(width, output, bias=False)
        # Both heads start from the same random matrix and then train separately. At the start the
        # same wording in a Mentee and a Mentor profile therefore already counts as similar, instead
        # of the model having to discover that from a few hundred Mentees.
        with torch.no_grad():
            self.mentor_head.weight.copy_(self.query_head.weight)
        self.lm_bias = nn.Parameter(torch.zeros(vocabulary_size))  # used by masked-token pre-training only

    def features(self, tokens):
        mask = tokens != 0
        x = self.drop(self.embedding(tokens))
        if self.kind == "transformer":
            x = x + self.position(torch.arange(tokens.shape[1], device=tokens.device))[None]
            for block in self.blocks:
                x = block(x, mask)
        else:
            channels = x.transpose(1, 2)
            x = self.mix(torch.cat([F.relu(conv(channels)) for conv in self.convs], dim=1).transpose(1, 2))
        return x, mask

    def pooled(self, tokens):
        x, mask = self.features(tokens)
        weights = mask[:, :, None].to(x.dtype)
        if self.pooling == "attention":
            # Weighted average: the model learns which tokens matter, instead of counting all equally.
            share = (self.attend(x) - (1 - weights) * 1e4).softmax(1)
            mean = (x * share).sum(1)
        else:
            mean = (x * weights).sum(1) / weights.sum(1).clamp(min=1)
        if self.kind == "conv":
            mean = mean + (x - (1 - weights) * 1e4).amax(1)
        return mean

    def forward(self, tokens, query):
        pooled = self.pooled(tokens)
        if query:
            return F.normalize(self.query_head(self.query_norm(pooled)), dim=1)
        return F.normalize(self.mentor_head(self.mentor_norm(pooled)), dim=1)

    def lm_logits(self, tokens):
        x, _ = self.features(tokens)
        return x @ self.embedding.weight.T + self.lm_bias


def ranking_loss(scores, grades):
    """Graded pairwise logistic loss over one judged pool. Zero when no two grades differ."""
    gap = (grades[:, None] - grades[None, :]).clamp(min=0).to(scores.dtype)
    if float(gap.sum()) == 0:
        return scores.sum() * 0
    return (gap * F.softplus(scores[None, :] - scores[:, None])).sum() / gap.sum()


def listwise_loss(scores, grades):
    """Graded softmax (contrastive) loss for a batch of Mentees. scores, grades: [queries, candidates].

    Each Mentee's target is a distribution over the candidates in proportion to the gain
    2**grade - 1, so grade 3 Mentors pull hardest, and every grade 0 candidate is a negative.
    Mentees with no graded candidate in the batch contribute nothing.
    """
    gain = (2.0 ** grades.to(scores.dtype)) - 1
    total = gain.sum(1, keepdim=True)
    has_gain = total.squeeze(1) > 0
    if not bool(has_gain.any()):
        return scores.sum() * 0
    target = gain / total.clamp(min=1e-9)
    return -(target * F.log_softmax(scores, dim=1)).sum(1)[has_gain].mean()


def pairwise_loss(scores, grades):
    """Mean of `ranking_loss` over a batch of Mentees."""
    return torch.stack([ranking_loss(scores[row], grades[row]) for row in range(len(scores))]).mean()


LOSSES = {"listwise": listwise_loss, "pairwise": pairwise_loss}


def trim(tokens):
    """Drop padding columns that no row in the batch uses."""
    return tokens[:, :max(1, int((tokens != 0).sum(1).max()))]


def encode_all(model, tokens, query, batch=256):
    model.eval()
    with torch.no_grad():
        return torch.cat([model(trim(tokens[start:start + batch]), query) for start in range(0, len(tokens), batch)])


def pools_from_pairs(pairs):
    pools = {}
    for pair in pairs:
        pools.setdefault(pair["mentee_id"], []).append((pair["mentor_id"], pair["relevance_score"]))
    return {mentee: sorted(pool) for mentee, pool in sorted(pools.items())}


def weight_hash(model):
    digest = hashlib.sha256()
    for name, value in sorted(model.state_dict().items()):
        digest.update(name.encode())
        digest.update(value.detach().cpu().numpy().tobytes())
    return digest.hexdigest()


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def git_state():
    def run(*args):
        return subprocess.run(["git", *args], cwd=ML_DIR, capture_output=True, text=True).stdout.strip()
    return {"commit": run("rev-parse", "HEAD"), "ml_folder_dirty": bool(run("status", "--porcelain", "--", "."))}


def pick_device(name):
    if name != "auto":
        return torch.device(name)
    return torch.device("mps" if torch.backends.mps.is_available() else "cpu")


def fit_tokenizer(texts, settings, cache_dir=None):
    """Train the tokeniser on training text. A cache keyed by the exact text avoids retraining per run."""
    key = hashlib.sha256(json.dumps([settings["vocabulary_size"], settings["max_length"], texts]).encode()).hexdigest()[:16]
    cached = Path(cache_dir) / f"tokenizer-{key}.json" if cache_dir else None
    if cached and cached.exists():
        return bpe_tokenizer.Tokenizer.load(cached)
    tokenizer = bpe_tokenizer.Tokenizer(bpe_tokenizer.train(texts, settings["vocabulary_size"], settings["max_length"]))
    if cached:
        cached.parent.mkdir(parents=True, exist_ok=True)
        tokenizer.save(cached)
    return tokenizer


def pretrain(model, tokens, settings, seed, device, log):
    """Masked-token prediction on training profile text. Self-supervised: no labels, no outside data."""
    generator = torch.Generator().manual_seed(seed + 1000)
    optimiser = torch.optim.AdamW(model.parameters(), lr=settings["learning_rate"], weight_decay=settings["weight_decay"])
    vocabulary_size, mask_id = model.embedding.num_embeddings, 2
    for epoch in range(1, settings["pretrain_epochs"] + 1):
        model.train()
        order = torch.randperm(len(tokens), generator=generator)
        total, steps = 0.0, 0
        for start in range(0, len(order), settings["pretrain_batch"]):
            batch = trim(tokens[order[start:start + settings["pretrain_batch"]]])
            chosen = (torch.rand(batch.shape, generator=generator) < settings["mask_rate"]) & (batch != 0)
            if not bool(chosen.any()):
                continue
            action = torch.rand(batch.shape, generator=generator)
            noisy = batch.clone()
            noisy[chosen & (action < 0.8)] = mask_id
            swap = chosen & (action >= 0.8) & (action < 0.9)
            noisy[swap] = torch.randint(3, vocabulary_size, (int(swap.sum()),), generator=generator)
            logits = model.lm_logits(noisy.to(device))
            loss = F.cross_entropy(logits[chosen.to(device)], batch.to(device)[chosen.to(device)])
            optimiser.zero_grad()
            loss.backward()
            optimiser.step()
            total, steps = total + float(loss.detach()), steps + 1
        log.append({"stage": "pretrain", "epoch": epoch, "masked_token_loss": total / max(1, steps)})


def validation_scores(model, data, device):
    queries = encode_all(model, data["val_mentee_tokens"].to(device), True)
    mentors = encode_all(model, data["val_mentor_tokens"].to(device), False)
    return (queries @ mentors.T).cpu()


def validation_report(matrix, data, settings):
    scores = eval_v3.scores_from_matrix(matrix.tolist(), data["val_mentee_ids"], data["val_mentor_ids"])
    collapse = eval_v3.collapse_check(scores, data["val_labels"])
    loss = float(LOSSES[settings["loss"]](matrix * settings["logit_scale"], data["val_grades"]))
    return scores, collapse, loss


def load_data(data_dir, tokenizer_cache, settings, train_fraction, seed):
    data_dir = Path(data_dir)
    train_profiles = load_jsonl(data_dir / "train_profiles.jsonl")
    train_pairs = load_jsonl(data_dir / "train_pairs.jsonl")
    val_profiles = load_jsonl(data_dir / "validation_profiles.jsonl")
    val_pairs = load_jsonl(data_dir / "validation_pairs.jsonl")
    if any(p["split"] != "train" for p in train_profiles) or any(p["split"] != "validation" for p in val_profiles):
        raise ValueError("profile files hold the wrong split")
    pools = pools_from_pairs(train_pairs)
    complete = json.loads((data_dir / "train_grades.json").read_text(encoding="utf-8"))
    if train_fraction < 1:
        keep = sorted(random.Random(seed + 500).sample(sorted(pools), max(2, round(len(pools) * train_fraction))))
        pools = {mentee: pools[mentee] for mentee in keep}
        used = set(pools) | {mentor for pool in pools.values() for mentor, _ in pool}
        train_profiles = [profile for profile in train_profiles if profile["person_id"] in used]
    by_id = {profile["person_id"]: profile for profile in train_profiles}
    tokenizer = fit_tokenizer([text(profile) for profile in train_profiles], settings, tokenizer_cache)
    encode = lambda profiles: torch.tensor(tokenizer.encode([text(profile) for profile in profiles]), dtype=torch.long)
    train_ids = sorted(by_id)
    row_of = {mentee: row for row, mentee in enumerate(complete["mentees"])}
    column_of = {mentor: column for column, mentor in enumerate(complete["mentors"])}
    if set(pools) - set(row_of) or {mentor for pool in pools.values() for mentor, _ in pool} - set(column_of):
        raise ValueError("train_grades.json does not cover the training pairs")
    for mentee, pool in pools.items():
        if any(int(complete["rows"][row_of[mentee]][column_of[mentor]]) != score for mentor, score in pool):
            raise ValueError("train_grades.json disagrees with train_pairs.jsonl")
    val_mentees, val_mentors = split_roles(val_profiles)
    labels = eval_v3.labels_from_pairs(val_pairs)
    val_mentee_ids = [p["person_id"] for p in val_mentees]
    val_mentor_ids = [p["person_id"] for p in val_mentors]
    return {
        "tokenizer": tokenizer, "pools": pools, "train_index": {person: i for i, person in enumerate(train_ids)},
        "grade_rows": {mentee: complete["rows"][row_of[mentee]] for mentee in pools}, "grade_columns": column_of,
        "train_tokens": encode([by_id[person] for person in train_ids]),
        "val_mentee_tokens": encode(val_mentees), "val_mentor_tokens": encode(val_mentors),
        "val_mentee_ids": val_mentee_ids, "val_mentor_ids": val_mentor_ids, "val_labels": labels,
        "val_grades": torch.tensor([[labels[q][m] for m in val_mentor_ids] for q in val_mentee_ids]),
        "counts": {"train_profiles": len(train_profiles), "train_mentees": len(pools),
                   "train_pairs": sum(len(pool) for pool in pools.values()),
                   "validation_mentees": len(val_mentees), "validation_mentors": len(val_mentors)},
        "hashes": {name: file_hash(data_dir / name) for name in ("train_profiles.jsonl", "train_pairs.jsonl",
                                                                  "validation_profiles.jsonl", "validation_pairs.jsonl",
                                                                  "train_grades.json")},
    }


def train_model(data, config, settings, seed, device):
    """Train one model. Returns (model, log, best) where best holds the kept epoch and its state."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    tokenizer = data["tokenizer"]
    model = Encoder(len(tokenizer.vocabulary), config["encoder"], config["width"], settings["max_length"],
                    settings["output"], settings["layers"], settings["heads"], settings["dropout"], settings["pooling"]).to(device)
    log, started = [], time.perf_counter()
    if config["pretrain"]:
        pretrain(model, data["train_tokens"], settings, seed, device, log)
    optimiser = torch.optim.AdamW(model.parameters(), lr=settings["learning_rate"], weight_decay=settings["weight_decay"])
    mentees = sorted(data["pools"])
    steps_per_epoch = math.ceil(len(mentees) / settings["batch_queries"])
    total_steps = steps_per_epoch * settings["epochs"]
    schedule = lambda step: min(1.0, (step + 1) / settings["warmup_steps"]) * (
        0.1 + 0.45 * (1 + math.cos(math.pi * min(1.0, step / total_steps))))
    shuffler, noise = random.Random(seed), torch.Generator().manual_seed(seed)
    index, tokens = data["train_index"], data["train_tokens"]
    best, step, stale = None, 0, 0
    for epoch in range(1, settings["epochs"] + 1):
        model.train()
        order = mentees[:]
        shuffler.shuffle(order)
        epoch_loss, batches = 0.0, 0
        for start in range(0, len(order), settings["batch_queries"]):
            batch = order[start:start + settings["batch_queries"]]
            if len(batch) < 2:
                continue  # centring across the batch needs at least two Mentees
            mentors = sorted({mentor for mentee in batch for mentor, _ in data["pools"][mentee]})

            def noisy(ids):
                rows = trim(tokens[[index[person] for person in ids]]).clone()
                drop = (torch.rand(rows.shape, generator=noise) < settings["token_dropout"]) & (rows != 0)
                rows[drop] = 2  # the mask token doubles as input noise
                return rows.to(device)

            # Every Mentor in the batch is a candidate for every Mentee in it, with its true grade
            # from the complete training matrix. Nothing ungraded is used.
            grades = torch.tensor([[int(data["grade_rows"][mentee][data["grade_columns"][mentor]]) for mentor in mentors]
                                   for mentee in batch], device=device)
            scores = model(noisy(batch), True) @ model(noisy(mentors), False).T
            loss = LOSSES[settings["loss"]](scores * settings["logit_scale"], grades)
            for group in optimiser.param_groups:
                group["lr"] = settings["learning_rate"] * schedule(step)
            optimiser.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimiser.step()
            epoch_loss, batches, step = epoch_loss + float(loss.detach()), batches + 1, step + 1
        matrix = validation_scores(model, data, device)
        scores, collapse, validation_loss = validation_report(matrix, data, settings)
        passed = collapse["passed"]
        entry = {"stage": "train", "epoch": epoch, "train_loss": epoch_loss / batches, "validation_loss": validation_loss,
                 "collapse_share": collapse["mentor_mean_variance_share"], "collapse_passed": passed,
                 # Metrics of a collapsed epoch are not recorded, so they cannot be read or selected.
                 "validation_ndcg5": collapse["ndcg5"] if passed else None,
                 "seconds": round(time.perf_counter() - started, 1), "weights_sha256": weight_hash(model)}
        log.append(entry)
        if passed and (best is None or entry["validation_ndcg5"] > best["validation_ndcg5"]):
            best = {"epoch": epoch, "validation_ndcg5": entry["validation_ndcg5"], "collapse": collapse, "scores": scores,
                    "state": {name: value.detach().cpu().clone() for name, value in model.state_dict().items()}}
            stale = 0
        else:
            stale += 1
        if stale >= settings["patience"] or time.perf_counter() - started > settings["time_limit_minutes"] * 60:
            break
    return model, log, best


def save_curves(log, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    rows = [entry for entry in log if entry["stage"] == "train"]
    pre = [entry for entry in log if entry["stage"] == "pretrain"]
    figure, axes = plt.subplots(1, 3 if pre else 2, figsize=(13 if pre else 9, 3.6))
    epochs = [entry["epoch"] for entry in rows]
    axes[0].plot(epochs, [entry["train_loss"] for entry in rows], label="training")
    axes[0].plot(epochs, [entry["validation_loss"] for entry in rows], label="validation")
    axes[0].set(xlabel="epoch", ylabel="ranking loss", title="Loss per epoch")
    axes[0].legend()
    axes[1].plot(epochs, [entry["validation_ndcg5"] if entry["validation_ndcg5"] is not None else float("nan") for entry in rows])
    axes[1].set(xlabel="epoch", ylabel="validation nDCG@5", title="Validation nDCG@5 per epoch")
    if pre:
        axes[2].plot([entry["epoch"] for entry in pre], [entry["masked_token_loss"] for entry in pre])
        axes[2].set(xlabel="pre-training epoch", ylabel="masked-token loss", title="Self-supervised pre-training")
    figure.tight_layout()
    figure.savefig(path, dpi=130)
    plt.close(figure)


def run(data_dir, run_name, config, seed=42, train_fraction=1.0, device="auto", overrides=None, runs_root=RUNS_ROOT):
    settings = {**FIXED, **(overrides or {})}
    output = Path(runs_root) / run_name
    if output.exists():
        raise FileExistsError(f"{output} exists; runs are never overwritten")
    device = pick_device(device)
    if device.type == "cpu":
        torch.use_deterministic_algorithms(True)
    started = time.perf_counter()
    data = load_data(data_dir, Path(runs_root) / "_tokenizer_cache", settings, train_fraction, seed)
    model, log, best = train_model(data, config, settings, seed, device)
    output.mkdir(parents=True)
    data["tokenizer"].save(output / "tokenizer.json")
    parameters = sum(value.numel() for name, value in model.named_parameters() if name != "lm_bias")
    checkpoint = {"config": config, "settings": settings, "seed": seed, "tokenizer": data["tokenizer"].payload}
    torch.save({**checkpoint, "state_dict": {k: v.detach().cpu() for k, v in model.state_dict().items()},
                "epoch": log[-1]["epoch"]}, output / "checkpoint_last.pt")
    record = {
        "run": run_name, "created_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "config": config,
        "settings": settings, "seed": seed, "train_fraction": train_fraction, "device": device.type, **git_state(),
        "data": {"folder": Path(data_dir).name, "sha256": data["hashes"], "counts": data["counts"]},
        "tokenizer_sha256": file_hash(output / "tokenizer.json"), "vocabulary": len(data["tokenizer"].vocabulary),
        "parameters": parameters, "random_initialisation_only": True, "pretrained_components": [],
        "environment": {"python": platform.python_version(), "torch": torch.__version__, "numpy": np.__version__,
                        "platform": platform.platform()},
        "seconds_total": round(time.perf_counter() - started, 1), "epochs_run": log[-1]["epoch"],
    }
    if best is None:
        record["status"] = "collapsed: no epoch passed the collapse check, so no validation metric is reported"
    else:
        torch.save({**checkpoint, "state_dict": best["state"], "epoch": best["epoch"]}, output / "checkpoint_best.pt")
        rows = eval_v3.evaluate(best["scores"], data["val_labels"])
        (output / "validation_rankings.json").write_text(json.dumps(rows) + "\n")
        record.update({"status": "ok", "best_epoch": best["epoch"], "collapse": best["collapse"],
                       "checkpoint_best_sha256": file_hash(output / "checkpoint_best.pt"),
                       "validation": eval_v3.summarise(rows)})
    record["checkpoint_last_sha256"] = file_hash(output / "checkpoint_last.pt")
    (output / "log.json").write_text(json.dumps(log, indent=1) + "\n")
    (output / "run.json").write_text(json.dumps(record, indent=1) + "\n")
    save_curves(log, output / "loss_curves.png")
    return record


def load_checkpoint(path):
    """Rebuild the model and tokeniser from a checkpoint file alone."""
    saved = torch.load(path, map_location="cpu", weights_only=True)
    tokenizer = bpe_tokenizer.Tokenizer(saved["tokenizer"])
    settings, config = saved["settings"], saved["config"]
    model = Encoder(len(tokenizer.vocabulary), config["encoder"], config["width"], settings["max_length"],
                    settings["output"], settings["layers"], settings["heads"], settings["dropout"], settings["pooling"])
    model.load_state_dict(saved["state_dict"])
    return model.eval(), tokenizer, saved


def embed_profiles(model, tokenizer, profiles, query):
    return encode_all(model, torch.tensor(tokenizer.encode([text(profile) for profile in profiles]), dtype=torch.long), query)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir")
    parser.add_argument("run_name")
    parser.add_argument("--encoder", choices=GRID["encoder"], required=True)
    parser.add_argument("--width", type=int, choices=GRID["width"], required=True)
    parser.add_argument("--pretrain", action="store_true")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--train-fraction", type=float, default=1.0)
    parser.add_argument("--device", default="auto")
    args = parser.parse_args()
    record = run(args.data_dir, args.run_name, {"encoder": args.encoder, "width": args.width, "pretrain": args.pretrain},
                 args.seed, args.train_fraction, args.device)
    summary = {key: record.get(key) for key in ("run", "status", "best_epoch", "epochs_run", "parameters", "seconds_total")}
    if record["status"] == "ok":
        summary["validation_ndcg5"] = record["validation"]["ndcg5"]["mean"]
        summary["collapse_share"] = record["collapse"]["mentor_mean_variance_share"]
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
