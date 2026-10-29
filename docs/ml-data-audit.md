# Synthetic source audit

Verified locally on 29 October 2026 using `ml/audit_export.py`, Python 3.14.7.
Source revision: SHA-256
`b3834c04f989e18d9b392f6bf51fdb6608768add1a4b0c7abf0b4b9f058665bb`.
Source location and original intake remain in [ml-source-intake.md](ml-source-intake.md).
The original was read without modification. No transcript or profile text is copied here.

## Observed integrity and coverage

| Check | Observed result | Interpretation |
| --- | --- | --- |
| Fenced JSONL | 2 blocks, 60 profiles, 60 pairs | Prose is excluded; the source heading's 59-pair claim is incorrect |
| Schema, types, IDs and references | 0 errors | Structural consistency only |
| Roles | 40 Mentors, 20 Mentees | Every person is in training |
| Labels by grade | 0: 19, 1: 14, 2: 8, 3: 19 | A sample distribution, not a target quota |
| Review status | 60 machine-generated, pending human review | No independently approved labels |
| Validation/test | 0 profiles and 0 pairs in each | Cross-split leakage clearance is not possible |
| Candidate judgments | 60 / (20 × 40) = 7.5% of training-pool pairs | The other 740 pairs are unjudged, not negative |
| Unused Mentors | 3 / 40 = 7.5% | `MTR-TRN-017`, `MTR-TRN-030`, `MTR-TRN-039`; source's claim of 6 is incorrect |
| Pairs per Mentee | 3 for all 20 | Deliberately sampled trios are not a full retrieval test |
| Pairing graph | Components of 28, 16, 9, 4, 1, 1, 1 people | Random pair splitting would reuse people; grouping only by Mentee is insufficient |
| Normalized duplicates | 0 among 1,770 profile comparisons | Within this source only |
| Token Jaccard at least 0.65 | 0 candidate profile pairs | Does not establish absence of semantic paraphrases or shared templates |
| Limited privacy pattern scan | 0 flags | Does not certify privacy, stereotypes or realism |

The graph counts include all 60 profiles, including the three unused singleton
Mentors. Changing split labels without regrouping whole connected components
would break strict person separation. The current training-only source remains
unchanged; no automatic repartition or regeneration was performed.

## Risks that block a defensible experiment

| Risk | Evidence and consequence | Required action |
| --- | --- | --- |
| High: no held-out evaluation | All records are training; no independent validation/test pool | Define the protocol, then create disjoint people/template pools and freeze before model selection |
| High: label leakage through metadata | All 22 grades 1/2 have ambiguity true; all 38 grades 0/3 have false | Keep ambiguity, rationale, IDs, split and annotation status outside features |
| High: unreviewed synthetic labels | All 60 await human review | Review against the source rubric; record adjudication without silently replacing original labels |
| High: incomplete retrieval judgments | Only 3 of 40 candidates judged for each query | Judge a complete bounded candidate pool before reporting retrieval metrics; preserve ranks |
| Medium: correlated wording/templates | Token overlap cannot establish conceptual independence | Review repeated offers, negations, sparse profiles and mirrored goals manually |
| Medium: representativeness | Generated cross-industry pilot, not sampled users or airline-provided data | Describe a controlled synthetic task; avoid claims about Kenya Airways participant outcomes |

The source's proposed changes to `PAIR-TRN-008`, `015`, `029`, `035`, `038`,
`055` and `056` are a useful review queue, not accepted corrections. Review the
actual profiles and primary-goal evidence. Do not downgrade grades, remove
refusals or rebalance labels merely because the generating assistant suggested it.
Neither this script nor the generating model is a human domain reviewer.

## Reproduction and verification

Use the command in [ml/README.md](../ml/README.md) with the original source.
The verified local run wrote an audit outside the repository and returned **2**,
meaning the audit completed and correctly blocked research readiness. Blockers:
missing validation pool, missing test pool, human/template review, protocol/freeze.

- 15 regression tests passed, including malformed JSON, schema/type corruption,
  identity/text overlap, contradictory labels, graph/candidate counts, source
  immutability, source-hash mismatch and refusal to overwrite previous evidence.
- A separate direct parse and graph traversal independently confirmed counts,
  score/ambiguity cross-tab, unused Mentors and component sizes.
- Repeated audit output matched exactly; source SHA-256 remained unchanged.
- No model training, Supabase access, new generated records or historical
  evaluation rerun was performed. Existing negative evaluation evidence is preserved.

M1 and M2 remain partial. The model initialization requirement, human review,
held-out generation, full judgments and dataset freeze are still open gates.
