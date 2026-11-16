"""One evaluator for every system compared on synth-v3 (and, in legacy mode, the old pilot pools).

Every system hands over a score for each Mentee and Mentor pair of a completely judged pool.
This module ranks, scores and bootstraps them the same way, and keeps the raw rankings.

Definitions (fixed before any v3 result was read):

- Ranking: score descending, ties broken by Mentor id ascending.
- Gain for nDCG: 2**grade - 1, discount log2(rank + 1), ideal taken from the whole pool.
- A Mentor is "relevant" for the yes/no metrics when the grade is 2 or 3 (primary-goal support).
- nDCG@k is undefined for a Mentee whose pool has no grade above 0; P@k, MRR@5 and hit@5 are
  undefined for a Mentee with no relevant Mentor. Undefined values are left out of means and
  the number of Mentees behind every mean is reported. (Legacy mode scores them as 0 instead,
  to reproduce the figures recorded for the five-query pilot.)
- Intervals: percentile bootstrap over Mentees, 10,000 resamples, fixed seed. Paired
  differences resample the same Mentees for both systems.
- Collapse diagnostic: after removing each Mentee's mean score, the share of the remaining
  score variance explained by each Mentor's average score. Near 1 means every Mentee gets the
  same Mentor order (the v2-A failure). A run must stay at or below COLLAPSE_LIMIT before its
  metrics are read.
"""
import json
import math
from pathlib import Path

import numpy as np

METRICS = ("ndcg5", "ndcg10", "mrr5", "p1", "p5", "hit5")
RELEVANT = 2
BOOTSTRAP_SAMPLES = 10_000
BOOTSTRAP_SEED = 20261117
COLLAPSE_LIMIT = 0.5


def dcg(grades):
    return sum((2 ** grade - 1) / math.log2(rank + 2) for rank, grade in enumerate(grades))


def query_metrics(ranked_grades, legacy=False):
    """Metrics for one Mentee from the grades of its pool in ranked order."""
    ideal = sorted(ranked_grades, reverse=True)
    has_gain, has_relevant = ideal[0] > 0, ideal[0] >= RELEVANT
    missing = 0.0 if legacy else None
    top = ranked_grades[:5]
    first = next((rank for rank, grade in enumerate(top, 1) if grade >= RELEVANT), None)
    result = {
        "ndcg5": dcg(top) / dcg(ideal[:5]) if has_gain else missing,
        "ndcg10": dcg(ranked_grades[:10]) / dcg(ideal[:10]) if has_gain else missing,
    }
    if has_relevant or legacy:
        result.update({"mrr5": 1 / first if first else 0.0, "p1": float(top[0] >= RELEVANT),
                       "p5": sum(grade >= RELEVANT for grade in top) / 5, "hit5": float(first is not None)})
    else:
        result.update({"mrr5": None, "p1": None, "p5": None, "hit5": None})
    return result


def rank_pool(scores):
    """Mentor ids ordered by score descending, then id ascending."""
    return sorted(scores, key=lambda mentor: (-scores[mentor], mentor))


def evaluate(scores, labels, legacy=False):
    """Per-Mentee metrics and rankings.

    `scores` and `labels` map mentee id -> {mentor id: value}. Every judged pair needs a score
    and nothing unjudged may be scored, so pools are always compared whole.
    """
    if set(scores) != set(labels):
        raise ValueError("scores and labels cover different Mentees")
    rows = []
    for mentee in sorted(labels):
        if set(scores[mentee]) != set(labels[mentee]):
            raise ValueError(f"scores for {mentee} do not match its judged pool")
        if not all(math.isfinite(value) for value in scores[mentee].values()):
            raise ValueError(f"non-finite score for {mentee}")
        ranking = rank_pool(scores[mentee])
        grades = [labels[mentee][mentor] for mentor in ranking]
        rows.append({"mentee_id": mentee, **query_metrics(grades, legacy), "ranking": ranking,
                     "ranked_scores": [float(scores[mentee][mentor]) for mentor in ranking], "ranked_grades": grades})
    return rows


def mean_of(rows, metric):
    values = [row[metric] for row in rows if row[metric] is not None]
    return (sum(values) / len(values), len(values)) if values else (None, 0)


def bootstrap_interval(values, samples=BOOTSTRAP_SAMPLES, seed=BOOTSTRAP_SEED):
    """Percentile 95% interval of the mean of `values` (resampling Mentees with replacement)."""
    values = np.asarray(values, dtype=float)
    if len(values) < 2:
        return None
    rng = np.random.default_rng(seed)
    means = values[rng.integers(0, len(values), size=(samples, len(values)))].mean(axis=1)
    return [float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))]


