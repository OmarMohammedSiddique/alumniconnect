"""Write LOCK.json for the selected v3 run. It must be committed before the test split is scored.

    python ml/lock_v3.py ml/data/synth-v3 ml/runs/<run> --selection ml/runs/<selection file>

The lock records what is frozen: the checkpoint, its configuration, the code commit, the data
manifest and the evaluation protocol. After it is committed nothing about the model, the data
or the protocol may change; `ml/score_locked_test_v3.py` checks the hashes and refuses to run
twice.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ML_DIR))
import eval_v3  # noqa: E402

PROTOCOL = {
    "systems": ["random (100 seeds)", "tfidf char 3 to 5 grams fitted on training profiles", "bm25 fitted on training profiles",
                "minilm frozen, as deployed (Xenova/all-MiniLM-L6-v2, q8)", "scratch-v3 locked checkpoint"],
    "pool": "every test Mentee against every test Mentor (complete judgements)",
    "metrics": list(eval_v3.METRICS),
    "primary_metric": "ndcg5",
    "relevant_grade": eval_v3.RELEVANT,
    "undefined_queries": "left out of the mean of a metric that is undefined for them; counts reported",
    "intervals": f"percentile bootstrap over Mentees, {eval_v3.BOOTSTRAP_SAMPLES} resamples, seed {eval_v3.BOOTSTRAP_SEED}",
    "paired_differences": ["scratch-v3 minus minilm", "scratch-v3 minus tfidf"],
    "wording_rule": "'better than' only when the paired 95% interval excludes zero, otherwise 'not distinguishable'",
    "subsets": ["all", "seen_occupation", "unseen_occupation", "vocabulary_mismatch", "sparse", "career_changer",
                "no_suitable_mentor"],
    "test_split_use": "scored exactly once, after this file is committed",
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_lock(data_dir, run_dir, selection=None):
    data_dir, run_dir = Path(data_dir), Path(run_dir)
    target = run_dir / "LOCK.json"
    if target.exists():
        raise FileExistsError("LOCK.json already exists; a lock is never rewritten")
    record = json.loads((run_dir / "run.json").read_text())
    manifest = json.loads((data_dir / "manifest.json").read_text())
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ML_DIR, capture_output=True, text=True).stdout.strip()
    lock = {
        "locked_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "run": record["run"],
        "model": {"checkpoint": "checkpoint_best.pt", "sha256": sha256(run_dir / "checkpoint_best.pt"),
                  "tokenizer_sha256": sha256(run_dir / "tokenizer.json"), "config": record["config"],
                  "settings": record["settings"], "seed": record["seed"], "best_epoch": record["best_epoch"],
                  "parameters": record["parameters"], "training_commit": record["commit"]},
        "lock_commit_parent": commit,
        "data": {"dataset": manifest["dataset"], "manifest_sha256": sha256(data_dir / "manifest.json"),
                 "test_files": {name: manifest["files"][name]["sha256"] for name in
                                ("test_profiles.jsonl", "test_pairs.jsonl", "test_queries.jsonl")}},
        "selection_sha256": sha256(selection) if selection else None,
        "validation_ndcg5": record["validation"]["ndcg5"]["mean"],
        "protocol": PROTOCOL,
    }
    target.write_text(json.dumps(lock, indent=1) + "\n")
    return lock


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir")
    parser.add_argument("run_dir")
    parser.add_argument("--selection")
    args = parser.parse_args()
    print(json.dumps(write_lock(args.data_dir, args.run_dir, args.selection), indent=1))
