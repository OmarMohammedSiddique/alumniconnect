"""Baselines for synth-v3, scored with the shared evaluator: random, TF-IDF, BM25 and frozen MiniLM.

Fitted statistics (TF-IDF vocabulary and weights, BM25 document frequencies and average
length) come from training profiles only. MiniLM vectors are produced by the Node script
`scripts/eval/embed-minilm-profiles.mjs`, which imports the deployed embedding module, and are
only read here. MiniLM is a reference system: it never labels, filters or selects anything.

    python ml/baselines_v3.py ml/data/synth-v3 validation ml/runs/<name> [--minilm vectors.json]

This script reads training and validation files only. The test split is scored by
`ml/score_locked_test_v3.py` after the lock file is committed.
"""
import argparse
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

ML_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ML_DIR))
import eval_v3  # noqa: E402

INPUT_FIELDS = ("headline", "bio", "skills", "industry")
WORD = re.compile(r"[a-z0-9][a-z0-9+#.]*")
BM25_K1, BM25_B = 1.5, 0.75


def text(profile):
    """The four permitted input fields, joined exactly as the comparison route joins them."""
    return "\n".join(filter(None, [profile["headline"], profile["bio"],
                                   "Skills: " + ", ".join(profile["skills"]) if profile["skills"] else "",
                                   "Industry: " + profile["industry"] if profile["industry"] else ""]))


def split_roles(profiles):
    mentees = sorted((p for p in profiles if p["role"] == "mentee"), key=lambda p: p["person_id"])
    mentors = sorted((p for p in profiles if p["role"] == "mentor"), key=lambda p: p["person_id"])
    return mentees, mentors


def as_scores(matrix, mentees, mentors):
    return eval_v3.scores_from_matrix(matrix, [p["person_id"] for p in mentees], [p["person_id"] for p in mentors])


def tfidf_scores(train_profiles, mentees, mentors):
    """Cosine of character 3 to 5 gram TF-IDF vectors; the vectoriser sees training text only."""
    if any(profile["split"] != "train" for profile in train_profiles):
        raise ValueError("TF-IDF must be fitted on training profiles only")
    vectoriser = TfidfVectorizer(analyzer="char", ngram_range=(3, 5), lowercase=True)
    vectoriser.fit([text(profile) for profile in train_profiles])
    queries = vectoriser.transform([text(profile) for profile in mentees])
    documents = vectoriser.transform([text(profile) for profile in mentors])
    return as_scores((queries @ documents.T).toarray(), mentees, mentors)


def words(profile):
    return WORD.findall(text(profile).casefold())


def bm25_scores(train_profiles, mentees, mentors, k1=BM25_K1, b=BM25_B):
    """Okapi BM25 over word tokens, with document frequencies and average length from training text."""
    if any(profile["split"] != "train" for profile in train_profiles):
        raise ValueError("BM25 statistics must come from training profiles only")
    frequency = Counter()
    lengths = []
    for profile in train_profiles:
        tokens = words(profile)
        lengths.append(len(tokens))
        frequency.update(set(tokens))
    total, average = len(train_profiles), sum(lengths) / len(lengths)
    idf = lambda term: math.log(1 + (total - frequency[term] + 0.5) / (frequency[term] + 0.5))
    documents = [Counter(words(profile)) for profile in mentors]
    matrix = np.zeros((len(mentees), len(mentors)))
    for i, mentee in enumerate(mentees):
        terms = sorted(set(words(mentee)))
        for j, counts in enumerate(documents):
            length = sum(counts.values())
            matrix[i, j] = sum(idf(term) * counts[term] * (k1 + 1) / (counts[term] + k1 * (1 - b + b * length / average))
                               for term in terms if term in counts)
    return as_scores(matrix, mentees, mentors)


def vector_scores(vectors, mentees, mentors):
    """Cosine similarity from precomputed vectors keyed by person id (used for frozen MiniLM)."""
    def unit(profile):
        vector = np.asarray(vectors[profile["person_id"]], dtype=float)
        return vector / np.linalg.norm(vector)
    return as_scores(np.stack([unit(p) for p in mentees]) @ np.stack([unit(p) for p in mentors]).T, mentees, mentors)


def run(data_dir, split, output, minilm=None):
    if split != "validation":
        raise ValueError("this script scores validation only; the test split needs the locked scorer")
    data_dir, output = Path(data_dir), Path(output)
    train_profiles = eval_v3.load_jsonl(data_dir / "train_profiles.jsonl")
    profiles = eval_v3.load_jsonl(data_dir / f"{split}_profiles.jsonl")
    labels = eval_v3.labels_from_pairs(eval_v3.load_jsonl(data_dir / f"{split}_pairs.jsonl"))
    tags = {row["mentee_id"]: row["tags"] for row in eval_v3.load_jsonl(data_dir / f"{split}_queries.jsonl")}
    mentees, mentors = split_roles(profiles)
    systems = {"tfidf": tfidf_scores(train_profiles, mentees, mentors), "bm25": bm25_scores(train_profiles, mentees, mentors)}
    if minilm:
        payload = json.loads(Path(minilm).read_text())
        systems["minilm"] = vector_scores(payload["vectors"], mentees, mentors)
    output.mkdir(parents=True, exist_ok=False)
    report = {"split": split, "queries": len(mentees), "pool": len(mentors), "random": eval_v3.random_baseline(labels)}
    rows = {}
    for name, scores in systems.items():
        rows[name] = eval_v3.evaluate(scores, labels)
        report[name] = {"subsets": eval_v3.subset_report(rows[name], tags), "collapse": eval_v3.collapse_check(scores, labels)}
        (output / f"{name}_rankings.json").write_text(json.dumps(rows[name]) + "\n")
    report["paired_ndcg5"] = {f"{a}_minus_{b}": eval_v3.paired_difference(rows[a], rows[b], "ndcg5")
                              for a in rows for b in rows if a < b}
    (output / "baselines.json").write_text(json.dumps(report, indent=1) + "\n")
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir")
    parser.add_argument("split")
    parser.add_argument("output")
    parser.add_argument("--minilm")
    args = parser.parse_args()
    report = run(args.data_dir, args.split, args.output, args.minilm)
    print(f"{'system':8s} " + " ".join(f"{metric:>7s}" for metric in eval_v3.METRICS))
    print(f"{'random':8s} " + " ".join(f"{report['random'][metric]['mean']:7.4f}" for metric in eval_v3.METRICS))
    for name in ("tfidf", "bm25", "minilm"):
        if name in report:
            print(f"{name:8s} " + " ".join(f"{report[name]['subsets']['all'][metric]['mean']:7.4f}" for metric in eval_v3.METRICS))


if __name__ == "__main__":
    main()
