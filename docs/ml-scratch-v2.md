# From-scratch model, version 2 · 16 November 2026

**Two experiments on the machine-labelled pilot data. A (a bag-of-features neural encoder trained from random
weights) collapsed and scored below random. B (a learned reweighting of TF-IDF) matches the TF-IDF baseline;
its small edge is not evidence of improvement.**

Both are engineering pilots on unreviewed machine labels with five validation queries. Neither is research
evidence, neither selects a final model, and the test split was not opened.

## Why this work

After the sprint demo, the advice was to make the model better. The recorded v1 pilot (a character CNN from
random weights) and the GBDT ranker (#98) both scored below TF-IDF. Reading the v1 trainer suggested four
causes worth testing: a weak architecture for matching related wording, a pointwise mean squared error loss,
checkpoint selection by that loss rather than by ranking quality, and the GBDT finding that validation Mentees
share no exact skill strings with validation Mentors (character n-grams are what let TF-IDF still match them).

## Protocol

- Data: `pilot-machine-v1`. Training: 60 judged pairs, 20 Mentees with 3 candidates each. Validation: 5 Mentees,
  each judged against all 10 validation Mentors. Inputs are headline, bio, skills and industry only.
- Learned preprocessing (feature vocabulary, TF-IDF statistics) is fitted on training profiles only and refitted
  inside every cross-validation fold.
- Selection: a grid fixed before the first run, five folds on the training split, five seeds (42 to 46), best
  mean epoch. Folds hold out Mentees **and** drop fit pairs that use a Mentor from the held-out fold, so neither
  side of a held-out pair is seen in training (`fold_split`). On the real data each fold fits on 37 to 43 of
  the 60 pairs; the final model then trains on all 60 for the chosen number of epochs. One epoch is one
  full-batch Adam step over every judged pool. Unjudged combinations are never used as negatives.
- The validation split is scored only after selection, once per seed. Tests prove that changing validation
  grades changes neither the selection nor the trained weights, that only the four training and validation files
  are opened, and that runs are identical for the same seed.
- Code: `ml/train_scratch_v2.py`, `ml/train_reweighted_tfidf.py`; tests in `ml/training_tests/test_scratch_v2.py`,
  `test_reweighted_tfidf.py` and `test_v2_protocol.py`. Runs (ignored, private): `ml/runs/scratch-v2-disjoint-2026-11-16`
  and `ml/runs/reweighted-tfidf-disjoint-2026-11-16`, recorded from commit `392afe7` with a clean tree
  (implementation SHA-256 prefixes `cba454837b2a` and `fa076f7b992e`; the dirty-tree flag covers the `ml/`
  folder). Each run keeps its metrics, selection
  curves, every validation ranking and score, data hashes, timings and the trained checkpoint.

**Disclosure: validation was scored twice for each experiment.** The first runs (kept as
`ml/runs/scratch-v2-2026-11-16` and `reweighted-tfidf-2026-11-16`) grouped folds by Mentee only, so most held-out
Mentors were also in the fit folds, which `ml-experiment-protocol.md` forbids. Review found this, the folds were
fixed, and both experiments were rerun with the same grids. No setting was changed in response to either
validation result. Experiment B itself was designed after seeing experiment A's first validation result.

## Baselines on the same validation pools

| Validation (5 queries) | Random (mean of 100 seeds) | TF-IDF | v1 character CNN |
| --- | ---: | ---: | ---: |
| nDCG@5 | 0.324875 | 0.853932 | 0.502278 |
| Precision@1 | 0.136 | 0.800 | 0.200 |
| MRR@5 | 0.276 | 0.840 | 0.433 |
| Relevant hit@5 | 0.568 | 1.000 | 0.800 |

Random and TF-IDF figures are from `ml-gbdt-ranker.md`. On the 3-candidate training pools, random ordering has an
expected nDCG@5 of about 0.774 and TF-IDF scores about 0.983 in these folds, so cross-validation numbers sit in a
narrow, high band and must be read against those two references.

## Experiment A: bag-of-features neural encoder (collapsed, below random)

| Part | Choice |
| --- | --- |
| Input | Word unigrams and bigrams plus character 3 to 5 grams fitted on training profiles, with a padding index |
| Encoder | Randomly initialised `EmbeddingBag` (mean, std 0.1), separate Mentee and Mentor linear heads, L2 normalised |
| Warm-up | Optional contrastive training on two thinned views of each training profile (no labels) |
| Loss and optimiser | ListNet over each Mentee's judged pool; Adam, learning rate 0.005, feature dropout 0.2 |
| Grid | Dimension 32 or 64; warm-up on or off |
| Chosen | Dimension 32, no warm-up, 8 epochs (424,289 parameters); cross-validation nDCG@5 0.852 |

| Validation | A (mean of 5 seeds, sd) |
| --- | ---: |
| nDCG@5 | 0.301 (0.049) |
| Precision@1 | 0.080 (0.110) |
| MRR@5 | 0.244 (0.074) |
| Relevant hit@5 | 0.560 (0.089) |

A is below random on every measure. The run's collapse diagnostic explains why: 98.6% of the variance in its
scores comes from each Mentor's average score, and ranking Mentors by that average alone, ignoring the Mentee,
gives exactly the same nDCG@5 (0.301). In other words the model gives every Mentee nearly the same Mentor order.
A likely cause is that the averaged feature vectors are small next to the biases of the linear heads, and a few
full-batch updates on 60 pairs mostly learn a Mentor-level preference. This is a failure of this architecture
and training setup on this data, not only a data limit, and it is kept as a negative result. The contrastive
warm-up did not help.

## Experiment B: learned TF-IDF reweighting (matches TF-IDF)

`score = cosine(w_q * tfidf(mentee), w_m * tfidf(mentor))`, with the recorded baseline's TF-IDF settings
(character 3 to 5 grams, fitted on training profiles). The model learns one non-negative weight per n-gram for
each side (40,038 weights), starting at 1 plus noise of standard deviation 0.01, so the untrained model ranks
almost exactly like TF-IDF. A penalty (`anchor`, applied to the mean squared distance of the weights from 1)
pulls them back towards TF-IDF. ListNet loss with a fixed logit scale of 10; Adam, learning rate 0.05; 40-epoch
budget. Grid: anchor 0.1, 1 or 10. Chosen: anchor 1, 25 epochs; about 23% of Mentee-side weights moved by more
than 0.05. The checkpoint stores its vocabulary and idf values and reloads on its own.

| Validation (5 queries) | TF-IDF | B (5 seeds, identical rankings) |
| --- | ---: | ---: |
| nDCG@5 | 0.853932 | 0.862697 |
| Precision@1 | 0.800 | 0.800 |
| Precision@3 | 0.267 | 0.267 |
| MRR@5 | 0.840 | 0.850 |
| Relevant hit@5 | 1.000 | 1.000 |

In cross-validation B scored 0.9846 against TF-IDF's 0.9834 in the same folds. That figure is the best epoch of
the best of three settings, so it is optimistic. The selection curves start at the TF-IDF level (about 0.982);
with anchor 1 and 10 they stay within a few thousandths of it, while with anchor 0.1 longer training falls
below TF-IDF (as low as 0.973, ending at 0.977 after 40 epochs).

What this shows:

- B is the first trained model here that does not score below TF-IDF on these pools.
- The differences (+0.009 nDCG@5, +0.01 MRR, no change in Precision@1) are far too small to separate from noise
  with five queries and machine labels. **B matches TF-IDF; it is not shown to be better.**
- B loads no pretrained weights or components, but it deliberately starts from TF-IDF behaviour rather than from
  random weights in the usual sense. **Whether it counts as "own model trained from scratch" for the assessment
  (#1, #25) is a decision for the student and supervisor.**

## What would actually make the model better

1. **Reviewed, larger labels (#3).** 60 machine-graded training pairs cannot train a neural encoder from random
   weights (experiment A), and 5 validation queries cannot measure a small improvement (experiment B).
2. **Training pools that look like use.** Training pools have 3 candidates and validation pools 10, with very
   different grade mixes, so cross-validation on training is optimistic and compressed near the top.
3. **If a neural encoder from random weights is still wanted:** fix A's collapse first (for example, remove or
   regularise the head biases and check the query-independence diagnostic before reading any metric), then
   retest on the reviewed data.
4. Only then: lock one model and protocol, and open the test split once.

## Status

- Not integrated into the live app; the experimental comparison still serves the v1 checkpoint.
- No hosted change, no test-split access, no participant data.
