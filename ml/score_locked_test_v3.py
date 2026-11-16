"""Score the test split once, for every system, after the lock is committed.

    python ml/score_locked_test_v3.py ml/data/synth-v3 ml/runs/<run>

Refuses to run unless LOCK.json is committed in Git and unchanged, the checkpoint, tokeniser
and test files match the hashes in the lock, and no earlier test result exists. This is the
only script that opens `test_*.jsonl` files for scoring.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent
REPO = ML_DIR.parent
sys.path.insert(0, str(ML_DIR))
import baselines_v3  # noqa: E402
import eval_v3  # noqa: E402
from train_scratch_v3 import embed_profiles, load_checkpoint  # noqa: E402

SYSTEMS = ("tfidf", "bm25", "minilm", "scratch_v3")


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def check_lock(data_dir, run_dir):
    """Return the lock after proving it is committed and still describes the files on disk."""
    lock_path = run_dir / "LOCK.json"
    if not lock_path.exists():
        raise SystemExit("no LOCK.json: the test split stays closed")
    try:
        relative = lock_path.resolve().relative_to(REPO.resolve())
    except ValueError:
        raise SystemExit("LOCK.json must be inside the repository so that it can be committed")
    git = lambda *args: subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True)
    if git("ls-files", "--error-unmatch", str(relative)).returncode != 0:
        raise SystemExit("LOCK.json is not tracked by Git: commit it first")
    if git("status", "--porcelain", "--", str(relative)).stdout.strip():
        raise SystemExit("LOCK.json has uncommitted changes")
    lock = json.loads(lock_path.read_text())
    if sha256(run_dir / "checkpoint_best.pt") != lock["model"]["sha256"]:
        raise SystemExit("checkpoint does not match the lock")
    if sha256(run_dir / "tokenizer.json") != lock["model"]["tokenizer_sha256"]:
        raise SystemExit("tokeniser does not match the lock")
    for name, expected in lock["data"]["test_files"].items():
        if sha256(data_dir / name) != expected:
            raise SystemExit(f"{name} does not match the lock")
    lock["lock_commit"] = git("log", "-1", "--format=%H", "--", str(relative)).stdout.strip()
    return lock


def scratch_scores(run_dir, mentees, mentors):
    model, tokenizer, _ = load_checkpoint(run_dir / "checkpoint_best.pt")
    queries, documents = embed_profiles(model, tokenizer, mentees, True), embed_profiles(model, tokenizer, mentors, False)
    return baselines_v3.as_scores((queries @ documents.T).tolist(), mentees, mentors)


def minilm_vectors(profile_path, target):
    done = subprocess.run(["node", "--conditions=react-server", "--experimental-strip-types",
                           "scripts/eval/embed-minilm-profiles.mjs", str(Path(profile_path).resolve()), str(target.resolve())],
                          cwd=REPO, capture_output=True, text=True)
    if done.returncode != 0:
        raise SystemExit("MiniLM embedding failed: " + done.stderr[-400:])
    return json.loads(target.read_text())


def score(data_dir, run_dir):
    data_dir, run_dir = Path(data_dir), Path(run_dir)
    output = run_dir / "test"
    if output.exists():
        raise SystemExit("a test result already exists: the test split is scored once only")
    lock = check_lock(data_dir, run_dir)
    output.mkdir()
    train_profiles = eval_v3.load_jsonl(data_dir / "train_profiles.jsonl")
    profiles = eval_v3.load_jsonl(data_dir / "test_profiles.jsonl")
    labels = eval_v3.labels_from_pairs(eval_v3.load_jsonl(data_dir / "test_pairs.jsonl"))
    tags = {row["mentee_id"]: row["tags"] for row in eval_v3.load_jsonl(data_dir / "test_queries.jsonl")}
    mentees, mentors = baselines_v3.split_roles(profiles)
    minilm = minilm_vectors(data_dir / "test_profiles.jsonl", output / "minilm_vectors.json")
    scores = {
        "tfidf": baselines_v3.tfidf_scores(train_profiles, mentees, mentors),
        "bm25": baselines_v3.bm25_scores(train_profiles, mentees, mentors),
        "minilm": baselines_v3.vector_scores(minilm["vectors"], mentees, mentors),
        "scratch_v3": scratch_scores(run_dir, mentees, mentors),
    }
    rows = {name: eval_v3.evaluate(scores[name], labels) for name in SYSTEMS}
    subsets = {name: {mentee for mentee, found in tags.items() if name in found}
               for name in sorted({tag for found in tags.values() for tag in found})}
    report = {
        "scored_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "lock_commit": lock["lock_commit"],
        "lock_sha256": sha256(run_dir / "LOCK.json"), "queries": len(mentees), "pool": len(mentors),
        "grade_counts": {str(g): sum(1 for pool in labels.values() for v in pool.values() if v == g) for g in range(4)},
        "subset_sizes": {name: len(members) for name, members in subsets.items()},
        "random": eval_v3.random_baseline(labels),
        "systems": {name: {"subsets": eval_v3.subset_report(rows[name], tags),
                           "collapse": eval_v3.collapse_check(scores[name], labels)} for name in SYSTEMS},
        "paired": {},
    }
    for other in ("minilm", "tfidf", "bm25"):
        report["paired"][f"scratch_v3_minus_{other}"] = {
            subset: {metric: eval_v3.paired_difference(rows["scratch_v3"], rows[other], metric, members)
                     for metric in eval_v3.METRICS}
            for subset, members in [("all", None), *subsets.items()]}
    for name in SYSTEMS:
        (output / f"{name}_rankings.json").write_text(json.dumps(rows[name]) + "\n")
    (output / "test_results.json").write_text(json.dumps(report, indent=1) + "\n")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir")
    parser.add_argument("run_dir")
    args = parser.parse_args()
    result = score(args.data_dir, args.run_dir)
    print(f"{'system':11s} " + " ".join(f"{metric:>7s}" for metric in eval_v3.METRICS))
    print(f"{'random':11s} " + " ".join(f"{result['random'][metric]['mean']:7.4f}" for metric in eval_v3.METRICS))
    for name in SYSTEMS:
        print(f"{name:11s} " + " ".join(f"{result['systems'][name]['subsets']['all'][metric]['mean']:7.4f}" for metric in eval_v3.METRICS))
    for other, found in result["paired"].items():
        print(other, found["all"]["ndcg5"])
