"""Machine audit of label quality: an independent Claude judge grades a sample of pairs blind.

The judge sees only the two written profiles and the rubric. It never sees the generated
grade, the hidden specification or any model ranking. The sample is stratified: the same
number of pairs for each generated grade, drawn at random from each split, because a plain
random sample would be about 88% grade 0 and say little about the higher grades.

This is a machine audit. It is not human review and must never be reported as such.

    python ml/synth/audit.py ml/data/synth-v3 [--per-cell 25] [--model sonnet]
"""
import argparse
import json
import random
import subprocess
import sys
import tempfile
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SEED = 20261117
BATCH = 10
SYSTEM = """You are judging how suitable a mentor is for a mentee on an alumni mentoring platform.
For each numbered pair, read the mentee profile and the mentor profile and give one grade:

3: clear match. The mentor works in the field the mentee is aiming for and offers the kind of help the mentee wants.
2: the mentor can support the mentee's main goal, but with a significant limitation of context or coverage
   (for example a neighbouring field, or the right field without clearly offering that kind of help).
1: tangential or secondary help only, or too little evidence that the main need would be met.
0: unsuitable, or no supported meaningful alignment.

Judge only from the text. Do not reward shared buzzwords without a real fit. Do not use 0 to mean "unsure".
Reply with only a JSON array, one object per pair, in order: [{"n": 1, "grade": 2}]"""


def card(profile):
    return (f"Headline: {profile['headline']}\nBio: {profile['bio'] or '(empty)'}\n"
            f"Skills: {', '.join(profile['skills']) or '(none)'}\nIndustry: {profile['industry'] or '(empty)'}")


def sample_pairs(data_dir, per_cell, seed=SEED):
    """`per_cell` pairs for each split and generated grade, chosen at random."""
    rng = random.Random(seed + 11)
    chosen = []
    for split in ("train", "validation", "test"):
        by_grade = {}
        for line in (data_dir / f"{split}_pairs.jsonl").read_text(encoding="utf-8").splitlines():
            pair = json.loads(line)
            by_grade.setdefault(pair["relevance_score"], []).append(pair)
        for grade in sorted(by_grade):
            chosen += rng.sample(by_grade[grade], min(per_cell, len(by_grade[grade])))
    rng.shuffle(chosen)
    return chosen


def weighted_kappa(first, second, levels=4):
    """Cohen's kappa with quadratic weights for two lists of integer grades."""
    total = len(first)
    observed = sum((a - b) ** 2 for a, b in zip(first, second)) / total
    count_a, count_b = Counter(first), Counter(second)
    expected = sum(count_a[i] * count_b[j] * (i - j) ** 2 for i in range(levels) for j in range(levels)) / total ** 2
    return 1 - observed / expected if expected else 1.0


def agreement(generated, judged):
    total = len(generated)
    table = [[sum(1 for g, j in zip(generated, judged) if g == row and j == column) for column in range(4)] for row in range(4)]
    return {"pairs": total, "exact_agreement": sum(g == j for g, j in zip(generated, judged)) / total,
            "within_one_grade": sum(abs(g - j) <= 1 for g, j in zip(generated, judged)) / total,
            "same_side_of_relevant": sum((g >= 2) == (j >= 2) for g, j in zip(generated, judged)) / total,
            "quadratic_weighted_kappa": weighted_kappa(generated, judged),
            "confusion_rows_generated_columns_judge": table}


def judge_batch(pairs, profiles, model, workdir):
    prompt = "\n\n".join(f"Pair {n}\nMENTEE\n{card(profiles[p['mentee_id']])}\nMENTOR\n{card(profiles[p['mentor_id']])}"
                         for n, p in enumerate(pairs, 1))
    command = ["claude", "-p", "--model", model, "--system-prompt", SYSTEM, "--tools", "", "--strict-mcp-config",
               "--setting-sources", "", "--output-format", "json", "--no-session-persistence"]
    for _ in range(3):
        done = subprocess.run(command, input=prompt, capture_output=True, text=True, cwd=workdir, timeout=900)
        try:
            reply = json.loads(done.stdout)["result"]
            rows = json.loads(reply[reply.find("["):reply.rfind("]") + 1])
            grades = [row["grade"] for row in rows]
            if len(grades) == len(pairs) and all(grade in (0, 1, 2, 3) for grade in grades):
                return grades
        except (ValueError, KeyError, TypeError):
            continue
    raise RuntimeError("judge failed three times on one batch")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data_dir")
    parser.add_argument("--per-cell", type=int, default=25)
    parser.add_argument("--model", default="sonnet")
    args = parser.parse_args()
    data_dir = Path(args.data_dir)
    profiles = {}
    for line in (data_dir / "profiles.jsonl").read_text(encoding="utf-8").splitlines():
        profile = json.loads(line)
        profiles[profile["person_id"]] = profile
    pairs = sample_pairs(data_dir, args.per_cell)
    batches = [pairs[start:start + BATCH] for start in range(0, len(pairs), BATCH)]
    with tempfile.TemporaryDirectory() as workdir, ThreadPoolExecutor(6) as pool:
        judged = [grade for grades in pool.map(lambda batch: judge_batch(batch, profiles, args.model, workdir), batches)
                  for grade in grades]
    generated = [pair["relevance_score"] for pair in pairs]
    report = {"kind": "machine audit, not human review", "judge_model": args.model, "sampling":
              f"{args.per_cell} random pairs per split and generated grade", "overall": agreement(generated, judged),
              "by_split": {split: agreement([g for g, p in zip(generated, pairs) if p["split"] == split],
                                            [j for j, p in zip(judged, pairs) if p["split"] == split])
                           for split in ("train", "validation", "test")}}
    (data_dir / "machine_audit.json").write_text(json.dumps(report, indent=1) + "\n")
    (data_dir / "machine_audit_rows.jsonl").write_text("".join(
        json.dumps({"pair_id": p["pair_id"], "generated": g, "judge": j}) + "\n" for p, g, j in zip(pairs, generated, judged)))
    print(json.dumps(report["overall"], indent=1))


if __name__ == "__main__":
    sys.exit(main())
