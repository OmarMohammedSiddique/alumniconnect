"""Read-only intake checks for the synthetic Gemini JSONL export. No ML fitting."""

import argparse
from collections import Counter, defaultdict
import hashlib
import itertools
import json
from pathlib import Path
import re
import sys
import unicodedata


SPLITS = ("train", "validation", "test")
PROFILE_FIELDS = {"person_id", "role", "split", "headline", "bio", "skills", "industry"}
PAIR_FIELDS = {
    "pair_id", "mentee_id", "mentor_id", "split", "relevance_score",
    "label_rationale", "ambiguity_flag", "annotation_status",
}
NEAR_DUPLICATE_THRESHOLD = 0.65


def normalise(text):
    return " ".join(re.findall(r"\w+", unicodedata.normalize("NFKC", text).casefold()))


def profile_text(profile):
    """Mirror the available app text fields; this export has no graduation year."""
    return "\n".join(filter(None, [
        profile["headline"], profile["bio"],
        f"Skills: {', '.join(profile['skills'])}" if profile["skills"] else "",
        f"Industry: {profile['industry']}" if profile["industry"] else "",
    ]))


def extract_records(text):
    """Parse only fenced JSONL, never instructions or prose that resembles a record."""
    records, issues = [], []
    fence, jsonl, blocks = None, False, 0
    for line_number, line in enumerate(text.splitlines(), 1):
        marker = re.match(r"^\s*(`{3,}|~{3,})([^\s]*)\s*$", line)
        if marker:
            token, language = marker.groups()
            if fence is None:
                fence = token
                jsonl = language.casefold() == "jsonl"
                blocks += int(jsonl)
            elif token[0] == fence[0] and len(token) >= len(fence) and not language:
                fence, jsonl = None, False
            continue
        if not jsonl or not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            issues.append({"code": "invalid_jsonl", "line": line_number})
            continue
        if not isinstance(row, dict) or (("person_id" in row) == ("pair_id" in row)):
            issues.append({"code": "unknown_record", "line": line_number})
            continue
        records.append((line_number, row))
    if jsonl:
        issues.append({"code": "unclosed_jsonl_fence"})
    if not blocks:
        issues.append({"code": "no_jsonl_blocks"})
    return records, issues, blocks


