"""Validation gate for written profiles. Rejects are regenerated once, then dropped and counted.

Checks per profile: schema and lengths, case rules (sparse and indirect wording), leakage of
labels or specification fields into text, contact details, named real organisations, exact
duplicates and near-duplicates. Checks over the accepted set: person and occupation-cluster
disjointness between splits, and style disjointness.

    python ml/synth/gate.py ml/data/onet/taxonomy.json ml/data/synth-v3 [--final]

Without --final the gate writes `rejected_ids.txt` for another writing round. With --final it
drops whatever still fails and writes `profiles.jsonl` and `gate_report.json`.
"""
import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from grades import cluster  # noqa: E402
from prompts import avoid_words  # noqa: E402

LIMITS = {"headline": 140, "bio": 1400, "skill": 90, "skills": 12, "industry": 80}
NEAR_DUPLICATE = 0.8  # token-set Jaccard of the bio
LEAKS = [re.compile(pattern, re.IGNORECASE) for pattern in (
    r"\b\d\d-\d{4}(\.\d\d)?\b", r"\bMT[RE]-(TRN|VAL|TST)", r"\bgrade [0-3]\b", r"relevance (score|grade)",
    r"\bbrief \d", r"\bcard \d", r"\b(indirect|roundabout|sparse|bare|standard|normal) (case|mode)\b", r"O\*NET",
    r"career_entry|technical_growth|career_change|orphan|want_skills|have_skills",
)]
CONTACT = re.compile(r"https?://|www\.|@[a-z0-9]|\+?\d[\d \-]{8,}\d", re.IGNORECASE)
# Real employers and universities must not be named. Product and aircraft names are allowed.
ORGANISATIONS = re.compile(r"\b(" + "|".join((
    "kenya airways", "safaricom", "ethiopian airlines", "rwandair", "jambojet", "precision air", "air tanzania",
    "uganda airlines", "qatar airways", "flydubai", "british airways", "klm", "lufthansa", "fly540",
    "equity bank", "kcb", "co-operative bank", "absa", "stanbic", "standard chartered", "barclays", "ncba", "crdb",
    "bank of kigali", "mtn", "airtel", "vodacom", "telkom kenya", "strathmore", "university of nairobi", "makerere",
    "jkuat", "kenyatta university", "moi university", "usiu", "daystar", "university of dar es salaam",
    "addis ababa university", "university of rwanda", "kengen", "kenya power", "kplc", "kenya ports authority",
    "kenya railways", "kcaa", "kenya airports authority", "dhl", "maersk", "bollore", "bolloré", "kuehne", "fedex",
    "unicef", "world food programme", "wfp", "red cross", "deloitte", "pwc", "kpmg", "mckinsey",
    "andela", "jumia", "twiga", "m-kopa", "sendy", "east african breweries", "eabl", "bidco", "unilever",
    "nation media", "tullow", "total energies", "nasa",
)) + r")\b", re.IGNORECASE)
WORD = re.compile(r"[a-z0-9']+")


def text_of(profile):
    return " ".join([profile["headline"], profile["bio"], " ".join(profile["skills"]), profile["industry"]])


def check_profile(profile, spec, taxonomy):
    """Return a list of reasons this profile is rejected (empty when it passes)."""
    reasons = []
    for key in ("headline", "bio", "industry"):
        if not isinstance(profile.get(key), str):
            return [f"schema:{key}"]
    skills = profile.get("skills")
    if not isinstance(skills, list) or not all(isinstance(skill, str) for skill in skills):
        return ["schema:skills"]
    if not profile["headline"].strip():
        reasons.append("empty:headline")
    if len(profile["headline"]) > LIMITS["headline"] or len(profile["bio"]) > LIMITS["bio"] \
            or len(profile["industry"]) > LIMITS["industry"] or len(skills) > LIMITS["skills"] \
            or any(len(skill) > LIMITS["skill"] for skill in skills):
        reasons.append("length:too_long")
    if spec["case"] == "sparse":
        if len(profile["bio"].split()) > 16 or len(skills) > 2 or len(profile["headline"].split()) > 9:
            reasons.append("case:not_sparse")
    elif len(profile["bio"].split()) < 6 or not skills:
        reasons.append("length:too_short")
    text = text_of(profile)
    if any(pattern.search(text) for pattern in LEAKS):
        reasons.append("leak:label_or_spec")
    if CONTACT.search(text):
        reasons.append("privacy:contact")
    if ORGANISATIONS.search(text):
        reasons.append("privacy:named_organisation")
    if spec["case"] == "mismatch":
        code = spec["occupation"] if spec["role"] == "mentor" else spec["target"]
        if any(re.search(r"\b" + re.escape(stem), text, re.IGNORECASE) for stem in avoid_words(taxonomy[code]["title"])):
            reasons.append("case:title_stated")
    return reasons


