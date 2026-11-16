"""Write the synth-v3 splits, pair files, query tags, manifest, review sheet and backup.

    python ml/synth/splits.py ml/data/onet/taxonomy.json ml/data/synth-v3 [--backup ml/artifacts]

Training pairs are a sample for each training Mentee: graded positives, hard negatives and a
few random negatives. Validation and test are complete: every Mentee is graded against every
Mentor of the same split, so there are no unknown labels in the held-out pools.
"""
import argparse
import csv
import hashlib
import json
import random
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grades import cluster, grade, mentor_proximity  # noqa: E402

SEED = 20261117
TRAIN_POOL = {"grade3": 12, "grade2": 12, "grade1": 10, "hard": 12, "random": 8}
STATUS = "generated_by_rule_synth_v3_not_human_reviewed"
SHEET_QUERIES, SHEET_CANDIDATES = 40, 8
FIELDS = ("headline", "bio", "skills", "industry")


def related_map(taxonomy):
    return {code: set(item["related"]) for code, item in taxonomy.items()}


def is_hard_negative(mentee, mentor, related):
    """Grade 0 but superficially close: nearby field, the right kind of help, or a shared skill."""
    return (mentor_proximity(mentee["target"], mentor, related) >= 1 or mentee["goal"] in mentor["supports"]
            or bool(set(mentee["want_skills"]) & set(mentor["skills"])))


def train_pairs(mentees, mentors, related, seed=SEED):
    rng = random.Random(seed)
    pairs = []
    for mentee in mentees:
        buckets = defaultdict(list)
        for mentor in mentors:
            score = grade(mentee, mentor, related)
            if score:
                buckets[f"grade{score}"].append((mentor, score))
            elif is_hard_negative(mentee, mentor, related):
                buckets["hard"].append((mentor, 0))
            else:
                buckets["random"].append((mentor, 0))
        for name, limit in TRAIN_POOL.items():
            chosen = rng.sample(buckets[name], min(limit, len(buckets[name])))
            pairs += [(mentee["person_id"], mentor["person_id"], score, name) for mentor, score in chosen]
    return pairs


def complete_pairs(mentees, mentors, related):
    return [(mentee["person_id"], mentor["person_id"], grade(mentee, mentor, related), "complete")
            for mentee in mentees for mentor in mentors]


def query_tags(mentee, grades, selection, split):
    tags = []
    if mentee["target"] in selection["train_occupations"]:
        tags.append("seen_occupation")
    if split in selection["held_out"] and cluster(mentee["target"]) in selection["held_out"][split]:
        tags.append("unseen_occupation")
    if mentee["case"] == "mismatch":
        tags.append("vocabulary_mismatch")
    if mentee["case"] == "sparse":
        tags.append("sparse")
    if mentee["origin"]:
        tags.append("career_changer")
    if max(grades, default=0) <= 1:
        tags.append("no_suitable_mentor")
    return tags


def review_sheet(test_mentees, test_mentors, pairs, profiles, seed=SEED):
    """Rows for the blind human review sheet and the separate private key with generated grades."""
    rng = random.Random(seed + 7)
    by_mentee = defaultdict(list)
    for mentee_id, mentor_id, score, _ in pairs:
        by_mentee[mentee_id].append((mentor_id, score))
    chosen = rng.sample(sorted(mentee["person_id"] for mentee in test_mentees), min(SHEET_QUERIES, len(test_mentees)))
    sheet, key = [], []
    for query_number, mentee_id in enumerate(chosen, 1):
        judged = by_mentee[mentee_id]
        rng.shuffle(judged)
        # Up to four of the best generated grades so the sheet is not almost all zeros, then random others.
        best = sorted((item for item in judged if item[1] > 0), key=lambda item: -item[1])[:4]
        rest = [item for item in judged if item not in best]
        candidates = best + rest[:SHEET_CANDIDATES - len(best)]
        rng.shuffle(candidates)
        mentee = profiles[mentee_id]
        for candidate_number, (mentor_id, score) in enumerate(candidates, 1):
            mentor = profiles[mentor_id]
            row_id = f"R{query_number:02d}-{candidate_number}"
            sheet.append({"row_id": row_id, "mentee_headline": mentee["headline"], "mentee_bio": mentee["bio"],
                          "mentee_skills": "; ".join(mentee["skills"]), "mentee_industry": mentee["industry"],
                          "mentor_headline": mentor["headline"], "mentor_bio": mentor["bio"],
                          "mentor_skills": "; ".join(mentor["skills"]), "mentor_industry": mentor["industry"],
                          "reviewer_id": "", "your_grade_0_to_3": "", "unsure_true_false": "", "note": ""})
            key.append({"row_id": row_id, "mentee_id": mentee_id, "mentor_id": mentor_id, "generated_grade": score})
    return sheet, key


