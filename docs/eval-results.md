# Matching Engine Evaluation

Run date: 2026-07-05 · dataset seed: 42/1337 (deterministic)

## Method

- **Corpus:** 40 synthetic mentors across 8 career domains (5/domain), seeded through the production pipeline (Supabase auth trigger → profile → server-side MiniLM embedding → pgvector, ivfflat index).
- **Queries:** 24 synthetic mentees (3/domain). Mentee goal statements are written in natural language and deliberately do not always reuse mentor skill vocabulary.
- **Ground truth:** a returned mentor is *relevant* iff their generator domain equals the mentee's.
- **Conditions:**
  - `semantic-full` - pgvector cosine similarity (`match_mentors`) over the full mentee profile.
  - `semantic-minimal` - cold-start simulation: headline + skills only (no bio/industry), as at first sign-up.
  - `keyword+category` - ranked PostgreSQL full-text search (`search_mentors`, ts_rank) over the mentee's skills **and industry** as an OR query. The industry term makes this a category/attribute-filtering baseline (what commercial alumni platforms do).
  - `keyword-skills-only` - the same full-text search over skills alone: pure keyword matching with no category signal.
- **Metrics:** Precision@1/3/5 (fraction of relevant mentors in top k), MRR (reciprocal rank of first relevant), coverage (fraction of mentees receiving ≥1 scoreable result). Pre-existing unlabelled dev mentors remain in the pool as noise but are excluded from scoring.

Mentees are additionally split by whether any of their listed skill words
appear verbatim in their domain's mentor skill vocabulary (**lexical-overlap**)
or not (**vocab-mismatch** - same field, different words).

## Results

### All mentees

| Condition | n | P@1 | P@3 | P@5 | MRR | Coverage |
|---|---|---|---|---|---|---|
| semantic-full | 24 | 0.833 | 0.806 | 0.742 | 0.889 | 1.000 |
| semantic-minimal | 24 | 0.708 | 0.667 | 0.650 | 0.782 | 1.000 |
| keyword+category | 24 | 0.917 | 0.944 | 0.842 | 0.951 | 1.000 |
| keyword-skills-only | 24 | 0.708 | 0.694 | 0.525 | 0.729 | 0.875 |

### Lexical-overlap subset

| Condition | n | P@1 | P@3 | P@5 | MRR | Coverage |
|---|---|---|---|---|---|---|
| semantic-full | 18 | 0.889 | 0.778 | 0.733 | 0.908 | 1.000 |
| semantic-minimal | 18 | 0.722 | 0.704 | 0.689 | 0.788 | 1.000 |
| keyword+category | 18 | 0.944 | 0.963 | 0.811 | 0.972 | 1.000 |
| keyword-skills-only | 18 | 0.944 | 0.926 | 0.700 | 0.972 | 1.000 |

### Vocab-mismatch subset

| Condition | n | P@1 | P@3 | P@5 | MRR | Coverage |
|---|---|---|---|---|---|---|
| semantic-full | 6 | 0.667 | 0.889 | 0.767 | 0.833 | 1.000 |
| semantic-minimal | 6 | 0.667 | 0.556 | 0.533 | 0.764 | 1.000 |
| keyword+category | 6 | 0.833 | 0.889 | 0.933 | 0.889 | 1.000 |
| keyword-skills-only | 6 | 0.000 | 0.000 | 0.000 | 0.000 | 0.500 |

## Reading the results

- **Two keyword baselines, deliberately.** `keyword+category` is a strong
  attribute-filtering baseline: the industry term alone routes it to the
  right sector, which is what commercial platforms' category filters do.
  `keyword-skills-only` is pure keyword matching. Comparing semantic against
  both separates "structured category data helps" from "word overlap helps".
- **The subsets are the story.** When mentees use the same words as mentors,
  keyword matching is hard to beat. When they describe the same field in
  different vocabulary (the common case for early-career users who do not
  yet know the field's terminology), pure keyword matching degrades - look
  at `keyword-skills-only` coverage and precision on the vocab-mismatch
  subset - while semantic matching holds.
- **semantic-minimal vs semantic-full** quantifies cold-start resilience: how
  much match quality a brand-new, sparse profile (headline + skills only)
  retains relative to a completed one.

Reproduce with `node scripts/eval/run-eval.mjs` against a local Supabase stack.