def audit(source_bytes):
    records, issues, blocks = extract_records(source_bytes.decode("utf-8"))
    profiles, pairs, seen_people, seen_pairs, seen_links = {}, [], {}, {}, {}
    cross_split_people, privacy_flags = [], []

    def issue(code, line, field=None):
        detail = {"code": code, "line": line}
        if field:
            detail["field"] = field
        issues.append(detail)

    for line, row in records:
        is_profile = "person_id" in row
        fields = PROFILE_FIELDS if is_profile else PAIR_FIELDS
        for field in sorted(fields - row.keys()):
            issue("missing_field", line, field)
        for field in sorted(row.keys() - fields):
            issue("unexpected_field", line, field)
        before = len(issues)
        string_fields = ("person_id", "role", "split", "headline", "bio", "industry") if is_profile else (
            "pair_id", "mentee_id", "mentor_id", "split", "label_rationale", "annotation_status",
        )
        for field in string_fields:
            if not isinstance(row.get(field), str):
                issue("invalid_string", line, field)
            elif field not in {"headline", "bio", "industry"} and not row[field].strip():
                issue("blank_value", line, field)
        if row.get("split") not in SPLITS:
            issue("invalid_split", line, "split")
        if is_profile:
            if row.get("role") not in ("mentor", "mentee"):
                issue("invalid_role", line, "role")
            skills = row.get("skills")
            if not isinstance(skills, list) or any(not isinstance(s, str) or not s.strip() for s in skills):
                issue("invalid_skills", line, "skills")
            elif len({normalise(s) for s in skills}) != len(skills):
                issue("duplicate_skill", line, "skills")
            if not any(isinstance(row.get(k), str) and row[k].strip() for k in ("headline", "bio")):
                issue("empty_profile_text", line)
        else:
            if type(row.get("relevance_score")) is not int or row["relevance_score"] not in range(4):
                issue("invalid_score", line, "relevance_score")
            if type(row.get("ambiguity_flag")) is not bool:
                issue("invalid_boolean", line, "ambiguity_flag")
            if row.get("annotation_status") != "machine_generated_pending_human_review":
                issue("unsupported_annotation_status", line, "annotation_status")
        if len(issues) != before or fields - row.keys() or row.keys() - fields:
            continue
        # Limited triage only. No detected contact/secret pattern is not privacy approval.
        content = json.dumps(row, ensure_ascii=False)
        if re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|https?://|\beyJ[\w-]{10,}\.[\w-]+\.|\b(?:sk|sb_secret)[_-][\w-]{12,}", content):
            privacy_flags.append({"line": line, "kind": "contact_url_or_secret_pattern"})
        if is_profile:
            person = row["person_id"]
            if person in seen_people:
                issue("duplicate_person_id", line)
                if seen_people[person] != row["split"]:
                    cross_split_people.append(person)
                continue
            seen_people[person] = row["split"]
            profiles[person] = row
        else:
            pair = row["pair_id"]
            if pair in seen_pairs:
                issue("duplicate_pair_id", line)
            seen_pairs[pair] = line
            link = (row["mentee_id"], row["mentor_id"])
            if link in seen_links:
                issue("duplicate_person_pair", line)
                if seen_links[link] != row["relevance_score"]:
                    issue("contradictory_pair_score", line)
            seen_links[link] = row["relevance_score"]
            pairs.append((line, row))

    valid_pairs = []
    for line, pair in pairs:
        valid = True
        for field, role in (("mentee_id", "mentee"), ("mentor_id", "mentor")):
            person = profiles.get(pair[field])
            if person is None:
                issue("missing_person_reference", line, field)
                valid = False
            elif person["role"] != role:
                issue("wrong_reference_role", line, field)
                valid = False
            elif person["split"] != pair["split"]:
                issue("pair_profile_split_mismatch", line, field)
                cross_split_people.append(pair[field])
                valid = False
        if valid:
            valid_pairs.append(pair)

    texts = {pid: normalise(profile_text(p)) for pid, p in profiles.items()}
    tokens = {pid: set(text.split()) for pid, text in texts.items()}
    duplicates, near = [], []
    for left, right in itertools.combinations(sorted(profiles), 2):
        cross_split = profiles[left]["split"] != profiles[right]["split"]
        detail = {"left": left, "right": right, "cross_split": cross_split}
        if texts[left] == texts[right]:
            duplicates.append(detail)
        else:
            union = tokens[left] | tokens[right]
            similarity = len(tokens[left] & tokens[right]) / len(union) if union else 0
            if similarity >= NEAR_DUPLICATE_THRESHOLD:
                near.append({**detail, "token_jaccard": round(similarity, 4)})

    adjacency = {pid: set() for pid in profiles}
    mentor_use, ambiguity, same_industry = Counter(), defaultdict(Counter), defaultdict(Counter)
    query_pairs = Counter()
    for pair in valid_pairs:
        mentee, mentor = pair["mentee_id"], pair["mentor_id"]
        adjacency[mentee].add(mentor)
        adjacency[mentor].add(mentee)
        mentor_use[mentor] += 1
        query_pairs[mentee] += 1
        grade = str(pair["relevance_score"])
        ambiguity[grade][str(pair["ambiguity_flag"]).lower()] += 1
        industries = [normalise(profiles[p]["industry"]) for p in (mentee, mentor)]
        industry_state = "unknown" if not all(industries) else str(industries[0] == industries[1]).lower()
        same_industry[grade][industry_state] += 1
    remaining, components = set(profiles), []
    while remaining:
        stack, component = [min(remaining)], []
        while stack:
            person = stack.pop()
            if person not in remaining:
                continue
            remaining.remove(person)
            component.append(person)
            stack.extend(adjacency[person] & remaining)
        components.append(sorted(component))
    components.sort(key=lambda c: (-len(c), c))
    mentors = sorted(pid for pid, p in profiles.items() if p["role"] == "mentor")
    split_inventory = {}
    for split in SPLITS:
        split_mentors = [p for p in profiles.values() if p["split"] == split and p["role"] == "mentor"]
        split_mentees = [p for p in profiles.values() if p["split"] == split and p["role"] == "mentee"]
        judged = sum(p["split"] == split for p in valid_pairs)
        split_inventory[split] = {
            "mentors": len(split_mentors), "mentees": len(split_mentees),
            "pairs": judged, "possible_pairs": len(split_mentors) * len(split_mentees),
        }
    blockers = []
    if issues:
        blockers.append("record_integrity_errors")
    if privacy_flags:
        blockers.append("privacy_triage_required")
    if cross_split_people or any(d["cross_split"] for d in duplicates + near):
        blockers.append("cross_split_identity_or_text_overlap")
    for split, inventory in split_inventory.items():
        if not all(inventory[k] for k in ("mentors", "mentees", "pairs")):
            blockers.append(f"missing_{split}_pool_or_labels")
    if not profiles or not valid_pairs:
        blockers.append("no_usable_records")
    # This intake schema carries no human review or frozen-protocol approval evidence.
    blockers.extend(["human_label_and_template_review_required", "protocol_and_dataset_freeze_required"])
    return {
        "audit_version": 1, "source_sha256": hashlib.sha256(source_bytes).hexdigest(),
        "jsonl_blocks": blocks, "parsed_profile_records": sum("person_id" in r for _, r in records),
        "parsed_pair_records": sum("pair_id" in r for _, r in records),
        "valid_unique_profiles": len(profiles), "valid_reference_pairs": len(valid_pairs),
        "splits": split_inventory,
        "scores": dict(sorted(Counter(str(p["relevance_score"]) for p in valid_pairs).items())),
        "industries": dict(sorted(Counter(p["industry"] or "(missing)" for p in profiles.values()).items())),
        "annotation_status": dict(Counter(p["annotation_status"] for p in valid_pairs)),
        "integrity_issues": issues, "privacy_pattern_flags": privacy_flags,
        "cross_split_people": sorted(set(cross_split_people)),
        "normalised_duplicate_profiles": duplicates,
        "near_duplicate_threshold": NEAR_DUPLICATE_THRESHOLD,
        "near_duplicate_candidates": near,
        "cross_split_check_applicable": all(split_inventory[s]["mentors"] and split_inventory[s]["mentees"] for s in SPLITS),
        "connected_components": components,
        "unused_mentors": [pid for pid in mentors if not mentor_use[pid]],
        "mentor_pair_counts": {pid: mentor_use[pid] for pid in mentors},
        "mentee_pair_counts": dict(sorted(query_pairs.items())),
        "ambiguity_by_score": {k: dict(v) for k, v in sorted(ambiguity.items())},
        "same_industry_by_score": {k: dict(v) for k, v in sorted(same_industry.items())},
        "training_ready": False, "blockers": blockers,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Original Markdown export, read without modification")
    parser.add_argument("--expected-sha256", help="Reject an unexpected source revision")
    parser.add_argument("--output-dir", type=Path, help="Optional NEW private directory for audit.json only")
    args = parser.parse_args()
    try:
        source_bytes = args.source.read_bytes()
        digest = hashlib.sha256(source_bytes).hexdigest()
        if args.expected_sha256 and digest != args.expected_sha256:
            raise ValueError("Source hash mismatch; no output written")
        result = audit(source_bytes)
        if args.output_dir:
            args.output_dir.mkdir(parents=True, exist_ok=False)
            with (args.output_dir / "audit.json").open("x", encoding="utf-8") as handle:
                json.dump(result, handle, ensure_ascii=False, indent=2, sort_keys=True)
                handle.write("\n")
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 2 if result["blockers"] else 0
    except (OSError, UnicodeError, ValueError) as error:
        print(f"Audit failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