def write_csv(path, rows):
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def build(taxonomy, data_dir, seed=SEED):
    data_dir = Path(data_dir)
    related = related_map(taxonomy)
    selection = json.loads((data_dir / "selection.json").read_text(encoding="utf-8"))
    profiles = {}
    for line in (data_dir / "profiles.jsonl").read_text(encoding="utf-8").splitlines():
        profile = json.loads(line)
        profiles[profile["person_id"]] = profile
    specs = [spec for spec in map(json.loads, (data_dir / "specs.jsonl").read_text(encoding="utf-8").splitlines())
             if spec["person_id"] in profiles]
    files, summary = [], {}
    held_out_pairs = {}
    for split in ("train", "validation", "test"):
        mentors = [spec for spec in specs if spec["split"] == split and spec["role"] == "mentor"]
        mentees = [spec for spec in specs if spec["split"] == split and spec["role"] == "mentee"]
        pairs = train_pairs(mentees, mentors, related, seed) if split == "train" else complete_pairs(mentees, mentors, related)
        held_out_pairs[split] = pairs
        profile_path, pair_path = data_dir / f"{split}_profiles.jsonl", data_dir / f"{split}_pairs.jsonl"
        profile_path.write_text("".join(json.dumps(profiles[spec["person_id"]], ensure_ascii=False) + "\n"
                                        for spec in mentors + mentees), encoding="utf-8")
        prefix = {"train": "TRN", "validation": "VAL", "test": "TST"}[split]
        pair_path.write_text("".join(json.dumps({
            "pair_id": f"PAIR-{prefix}-{number:06d}", "mentee_id": mentee_id, "mentor_id": mentor_id, "split": split,
            "relevance_score": score, "sampling": kind, "annotation_status": STATUS}) + "\n"
            for number, (mentee_id, mentor_id, score, kind) in enumerate(pairs, 1)), encoding="utf-8")
        files += [profile_path, pair_path]
        per_mentee = defaultdict(list)
        for mentee_id, _, score, _ in pairs:
            per_mentee[mentee_id].append(score)
        summary[split] = {"mentors": len(mentors), "mentees": len(mentees), "pairs": len(pairs),
                          "grades": {str(g): c for g, c in sorted(Counter(score for *_, score, _ in pairs).items())},
                          "mentor_occupations": len({spec["occupation"] for spec in mentors}),
                          "cases": dict(Counter(f"{spec['role']}:{spec['case']}" for spec in mentors + mentees))}
        if split != "train":
            query_path = data_dir / f"{split}_queries.jsonl"
            tag_counts = Counter()
            with open(query_path, "w", encoding="utf-8") as handle:
                for mentee in mentees:
                    tags = query_tags(mentee, per_mentee[mentee["person_id"]], selection, split)
                    tag_counts.update(tags)
                    handle.write(json.dumps({"mentee_id": mentee["person_id"], "tags": tags}) + "\n")
            files.append(query_path)
            summary[split]["query_tags"] = dict(sorted(tag_counts.items()))
        else:
            summary[split]["pair_sampling"] = dict(Counter(kind for *_, kind in pairs))
    test_specs = [spec for spec in specs if spec["split"] == "test"]
    sheet, key = review_sheet([s for s in test_specs if s["role"] == "mentee"], [s for s in test_specs if s["role"] == "mentor"],
                              held_out_pairs["test"], profiles, seed)
    write_csv(data_dir / "human_review_sheet.csv", sheet)
    write_csv(data_dir / "test_human_review_key.csv", key)
    files += [data_dir / "human_review_sheet.csv", data_dir / "test_human_review_key.csv"]
    manifest = {
        "dataset": "synth-v3", "seed": seed, "annotation_status": STATUS,
        "input_fields": list(FIELDS), "train_pool_limits": TRAIN_POOL, "held_out_clusters": selection["held_out"],
        "specs_sha256": sha256(data_dir / "specs.jsonl"), "profiles_sha256": sha256(data_dir / "profiles.jsonl"),
        "files": {path.name: {"sha256": sha256(path), "bytes": path.stat().st_size} for path in files},
        "summary": summary,
    }
    (data_dir / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    return manifest


def backup(data_dir, target_dir):
    data_dir, target_dir = Path(data_dir), Path(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)
    digest = sha256(data_dir / "manifest.json")[:12]
    target = target_dir / f"synth-v3-{digest}.zip"
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(data_dir.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(data_dir.parent))
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("taxonomy")
    parser.add_argument("data_dir")
    parser.add_argument("--backup")
    args = parser.parse_args()
    taxonomy = json.loads(Path(args.taxonomy).read_text(encoding="utf-8"))["occupations"]
    manifest = build(taxonomy, args.data_dir)
    print(json.dumps(manifest["summary"], indent=1))
    if args.backup:
        print("backup:", backup(args.data_dir, args.backup))


if __name__ == "__main__":
    main()
