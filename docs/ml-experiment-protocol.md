# Mentorship relevance experiment protocol

**Draft v0.1, 29 October 2026. Not frozen or approved for training.**

This is the proposed M1 contract for a bounded synthetic pilot. It supports
the approved semantic matching and comparison objectives recorded in
[proposal traceability](proposal-traceability.md). The audit is in
[ml-data-audit.md](ml-data-audit.md). Model initialization, rubric approval and
held-out preparation remain open; no run or result is implied by this document.

## Question and unit of prediction

Can profile-text embeddings rank Mentors by how well their stated expertise
and mentoring offer address a Mentee's stated needs, compared with lexical
baselines over the same candidate pool?

One query is one Mentee profile snapshot; one candidate is one Mentor snapshot.
A judgment is directional Mentee-to-Mentor relevance. Similar career vocabulary
or industry alone does not establish suitability. This pilot measures judged
profile relevance, not mentorship success, retention, chemistry or eligibility.
Synthetic profiles and generated labels do not come from Kenya Airways.

## Input and label contract

Use only `headline`, `bio`, `skills` and `industry`, available at recommendation
time. Preserve the current app's construction: headline, bio, optional
`Skills: ` plus comma-separated skills, optional `Industry: ` plus industry,
joined by newlines, omitting empty values. The source has no graduation year;
do not invent one. Record this difference from the full application input.
Goals and mentoring offers remain in headline/bio; no new database fields.

Person IDs, roles, split labels, pair IDs, annotation status, rationales,
ambiguity, relevance scores and generator metadata must never enter model text.
Keep them in audit/manifests or targets. Do not generate features from future
request acceptance, connection outcomes, protected attributes or names.

The source rubric uses integer grades. This proposed operational interpretation
requires a human review before it is frozen:

| Grade | Meaning | Evidence needed from the two profiles |
| --- | --- | --- |
| 0 | Unsuitable | No supported meaningful goal/offer alignment or an explicit support mismatch |
| 1 | Weak | Tangential/secondary support, or insufficient evidence for the primary goal |
| 2 | Reasonable | Direct support for the primary goal with a material context/coverage limitation |
| 3 | Strong | Explicit primary-goal and offered-support alignment with no material stated mismatch |

For sparse profiles, record insufficient evidence rather than assuming missing
expertise. Decide generalist career-guidance cases explicitly before freezing.
Do not force strong matches for every query or alter grades to balance a quota.
Retain original generated grades and record any reviewed correction separately
with a reason and review status. Machine-generated review is not human review.

## Population, separation and judging

- Use globally consistent fictional person IDs and a dataset version with hashes.
- Keep every person in one split, considering both Mentor and Mentee references.
  For existing pairs, keep whole connected components together or generate new
  independent pools. Never split rows randomly or group by Mentee alone.
- Separate conceptual scenarios and profile templates across splits, not just
  exact strings. Use automated triage and actual manual near-duplicate review.
- Create validation/test people only after task/rubric choices are settled.
  Preserve comparable domain, sparse-profile and difficult-negative coverage;
  do not construct a held-out set to favor the chosen model.
- For each validation/test query, judge every candidate in its fixed bounded
  split-specific Mentor pool. Record a judgment matrix and stable pool manifest.
  Unknown pairs remain unknown; do not convert the current 740 unjudged pairs to 0.
- Have reviewers assess profile pairs without model rankings/scores or initial
  generated rationales visible. Record independent judgments, disagreements,
  adjudication and reviewer provenance privately under the approved process.
- Freeze held-out profiles, judgments, candidate membership and hashes before
  model selection. Integrity inspection is separate from test-performance access.

The transcript's suggested 40/20 training and 10/5 per held-out pool is only a
pilot proposal, not a validated sample-size requirement. Five held-out queries
would produce fragile estimates. Agree the attainable review budget and cohort
size before generation; do not promise population-level conclusions from it.

## Comparisons and model route

All methods receive identical profile fields, queries, candidate membership and
judgments. Save complete raw rankings with stable IDs and scores for each method.

| Method | Planned role | Status |
| --- | --- | --- |
| TF-IDF cosine | Simple lexical retrieval control; fit vocabulary/IDF on training profiles only | Proposed, not implemented |
| Skills/industry lexical conditions | Preserve comparison with keyword and category assistance | Proposed new runs; old results remain historical |
| Frozen MiniLM | Embedding baseline before project-specific fitting | App ONNX q8 inference exists; pilot baseline not measured |
| Project-specific learned encoder | Controlled comparison against the above | Initialization and training objective not selected |

