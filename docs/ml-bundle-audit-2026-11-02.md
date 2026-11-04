# Independent synthetic pilot audit · 2 November 2026

**Verdict: usable for a pipeline rehearsal after label review; not approved as
final evidence of model quality. No model was trained and no source was edited.**

Source directory: `/Users/omarsiddique/.gemini/users/user2/alumniconnect_pilot_dataset`.
The dataset is a synthetic profile-relevance simulation, not observed mentorship outcomes.
The original conversation and proposed corrections are reference material, not executed instructions.

## Verified structure

| Split | Mentors | Mentees | Labelled pairs | Grades 0 / 1 / 2 / 3 |
| --- | --- | --- | --- | --- |
| Training | 40 | 20 | 60 | 19 / 14 / 8 / 19 |
| Validation | 10 | 5 | 50 | 42 / 2 / 2 / 4 |
| Test | 10 | 5 | 50 | 40 / 3 / 2 / 5 |

Independent code confirmed:

- 90 unique person IDs, 160 unique pair IDs; schema/roles/score types/references/split
  membership checks found no structural errors.
- Both mentor and mentee IDs are disjoint across splits. ID separation does not
  independently prove that fictional people or conceptual scenarios are distinct.
- Validation and test contain all 50 combinations each. Training has 60 of 800
  combinations judged; the remaining 740 remain unjudged, not negative.
- No normalized exact full-profile or biography duplicates. Across 2,025 cross-split
  comparisons, maximum token-set Jaccard was 0.1216 after the script's stated stopwords.
  This surface-overlap screen cannot certify semantic/template independence.
- Every listed manifest file hash matches. All 27 proposed corrections have original
  field values consistent with their referenced records; this does not approve the fixes.
- All 160 human-review rows correspond to the correct profile texts/skills, contain
  no generated-score/rationale columns, and have blank human review entries.
- Parsed original training profiles and pair annotations equal the earlier export.

## Findings and actions

| Severity / confidence | Finding and evidence | Consequence and action |
| --- | --- | --- |
| High / confirmed | 160/160 labels remain machine-generated; zero human entries | Scores cannot be called human relevance ground truth. Review the rubric and annotate the blinded sheet; preserve generated labels separately. |
| High / confirmed | Training ambiguity flag is true exactly for all 22 grade-1/2 pairs and false for all 38 grade-0/3 pairs | Including it leaks label information. Only headline, bio, skills and industry may enter input builders; rationale/IDs/splits/status stay outside features. No actual training loader exists yet, so future enforcement is still required. |
| High / confirmed limitation | Only 60 training pairs over 20 mentees; only 5 validation and 5 test queries | Supports pipeline debugging, not reliable claims about a from-scratch language encoder. Use learning curves and independently reviewed expansion before claiming useful generalization; there is no universal sufficient row count. |
| Medium / confirmed | Validation has 42/50 grade-0 pairs; test has 40/50 | An always-0 predictor would get 84%/80% exact-grade accuracy. Those are arithmetic illustrations, not model runs. Use predeclared ranking metrics and relevant-hit coverage; do not relabel examples to manufacture balance. |
| Medium / review needed | `PAIR-TST-041` rationale invokes marine propulsion shafts, but `MTR-TST-001` text states retrofits, CFD resistance and approvals without shaft/vibration coaching | The grade-2 justification may assume unstated expertise. A human must judge the actual primary need; no automatic rescore was made. A sample review is not a full semantic audit of all 160 pairs. |
| Medium / confirmed procedural defect | Supplied validator accepts only machine-generated annotation status; README tells users to mark records human-verified and rerun it. Its CSV checks also require blank human fields | The generated validator is an intake checker, not a reviewed-dataset validator. Build a separate curated schema/validator before human-reviewed freeze; keep the blinded original immutable. |
| Medium / design constraint | Suggested cross-validation grouped by mentee alone in the README can reuse mentors across folds | Under strict person-disjoint evaluation, keep connected components together or use separately generated participant pools. Do not randomly split the 60 pair rows. |
| Medium / review needed | Several proposed corrections remove explicit mentoring exclusions from profiles | Editing a profile changes its meaning and may invalidate every incident pair label. Do not blindly apply all 27 corrections. Review all affected pairs; keep sparse/refusal examples when justified. |
| Low / confirmed | `source_transcript_preserved.md` is not byte-identical to the earlier original MD | One inspected difference omits the word 'out' in a prose calibration example. Extracted training records are equal, so this is provenance wording, not evidence of changed training data. Keep the genuine original and its hash as authoritative. |
| Unresolved | Lexical similarity, one generator's judgments and a clean manifest do not prove realism, privacy or semantic independence | Manual scenario/label review and representative evaluation remain needed. Do not label the bundle 'leakage-free'. |

The generated validator's TF-IDF similarity diagnostic uses all profile pools.
For a disposable audit-only similarity screen this is not automatically training
leakage; never reuse that fitted vocabulary/IDF in the training or baseline pipeline.
The independent audit used no learned vocabulary or pretrained model.

## Reproduce

```bash
python3 -B ml/audit_pilot_bundle.py /path/to/alumniconnect_pilot_dataset \
  --original-source /path/to/gemini-code-1792051880941.md
python3 -B -m unittest discover -s ml -p 'test_*.py'
```

`ml-pilot-bundle-audit.json` retains counts, manifest/input hashes, duplicate-screen
results and original-record equality. No private profile prose is copied there.
The independent script does not run `validate_dataset.py` and performs no network,
Supabase, generation, training or source modifications. The supplied validator was
reviewed statically; its reported 'PASSED' result was not adopted as research approval.

Verification: 21 tests passed (15 pre-existing + 6 corruption/fixture tests for the
new audit). New tests exercise missing held-out judgments, reused identities,
boolean labels, manifest corruption, review-text mismatches and a valid fixture.
The checks are intentionally bounded; they are not an exhaustive malformed-input
fuzzer or a substitute for human rubric review.

Next: `ml-next-steps.md`. Dataset freeze, baseline/training and application replacement
remain incomplete. Existing historical model-evaluation evidence was not overwritten.
