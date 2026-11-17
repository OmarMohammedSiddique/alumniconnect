# Overnight ML run: morning summary · 17 November 2026

The full write-up is [`../ml-scratch-v3.md`](../ml-scratch-v3.md); the dataset is described in
[`../ml-synth-v3-data-card.md`](../ml-synth-v3-data-card.md).

## What was done

1. **Dataset `synth-v3`** (issue #114, now closed): 2,400 fictional Mentors and 1,200 fictional Mentees built
   from the O*NET 30.2 taxonomy, graded 0 to 3 by a fixed rule, worded by Claude Haiku. Full target size,
   nothing dropped. Private, in `ml/data/synth-v3/`, backup in `ml/artifacts/`.
2. **One evaluator and four baselines** (random, TF-IDF, BM25, MiniLM as deployed).
3. **From-scratch model v3**: eight configurations trained from random weights, two finalists repeated
   with three seeds, one selected on validation, locked, tested once.
4. **Export and app integration**: v3 replaces the v1 pilot in the experimental Compare models view only.
5. **Three pull requests**, each merged after green CI: #116 (data and evaluation), #117 (model and
   training, including the lock), and the integration and documentation pull request linked from the
   closing comment on #26.

## Headline numbers (synthetic test split, 200 Mentees against 400 Mentors, scored once)

| System | nDCG@5 | 95% interval |
| --- | ---: | --- |
| Random | 0.042 | |
| MiniLM (frozen) | 0.271 | 0.242 to 0.303 |
| BM25 | 0.308 | 0.274 to 0.344 |
| TF-IDF | 0.332 | 0.298 to 0.367 |
| **Scratch v3** | **0.337** | 0.298 to 0.376 |

- Better than MiniLM (difference +0.066, interval 0.020 to 0.112).
- Not distinguishable from TF-IDF (+0.005, interval -0.041 to 0.051) or BM25.
- On occupations seen in training: better than both MiniLM and TF-IDF (0.412 against 0.271 and 0.316).
- On occupations never seen in training: **worse than both** (0.200 against 0.276 and 0.370).
- Model: convolutional encoder, 597,632 parameters, 2.3 MB, about 10 ms per comparison locally.

Say this carefully in the report: the benchmark is synthetic and in-domain, which favours a model trained
on it, and the labels are generated, not human-reviewed. It does not show the model is better for real alumni.

## What failed or went wrong (all disclosed in the write-up)

- **The first model design collapsed** exactly as v2-A did. This was caught in a smoke test on training data
  before any validation data was read, and fixed by centring the pooled features.
- **The dataset gate caught a real leak**: 75 Mentees aimed for occupations in clusters held out for a later
  split. They were re-targeted and rewritten before any model was trained.
- **Transformer encoders lost to the convolutional ones** at both widths; the two wide ones hit the 24 minute
  cap. Pre-training made no reliable difference.
- **Machine audit agreement is only moderate** (exact 51%, within one grade 91%, weighted kappa 0.67). The
  rule-based grades are noisier than is comfortable.
- **Seed-to-seed spread is about 0.03 nDCG@5**, so the two finalists are effectively tied.
- The run record of the locked model flags the `ml` folder as not clean because an untracked development
  export folder was present; no tracked file differed from the commit.
- The preview tool could not be used for the local server because it reads the main checkout's launch file,
  which was off limits for this run; the built app was served from the worktree with a plain command instead.

## What to check by hand

1. **Hosted site, signed in** (the run did not sign in to production): open Discover, Compare models. The right
   column should read "Your trained model (v3) · Experimental" with version `scratch-v3:8c918ddf78e3`, show
   five Mentors and a time in milliseconds. If it shows "unavailable", the model file did not reach the
   deployment; check the function's file tracing in `next.config.ts`.
2. **Grade the blind sheet** `ml/data/synth-v3/human_review_sheet.csv` using
   `HUMAN_REVIEW_INSTRUCTIONS.md` beside it (issue #115). About two to three hours. Do not open
   `test_human_review_key.csv` first.
3. **Read section 9 of the write-up** and take those questions to your supervisor.
4. Skim the examples in the data card and the error examples in section 7 to judge whether the profiles and
   grades look sensible.

## What is still open

- #25 and #3: human review and supervisor acceptance. Not closed.
- #26: the scratch model is in the comparison only. It does not drive the default Recommended list and no
  stored vectors were migrated (out of scope by your decision). Not closed.
- #115: human review of the gold sheet.
- Follow-up issue for unfinished work: see the closing comment on #25.

## Where things are

| Thing | Place |
| --- | --- |
| Runs (all 15 kept, losers included) | `.claude/worktrees/ml-v3/ml/runs/` (ignored by Git) |
| Locked run | `ml/runs/v3-grid-conv-w128-pre-s42/` with `LOCK.json` (committed) and `test/` |
| Dataset and review sheet | `.claude/worktrees/ml-v3/ml/data/synth-v3/` |
| Backup | `.claude/worktrees/ml-v3/ml/artifacts/synth-v3-355ff8977a29.zip` |
| Exported model | `ml/models/scratch-v3/` (committed) |
| Screenshots and curves | `docs/verification/ml-scratch-v3/` |

The private dataset, runs and backup live only in the `ml-v3` worktree folder. Copy them somewhere durable
before that worktree is removed.
