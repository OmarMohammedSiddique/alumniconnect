"""Synthetic fixtures test leakage and corruption detection, with no source data."""

import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from audit_export import audit, extract_records, profile_text


def profile(pid, role, split="train", bio=None):
    return {"person_id": pid, "role": role, "split": split,
            "headline": f"{pid} career guidance", "bio": bio or f"{pid} practical learning",
            "skills": ["Coaching"], "industry": "Education"}


def pair(pid="pair-a", mentee="mentee-a", mentor="mentor-a", split="train", score=3):
    return {"pair_id": pid, "mentee_id": mentee, "mentor_id": mentor, "split": split,
            "relevance_score": score, "label_rationale": "Fixture explanation",
            "ambiguity_flag": False, "annotation_status": "machine_generated_pending_human_review"}


def export(rows):
    return ("# Synthetic test\n```jsonl\n" + "\n".join(json.dumps(r) for r in rows) + "\n```\n").encode()


class AuditTests(unittest.TestCase):
    def setUp(self):
        self.rows = [profile("mentor-a", "mentor"), profile("mentee-a", "mentee"), pair()]

    def codes(self, rows):
        return {i["code"] for i in audit(export(rows))["integrity_issues"]}

    def test_reads_only_jsonl_blocks_and_rejects_malformed_rows(self):
        records, issues, blocks = extract_records('{"person_id":"ignored"}\n```jsonl\n{bad}\n[]\n```')
        self.assertEqual((records, blocks), ([], 1))
        self.assertEqual([i["code"] for i in issues], ["invalid_jsonl", "unknown_record"])

    def test_incomplete_fence_and_no_fence(self):
        self.assertEqual(extract_records("```jsonl\n")[1][0]["code"], "unclosed_jsonl_fence")
        self.assertEqual(extract_records("No records")[1][0]["code"], "no_jsonl_blocks")

    def test_no_readiness_from_structural_success(self):
        result = audit(export(self.rows))
        self.assertEqual(result["integrity_issues"], [])
        self.assertFalse(result["training_ready"])
        self.assertFalse(result["cross_split_check_applicable"])
        self.assertIn("missing_validation_pool_or_labels", result["blockers"])
        self.assertIn("human_label_and_template_review_required", result["blockers"])

    def test_boolean_and_fractional_scores_are_not_integers(self):
        for score in (True, 1.5, -1, 4, "3"):
            with self.subTest(score=score):
                self.rows[-1]["relevance_score"] = score
                self.assertIn("invalid_score", self.codes(self.rows))

    def test_schema_drift_and_duplicate_skills(self):
        for field, value, code in (("skills", "Coaching", "invalid_skills"),
                                   ("skills", ["Coaching", " coaching "], "duplicate_skill"),
                                   ("role", "admin", "invalid_role"),
                                   ("bio", None, "invalid_string")):
            rows = copy.deepcopy(self.rows)
            rows[0][field] = value
            self.assertIn(code, self.codes(rows))
        self.rows[0]["full_name"] = "Unexpected field"
        self.assertIn("unexpected_field", self.codes(self.rows))

    def test_invalid_pair_metadata(self):
        self.rows[-1]["ambiguity_flag"] = "false"
        self.rows[-1]["annotation_status"] = "human_reviewed"
        self.assertTrue({"invalid_boolean", "unsupported_annotation_status"} <= self.codes(self.rows))

    def test_duplicate_pair_and_conflicting_score(self):
        self.rows.append(pair(score=0))
        self.assertTrue({"duplicate_pair_id", "duplicate_person_pair", "contradictory_pair_score"} <= self.codes(self.rows))

    def test_reference_integrity(self):
        for field, value, code in (("mentor_id", "absent", "missing_person_reference"),
                                   ("mentor_id", "mentee-a", "wrong_reference_role"),
                                   ("split", "test", "pair_profile_split_mismatch")):
            rows = copy.deepcopy(self.rows)
            rows[-1][field] = value
            self.assertIn(code, self.codes(rows))

    def test_duplicate_identity_across_splits(self):
        self.rows.append(profile("mentor-a", "mentor", "test"))
        result = audit(export(self.rows))
        self.assertIn("mentor-a", result["cross_split_people"])
        self.assertIn("cross_split_identity_or_text_overlap", result["blockers"])

    def test_normalised_text_overlap_across_splits(self):
        duplicate = copy.deepcopy(self.rows[0])
        duplicate.update(person_id="different-id", split="test")
        duplicate["bio"] = duplicate["bio"].upper() + "!!!"
        self.rows.append(duplicate)
        result = audit(export(self.rows))
        self.assertTrue(result["normalised_duplicate_profiles"][0]["cross_split"])

    def test_near_overlap_flagged_without_claiming_paraphrase_clearance(self):
        duplicate = copy.deepcopy(self.rows[0])
        duplicate.update(person_id="different-id", split="test")
        duplicate["bio"] += " additional"
        self.rows.append(duplicate)
        result = audit(export(self.rows))
        self.assertTrue(any(r["cross_split"] for r in result["near_duplicate_candidates"]))

    def test_graph_components_and_unjudged_candidate_denominator(self):
        self.rows += [profile("mentor-b", "mentor"), profile("unused", "mentor"),
                      pair("pair-b", mentor="mentor-b", score=1)]
        result = audit(export(self.rows))
        self.assertEqual([len(c) for c in result["connected_components"]], [3, 1])
        self.assertEqual(result["unused_mentors"], ["unused"])
        self.assertEqual(result["splits"]["train"], {"mentors": 3, "mentees": 1, "pairs": 2, "possible_pairs": 3})

    def test_privacy_triage_has_no_raw_content(self):
        self.rows[0]["bio"] = "Contact fixture@example.invalid"
        result = audit(export(self.rows))
        self.assertEqual(len(result["privacy_pattern_flags"]), 1)
        self.assertNotIn("fixture@example.invalid", json.dumps(result))

    def test_input_builder_excludes_labels_and_identifiers(self):
        self.assertEqual(profile_text(self.rows[0]),
                         "mentor-a career guidance\nmentor-a practical learning\nSkills: Coaching\nIndustry: Education")
        self.assertNotIn("annotation_status", profile_text(self.rows[0]))

    def test_cli_is_read_only_and_refuses_overwrite_and_wrong_hash(self):
        script = Path(__file__).with_name("audit_export.py")
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.md"
            original = export(self.rows)
            source.write_bytes(original)
            output = Path(directory) / "audit"
            command = [sys.executable, "-B", str(script), str(source), "--output-dir", str(output)]
            run = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(run.returncode, 2, run.stderr)
            saved = (output / "audit.json").read_bytes()
            self.assertEqual(json.loads(saved)["source_sha256"], hashlib.sha256(original).hexdigest())
            again = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(again.returncode, 1)
            self.assertEqual((output / "audit.json").read_bytes(), saved)
            wrong = subprocess.run(command[:-2] + ["--expected-sha256", "0" * 64], capture_output=True, text=True)
            self.assertEqual(wrong.returncode, 1)
            self.assertEqual(source.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