**Decision needed:** does the course permit pretrained initialization? If yes,
MiniLM fine-tuning is the recommended embedding route to investigate, with a
specified loss suited to the reviewed labels. If no, define the randomly
initialized encoder/tokenizer, output width, objective and compute budget first.
Do not call a classifier an integrated semantic embedding engine. Do not select
architecture, loss, score mapping or hyperparameters from held-out performance.

Python scikit-learn provides the lexical baseline; PyTorch and, if permitted,
Sentence Transformers provide training. Colab executes a versioned notebook;
Drive retains private run evidence. These tools are planned, not installed in
this milestone. The existing [Colab guide](colab-training-workflow.md) is a
provisional fine-tuning example and must follow the selected route and this
protocol before execution. Python floating-point and app q8 inference need
separate measurements; quantization/runtime differences are not training gains.

## Proposed ranking metrics and failure policy

Confirm these definitions before the first validation comparison:

- Primary: macro nDCG@5, graded gain `2^grade - 1`, discount `log2(rank + 1)`.
  Divide DCG by the ideal ordering of the same completely judged pool. Define
  zero ideal gain as 0 and report the number of such queries explicitly.
- Secondary: P@1, P@3, P@5 using grade at least 2 as relevant. Divide by the
  stated cutoff k; unreturned slots contribute 0. For a pool smaller than k,
  report its size and the resulting ceiling rather than changing denominators.
- MRR@5 is the reciprocal rank of the first grade-at-least-2 candidate in the
  first five results, or 0 if none. Include every declared query in macro means.
- Response coverage is the fraction of all queries with any returned candidate.
  Relevant-hit coverage@5 is the fraction with a relevant top-five result.
  Neither is the fraction with any labelled result; judgment coverage is separate.
- Preserve original candidate ranks. Never remove unjudged results and compress
  positions. Incomplete judgments block formal scoring rather than becoming 0.
- Sort score ties deterministically by Mentor ID. Record failures, empty outputs,
  missing profiles and sparse-input subsets for all methods. Infrastructure
  failures invalidate the run; investigate rather than quietly dropping queries.

Save per-query and aggregate values, sample sizes and domain/input subsets.
Specify query-level uncertainty estimation and seed before final comparison;
with tiny samples emphasize per-query paired outcomes and limitations. Repeated
mentions of the same Mentor create dependence; a query bootstrap alone does not
justify a population claim. Validate metric code with hand-worked edge cases
before trusting any run. Historical domain-label scores are not directly
comparable and must not be rewritten by the new runner.

## Fitting, evidence and integration gates

Fit all learned preprocessing on training profiles only, including TF-IDF,
tokenizers/vocabularies trained locally, normalization/calibration parameters and
feature selection. Pretrained tokenizer use, if allowed, must pin its revision.
Select settings/checkpoints on validation only; record failed runs as well.

Each future run needs source commit, data/manifests/hashes, dependency versions,
model initialization/revision, seeds, input builder, configuration, device,
predictions, metrics and logs. A trained artifact must reload with its fitted
preprocessing before comparison. Lock the selected model before opening test
performance. Further tuning on test results requires a new independent final set.

An app replacement is a separate M6 milestone: compatible export, output parity,
one model version across all query/candidate vectors, complete corpus re-embedding,
latency/permissions/core-flow checks and rollback evidence. Training does not
automatically update the application or establish research superiority.

## Open gates before this becomes protocol v1

- [ ] Confirm permitted initialization and select one implementable model route.
- [ ] Approve the rubric, sparse/generalist policy, baselines and metric definitions.
- [ ] Agree review budget, independent pools and sample-size limitations.
- [ ] Complete privacy, label and conceptual-template review.
- [ ] Freeze profiles, complete judgments and manifests, with exact versions.
- [ ] Verify metric edge cases and a reproducible fresh-runtime baseline.

Primary guidance checked on 29 October:
[train-only preprocessing and leakage](https://scikit-learn.org/stable/common_pitfalls.html),
[grouped evaluation](https://scikit-learn.org/stable/modules/cross_validation.html),
[embedding training components](https://www.sbert.net/docs/sentence_transformer/training_overview.html).
