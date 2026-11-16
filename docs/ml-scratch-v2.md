# From-scratch model, version 2 · 16 November 2026

**Two experiments. The first (a bag-of-features neural encoder) is a negative result. The second (a learned
reweighting of TF-IDF) is the first trained model in this project that does not fall below the TF-IDF
baseline on the machine-labelled validation pools, by a margin too small to call an improvement.**

Both are engineering pilots on unreviewed machine labels, with five validation queries. Neither is research
evidence, neither selects a final model, and the test split was not opened.

## Why this work

After the sprint demo, the advice was to make the model better. The recorded v1 pilot (a character CNN
trained from random weights) scored well below TF-IDF on validation, and the GBDT ranker pilot (#98) was also
below TF-IDF. Before trying anything new, the v1 trainer was read for causes:

1. A 32-filter character CNN with max pooling has a weak bias for matching related wording.
2. It learned with mean squared error on one pair at a time, which is not how ranking is used.
3. Checkpoints were chosen by that validation loss, not by ranking quality.
4. The GBDT write-up found that validation Mentees share **no exact skill strings** with validation Mentors.
   TF-IDF still works because character n-grams match related words.

## Shared protocol

- Data: `pilot-machine-v1` (60 training pairs over 20 Mentees with 3 candidates each; 5 validation Mentees
  each judged against all 10 validation Mentors). Inputs are headline, bio, skills and industry only.
- Learned preprocessing (vocabularies, TF-IDF statistics) is fitted on training profiles only, and refitted
  inside every cross-validation fold.
- Selection: a small grid fixed before running, five-fold cross-validation grouped by Mentee on the training
  split, five seeds (42 to 46), best mean epoch. The validation split is scored once per seed after
  selection. Unjudged combinations are never used as negatives. `load_jsonl` refuses any test file.
- Code: `ml/train_scratch_v2.py` and `ml/train_reweighted_tfidf.py`, with tests in
  `ml/training_tests/test_scratch_v2.py` and `test_reweighted_tfidf.py`. Runs are in the ignored
  `ml/runs/scratch-v2-2026-11-16` and `ml/runs/reweighted-tfidf-2026-11-16`, each with `metrics.json`,
  per-seed validation results, selection curves and a copy of the implementation (SHA-256 prefixes
  `c43a21dbb48c` and `6a90b73c60f2`).

## Experiment A: bag-of-features neural encoder (negative)

| Part | Choice |
| --- | --- |
| Input | Word unigrams and bigrams plus character 3 to 5 grams (13,192 training features) |
| Encoder | Randomly initialised `EmbeddingBag` (mean), separate Mentee and Mentor heads, L2 normalised |
| Warm-up | Optional contrastive training on two thinned views of each training profile (no labels) |
| Loss | ListNet over each Mentee's judged pool |
| Grid | Dimension 32 or 64; warm-up on or off |
| Chosen | Dimension 32, no warm-up, 23 epochs (424,257 parameters) |

Cross-validation on the training split looked strong (mean nDCG@5 about 0.80 for every setting), but training
pools have only three candidates, so that number is easy to reach. On validation the model failed:

| Validation (5 queries) | TF-IDF | v1 character CNN | A: bag encoder (mean of 5 seeds, sd) |
| --- | ---: | ---: | ---: |
| nDCG@5 | 0.853932 | 0.502278 | 0.278 (0.033) |
| Precision@1 | 0.800 | 0.200 | 0.040 (0.089) |
| MRR@5 | 0.840 | 0.433 | 0.197 (0.045) |
| Relevant hit@5 | 1.000 | 0.800 | 0.440 (0.089) |

The likely reason is scale: one vector per feature cannot be learned from 60 judged pairs, and features seen
only in validation profiles are dropped. The contrastive warm-up did not help. This result is kept.

## Experiment B: learned TF-IDF reweighting (no worse than TF-IDF)

Designed **after** seeing experiment A, which is disclosed here because it means this design was informed
by a validation result.

`score = cosine(w_q * tfidf(mentee), w_m * tfidf(mentor))`. The TF-IDF settings are the recorded baseline's
(character 3 to 5 grams, fitted on training profiles). The model learns one non-negative weight per n-gram
for each side (40,038 weights), starting at 1 plus small random noise, so the untrained model ranks almost
exactly like TF-IDF. A penalty (`anchor`) pulls weights back towards 1. Loss is ListNet. Grid: anchor 0.1, 1
or 10. Chosen: anchor 0.1, 9 epochs; about 47% of Mentee-side weights moved by more than 0.05.

| Validation (5 queries) | TF-IDF | B: reweighted TF-IDF (5 seeds) |
| --- | ---: | ---: |
| nDCG@5 | 0.853932 | 0.870903 |
| Precision@1 | 0.800 | 0.800 |
| Precision@3 | 0.267 | 0.267 |
| MRR@5 | 0.840 | 0.850 |
| Relevant hit@5 | 1.000 | 1.000 |

All five seeds gave identical rankings (the initial noise is too small to change the order). In
cross-validation the learned weights also edged TF-IDF (0.9897 against 0.9872).

What this does and does not show:

- It is the first trained model here that does not score below TF-IDF on these pools.
- The gain (+0.017 nDCG@5, +0.01 MRR, no change in Precision@1) is far too small to separate from noise with
  five queries and machine labels. It is **not** evidence that the model is better than TF-IDF.
- It is trained from scratch in the sense that it loads no pretrained weights or components. It is not
  randomly initialised in the usual sense: it deliberately starts from TF-IDF behaviour. **Whether this
  counts as "own model trained from scratch" for the assessment (#1, #25) is a decision for the student and
  supervisor**, not something this document settles.

## What would actually make the model better

Both results point the same way as the earlier pilots: the limit is the data, not the architecture.

1. **Reviewed, larger labels.** 60 machine-graded training pairs and 5 validation queries cannot support or
   measure a learned model. The human review under #3 and a larger, more varied labelled set come first.
2. **Validation pools that look like use.** Training pools have 3 candidates and validation pools 10, with
   very different grade mixes, so cross-validation on training is optimistic.
3. Only then: repeat experiment B (and any graph contribution from #27) with a locked protocol, and open the
   test split once.

## Status

- Not integrated into the live app. The experimental comparison still serves the v1 checkpoint.
- No hosted change, no test-split access, no participant data.