def summarise(rows, mentees=None):
    """Mean, count and bootstrap interval of every metric, optionally for a subset of Mentees."""
    if mentees is not None:
        rows = [row for row in rows if row["mentee_id"] in mentees]
    summary = {"queries": len(rows)}
    for metric in METRICS:
        mean, count = mean_of(rows, metric)
        values = [row[metric] for row in rows if row[metric] is not None]
        summary[metric] = {"mean": mean, "n": count, "ci95": bootstrap_interval(values) if count else None}
    return summary


def paired_difference(rows_a, rows_b, metric, mentees=None, samples=BOOTSTRAP_SAMPLES, seed=BOOTSTRAP_SEED):
    """Mean of (a - b) per Mentee with a paired bootstrap 95% interval and a plain-word verdict."""
    by_b = {row["mentee_id"]: row for row in rows_b}
    if {row["mentee_id"] for row in rows_a} != set(by_b):
        raise ValueError("systems were scored on different Mentees")
    differences = [row[metric] - by_b[row["mentee_id"]][metric] for row in rows_a
                   if (mentees is None or row["mentee_id"] in mentees)
                   and row[metric] is not None and by_b[row["mentee_id"]][metric] is not None]
    if len(differences) < 2:
        return {"mean": None, "n": len(differences), "ci95": None, "verdict": "too few Mentees"}
    interval = bootstrap_interval(differences, samples, seed)
    if interval[0] > 0:
        verdict = "a is better than b"
    elif interval[1] < 0:
        verdict = "a is worse than b"
    else:
        verdict = "not distinguishable"
    return {"mean": float(np.mean(differences)), "n": len(differences), "ci95": interval, "verdict": verdict}


def score_matrix(scores):
    mentees = sorted(scores)
    mentors = sorted(scores[mentees[0]])
    return np.array([[scores[mentee][mentor] for mentor in mentors] for mentee in mentees], dtype=float), mentees, mentors


def collapse_share(scores):
    """Share of within-Mentee score variance explained by the Mentor's average score (0 to 1)."""
    matrix, _, _ = score_matrix(scores)
    centred = matrix - matrix.mean(axis=1, keepdims=True)
    total = float((centred ** 2).sum())
    if total == 0:
        return 1.0
    return float(len(matrix) * (centred.mean(axis=0) ** 2).sum() / total)


def mentor_mean_scores(scores):
    """The query-independent ranking implied by a system: each Mentor's average score for everyone."""
    matrix, mentees, mentors = score_matrix(scores)
    average = matrix.mean(axis=0)
    return {mentee: {mentor: float(value) for mentor, value in zip(mentors, average)} for mentee in mentees}


def collapse_check(scores, labels):
    share = collapse_share(scores)
    own, _ = mean_of(evaluate(scores, labels), "ndcg5")
    flat, _ = mean_of(evaluate(mentor_mean_scores(scores), labels), "ndcg5")
    return {"mentor_mean_variance_share": share, "limit": COLLAPSE_LIMIT, "passed": share <= COLLAPSE_LIMIT,
            "ndcg5": own, "ndcg5_of_mentor_mean_order": flat}


def random_scores(labels, seed):
    rng = np.random.default_rng(seed)
    return {mentee: {mentor: float(rng.random()) for mentor in sorted(pool)} for mentee, pool in sorted(labels.items())}


def random_baseline(labels, seeds=100):
    """Mean over seeds of each metric's per-seed mean, with the spread across seeds."""
    per_seed = {metric: [] for metric in METRICS}
    for seed in range(seeds):
        rows = evaluate(random_scores(labels, seed), labels)
        for metric in METRICS:
            per_seed[metric].append(mean_of(rows, metric)[0])
    return {metric: {"mean": float(np.mean(values)), "sd_across_seeds": float(np.std(values)), "seeds": seeds}
            for metric, values in per_seed.items()}


def load_jsonl(path):
    return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line.strip()]


def labels_from_pairs(pairs):
    labels = {}
    for pair in pairs:
        pool = labels.setdefault(pair["mentee_id"], {})
        if pair["mentor_id"] in pool:
            raise ValueError("duplicate judged pair")
        pool[pair["mentor_id"]] = pair["relevance_score"]
    return labels


def scores_from_matrix(matrix, mentees, mentors):
    return {mentee: {mentor: float(matrix[i][j]) for j, mentor in enumerate(mentors)} for i, mentee in enumerate(mentees)}


def subset_report(rows, tags):
    """Summaries for all Mentees and for each tagged subset. `tags` maps mentee id -> list of tags."""
    names = sorted({tag for found in tags.values() for tag in found})
    report = {"all": summarise(rows)}
    for name in names:
        report[name] = summarise(rows, {mentee for mentee, found in tags.items() if name in found})
    return report