def duplicates(profiles):
    """Ids to reject as exact or near duplicates; the first occurrence in file order is kept."""
    rejected, seen_text, bags = {}, {}, []
    for profile in profiles:
        key = " ".join(WORD.findall(text_of(profile).lower()))
        if key in seen_text:
            rejected[profile["person_id"]] = "duplicate:exact"
            continue
        seen_text[key] = profile["person_id"]
        bag = frozenset(WORD.findall(profile["bio"].lower()))
        if len(bag) >= 12:
            if any(len(bag & other) / len(bag | other) >= NEAR_DUPLICATE for other in bags):
                rejected[profile["person_id"]] = "duplicate:near"
                continue
            bags.append(bag)
    return rejected


def split_checks(specs, selection):
    """Structural checks on the accepted people. Returns a dict of named booleans and counts."""
    by_split = defaultdict(list)
    for spec in specs:
        by_split[spec["split"]].append(spec)
    ids = [spec["person_id"] for spec in specs]

    def clusters(split):
        codes = set()
        for spec in by_split[split]:
            codes.update(code for code in (spec.get("occupation"), spec.get("past_occupation"), spec.get("target"),
                                           spec.get("origin")) if code)
        return {cluster(code) for code in codes}

    held = {split: set(names) for split, names in selection["held_out"].items()}
    styles = {split: {spec["style"] for spec in by_split[split]} for split in by_split}
    return {
        "person_ids_unique": len(ids) == len(set(ids)),
        "test_unseen_clusters_absent_from_train_and_validation":
            not held["test"] & (clusters("train") | clusters("validation")),
        "validation_unseen_clusters_absent_from_train": not held["validation"] & clusters("train"),
        "test_styles_disjoint_from_train_and_validation":
            not styles.get("test", set()) & (styles.get("train", set()) | styles.get("validation", set())),
        "validation_styles_disjoint_from_train": not styles.get("validation", set()) & styles.get("train", set()),
        "people_per_split": {split: dict(Counter(spec["role"] for spec in rows)) for split, rows in sorted(by_split.items())},
    }


def load_written(data_dir):
    """Latest written profile per person across writing rounds, plus cost and round counts."""
    written, rounds, cost = {}, Counter(), 0.0
    for path in sorted((data_dir / "raw").glob("round*_batch*.json")):
        record = json.loads(path.read_text(encoding="utf-8"))
        rounds[path.name.split("_")[0]] += len(record["profiles"])
        cost += record.get("cost_usd") or 0.0
        for profile in record["profiles"]:
            written[profile["person_id"]] = profile
    return written, dict(rounds), cost


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("taxonomy")
    parser.add_argument("data_dir")
    parser.add_argument("--final", action="store_true")
    args = parser.parse_args()
    taxonomy = json.loads(Path(args.taxonomy).read_text(encoding="utf-8"))["occupations"]
    data_dir = Path(args.data_dir)
    specs = [json.loads(line) for line in (data_dir / "specs.jsonl").read_text(encoding="utf-8").splitlines()]
    selection = json.loads((data_dir / "selection.json").read_text(encoding="utf-8"))
    written, rounds, cost = load_written(data_dir)
    reasons, candidates = {}, []
    for spec in specs:
        profile = written.get(spec["person_id"])
        if profile is None:
            reasons[spec["person_id"]] = ["missing"]
            continue
        found = check_profile(profile, spec, taxonomy)
        if found:
            reasons[spec["person_id"]] = found
        else:
            candidates.append(profile)
    for person_id, reason in duplicates(candidates).items():
        reasons[person_id] = [reason]
    tally = Counter(reason for found in reasons.values() for reason in found)
    print(f"written {len(written)} of {len(specs)}; rejected {len(reasons)}: {dict(sorted(tally.items()))}")
    if not args.final:
        (data_dir / "rejected_ids.txt").write_text("\n".join(sorted(reasons)) + "\n")
        return
    kept_specs = [spec for spec in specs if spec["person_id"] not in reasons]
    checks = split_checks(kept_specs, selection)
    failed = [name for name, value in checks.items() if value is False]
    if failed:
        raise SystemExit(f"structural checks failed: {failed}")
    lines = []
    for spec in kept_specs:
        profile = written[spec["person_id"]]
        lines.append(json.dumps({"person_id": spec["person_id"], "role": spec["role"], "split": spec["split"],
                                 "headline": profile["headline"], "bio": profile["bio"], "skills": profile["skills"],
                                 "industry": profile["industry"]}, ensure_ascii=False))
    (data_dir / "profiles.jsonl").write_text("\n".join(lines) + "\n", encoding="utf-8")
    report = {"specifications": len(specs), "written_by_round": rounds, "writer_cost_usd": round(cost, 4),
              "accepted": len(kept_specs), "dropped": len(reasons), "dropped_by_reason": dict(sorted(tally.items())),
              "dropped_by_case": dict(Counter(spec["case"] for spec in specs if spec["person_id"] in reasons)),
              "checks": checks, "limits": LIMITS, "near_duplicate_jaccard": NEAR_DUPLICATE}
    (data_dir / "gate_report.json").write_text(json.dumps(report, indent=1) + "\n")
    print(json.dumps(report["checks"], indent=1))


if __name__ == "__main__":
    main()
