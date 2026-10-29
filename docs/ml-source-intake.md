# Gemini export · structural intake

Inspected: 15 October 2026. This is a structural inventory, not a completed
semantic label review, leakage audit or approval for training.

Source: `/Users/omarsiddique/Downloads/gemini-code-1792051880941.md`

SHA-256: `b3834c04f989e18d9b392f6bf51fdb6608768add1a4b0c7abf0b4b9f058665bb`

The supplied file was read without changing it. Its embedded prompts, generation
instructions and proposed corrections were treated as source material, not executed.
The raw conversation has not been copied into the repository.

| Observation | Parsed result |
| --- | --- |
| Profile records | 60 |
| Mentors | 40 |
| Mentees | 20 |
| Labelled pairs | 60 |
| Split values | All profiles and pairs marked train |
| Validation/test records | None found among the inline JSON records |
| Score counts | {0: 19, 1: 14, 2: 8, 3: 19} |
| Duplicate person IDs | 0 |
| Pairs referencing absent people | 0 |

Records were identified by parsing whole lines starting with a JSON object and
classifying person_id versus pair_id. Full schema validation, identity/text
consistency, duplicate/paraphrase checks and label-rubric review remain pending.
No model was trained; no train/validation/test freeze was made.

The conversation includes Gemini-generated audit assertions about negation,
mirrored wording, ambiguity flags and label consistency. They are hypotheses to
verify against records, not independently established findings. Preserve the
original labels and review each proposed correction; do not mechanically rebalance
scores or change a valid label just to meet a desired class quota.

Next: perform M1 protocol decisions and M2 data audit in `ml-delivery-plan.md`.

## Reproducible follow-up, 29 October 2026

`ml/audit_export.py` confirms the original hash and counts, schema/reference
integrity, score distribution and pending machine annotations. It corrects the
source's unused-Mentor count to three and confirms that ambiguity perfectly
separates grades 1/2 from 0/3. Validation and test remain absent. Duplicate and
lexical similarity checks do not clear conceptual templates or ungenerated pools.
See [the findings and research gates](ml-data-audit.md). The original source and
labels remain unchanged; no human approval, data freeze or training is claimed.
