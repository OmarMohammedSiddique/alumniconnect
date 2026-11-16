"""Score a v3 checkpoint on the old five-query `pilot-machine-v1` validation pools (legacy reference).

    python ml/score_legacy_pilot_v3.py ml/data/pilot-machine-v1 ml/runs/<run>/checkpoint_best.pt <output.json>

This is a tiny legacy set (5 Mentees, 10 Mentors, unreviewed machine labels from a different
generator). It is reported beside the recorded v1, v2 and TF-IDF figures for continuity only.
Metrics use the legacy convention of the earlier write-ups (undefined values count as 0).
The pilot test split stays unopened: the loader refuses any test file.
"""
import argparse
import json
import sys
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ML_DIR))
import baselines_v3  # noqa: E402
import eval_v3  # noqa: E402
from ranker_features import load_jsonl  # noqa: E402  (refuses test split files)
from train_scratch_v3 import embed_profiles, load_checkpoint  # noqa: E402

RECORDED = {  # nDCG@5, P@1, MRR@5, hit@5 as written in docs/ml-scratch-v2.md and docs/ml-gbdt-ranker.md
    "random (mean of 100 seeds)": [0.324875, 0.136, 0.276, 0.568],
    "TF-IDF": [0.853932, 0.800, 0.840, 1.000],
    "v1 character CNN": [0.502278, 0.200, 0.433, 0.800],
    "GBDT ranker": [0.615413, 0.400, 0.567, 0.800],
    "v2-A bag encoder (mean of 5 seeds)": [0.301, 0.080, 0.244, 0.560],
    "v2-B reweighted TF-IDF": [0.862697, 0.800, 0.850, 1.000],
}


def score(data_dir, checkpoint):
    data_dir = Path(data_dir)
    profiles = load_jsonl(data_dir / "validation_profiles.jsonl")
    labels = eval_v3.labels_from_pairs(load_jsonl(data_dir / "validation_pairs.jsonl"))
    mentees, mentors = baselines_v3.split_roles(profiles)
    model, tokenizer, _ = load_checkpoint(checkpoint)
    matrix = embed_profiles(model, tokenizer, mentees, True) @ embed_profiles(model, tokenizer, mentors, False).T
    scores = baselines_v3.as_scores(matrix.tolist(), mentees, mentors)
    rows = eval_v3.evaluate(scores, labels, legacy=True)
    figures = [eval_v3.mean_of(rows, metric)[0] for metric in ("ndcg5", "p1", "mrr5", "hit5")]
    train_profiles = load_jsonl(data_dir / "train_profiles.jsonl")
    tfidf = eval_v3.evaluate(baselines_v3.tfidf_scores(train_profiles, mentees, mentors), labels, legacy=True)
    return {"set": "pilot-machine-v1 validation, 5 Mentees by 10 Mentors, unreviewed machine labels (legacy)",
            "columns": ["ndcg5", "p1", "mrr5", "hit5"], "recorded": RECORDED, "scratch_v3": figures,
            "tfidf_recomputed_with_pilot_training_text": [eval_v3.mean_of(tfidf, m)[0] for m in ("ndcg5", "p1", "mrr5", "hit5")],
            "per_mentee_ndcg5": {row["mentee_id"]: row["ndcg5"] for row in rows},
            "collapse_share": eval_v3.collapse_share(scores)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir")
    parser.add_argument("checkpoint")
    parser.add_argument("output")
    args = parser.parse_args()
    result = score(args.data_dir, args.checkpoint)
    Path(args.output).write_text(json.dumps(result, indent=1) + "\n")
    print(json.dumps({key: result[key] for key in ("scratch_v3", "tfidf_recomputed_with_pilot_training_text", "collapse_share")}))
