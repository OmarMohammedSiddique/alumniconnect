# Gradient boosted decision tree ranker pilot · 15 November 2026

**Negative result. On the machine-labelled validation pools the tree ranker beats
random ordering and the from-scratch neural model, but is clearly worse than the
plain TF-IDF baseline it was built on top of.**

This is an engineering pilot on unreviewed machine labels with five validation
queries. It is not research evidence, it selects no model, and the test split
was not opened.

## Purpose

Issue [#98](https://github.com/OmarMohammedSiddique/alumnikonneqt/issues/98)
asks whether a gradient boosted decision tree ranker (LightGBM with a LambdaMART
objective) is a better fit for very small labelled data than a neural encoder.
This pilot trains one on the existing `pilot-machine-v1` training split and
compares it with baselines on the same validation candidate pools, so the
question has a first measured answer instead of an expectation.

It covers the feature definition, training, comparison, feature importance and
write-up parts of #98. It does not cover the supervisor decision, the MiniLM
comparison, ONNX export or any use in the live app.

## Data

| Split | Mentees | Mentors | Labelled pairs | Pool per mentee | Grades 0 / 1 / 2 / 3 |
| --- | --- | --- | --- | --- | --- |
| Train | 20 | 40 | 60 | 3 candidates | 19 / 14 / 8 / 19 |
| Validation | 5 | 10 | 50 | all 10 mentors | 42 / 2 / 2 / 4 |

The two splits share no people. Of the 40 training mentor profiles, 37 appear
in the 60 labelled pairs. Labels are the unreviewed machine grades
described in `ml-machine-pilot-status.md`. The run records the SHA-256 of the
four data files in `config.json` (the derived data directory has no manifest).

## Features and why each is allowed

`ml/ranker_features.py` builds one row per mentee and mentor pair. Each profile
is first copied down to the four permitted input fields (`headline`, `bio`,
`skills`, `industry`), so nothing else can reach a feature. Pair records are
read only for `mentee_id` and `mentor_id`, which locate the two profiles.
Person IDs, split, relevance score, rationale and annotation fields are never
feature values; tests in `ml/training_tests/test_ranker.py` change those fields
and assert that the features do not move.

| Feature | Definition | Why it is allowed |
| --- | --- | --- |
| `tfidf_cosine` | Cosine of the two profiles' TF-IDF vectors (character 3 to 5 grams, lower-cased) over the full profile text | Uses the four input fields only. The vectoriser (20,019 terms) is fitted on the 60 training profiles only, and refuses any profile whose split is not `train`. Same settings as the recorded TF-IDF baseline. |
| `skill_jaccard` | Shared skills divided by the union of both skill lists, after case and white space normalisation | Uses `skills` only. Nothing is fitted. |
| `skill_overlap_count` | Number of shared skills | Uses `skills` only. Nothing is fitted. |
| `industry_match` | 1 when both industries are non-empty and equal after normalisation, otherwise 0 | Uses `industry` only. Nothing is fitted. |
| `mentee_skill_mention_share` | Share of the mentee's skills that appear as a whole term anywhere in the mentor's headline, bio, skills or industry | Uses the four input fields only. Nothing is fitted. |

Known limits of the whole-term matching: hyphenated compounds and plurals are
not matched (`founder` is not found in `co-founder` or `founders`), and a skill
straight after a single letter and a slash (`r/python`) is not matched.

How much signal the features carry differs sharply between the splits. Counting
pairs with a non-zero value:

| Feature | Train (60 pairs) | Validation (50 pairs) |
| --- | --- | --- |
| `tfidf_cosine` | 60 | 50 |
| `skill_jaccard` | 16 | 0 |
| `skill_overlap_count` | 16 | 0 |
| `industry_match` | 15 | 5 |
| `mentee_skill_mention_share` | 20 | 1 |

No validation mentee shares an exact skill string with any validation mentor,
and the one non-zero `mentee_skill_mention_share` value has no effect because
the fitted model never splits on that feature (see the importance table). On
validation the ranker therefore separates candidates only by `tfidf_cosine` and
`industry_match`.

## Cross-validation design and chosen hyperparameters

`ml/train_gbdt_ranker.py` trains `lightgbm.LGBMRanker` with
`objective='lambdarank'`, seed 42, `n_jobs=1`, `deterministic=True` and
`force_col_wise=True`. Repeat runs of the same code on the same data produced
identical metrics.

- Grid of 16 settings, fixed before any validation figure was seen:
  `num_leaves` (4, 8), `min_child_samples` (5, 3), `n_estimators` (20, 50),
  `learning_rate` (0.05, 0.1).
- Five folds on the training split only, grouped by mentee: the 20 training
  mentee IDs are sorted, shuffled with the seed and dealt into five groups of
  four, so a mentee's three candidates are always held out together.
- Each setting is scored by mean nDCG@5 over the five held-out folds. The
  highest mean wins, and a tie goes to the earlier (simpler) grid entry.
- The chosen setting is then fitted once on all 60 training pairs, and the
  validation pools are scored once per run. Validation labels never influence
  the model, the grid or the features. Earlier check runs during development
  gave the same validation figures as the reference run, and the grid and
  features were not changed after those figures were seen.

Chosen: `num_leaves` 8, `min_child_samples` 3, `n_estimators` 20,
`learning_rate` 0.05. Cross-validated nDCG@5 0.975139 (folds 1.000000,
0.988958, 0.991421, 0.917401, 0.977915). The 16 grid means range from 0.926983
to 0.975139.

The cross-validation figure must not be compared with the validation table
below, for two reasons. Each held-out pool has only 3 candidates, at least one
of them with a non-zero grade, so nDCG@5 covers the whole pool and even a poor ordering
scores highly; validation pools have 10 candidates, mostly grade 0. And the
TF-IDF vectoriser is fitted once on all training profiles before the folds are
made, so held-out profiles contribute to the vocabulary and weights (never
their labels), which makes the figure slightly optimistic.

## Validation results

All four models rank the same 10 mentors for the same 5 validation mentees,
with the same metric code (`evaluate` and `ranking_metrics` imported from
`ml/train_scratch_pilot.py`). Figures are from
`ml/runs/gbdt-pilot-v1/metrics.json`, rounded to six decimal places.

| Machine-labelled validation metric | Random (mean of 100 seeds) | TF-IDF | From-scratch neural (recorded) | GBDT ranker |
| --- | --- | --- | --- | --- |
| nDCG@5 | 0.324875 | 0.853932 | 0.502278 | 0.615413 |
| Precision@1 | 0.136000 | 0.800000 | 0.200000 | 0.400000 |
| MRR@5 | 0.276467 | 0.840000 | 0.433333 | 0.566667 |
| Relevant-hit coverage@5 | 0.568000 | 1.000000 | 0.800000 | 0.800000 |

- Random: uniform random scores for every pair, seeds 0 to 99
  (`numpy.random.default_rng`), mean of the per-seed aggregates. The standard
  deviation of nDCG@5 across seeds is 0.138095.
- TF-IDF: recomputed in this run. Its nDCG@5 is 0.8539321651209489, which
  matches the 0.853932 recorded in `ml-pilot-training.md` to six decimal
  places, so no difference needs explaining.
- From-scratch neural: copied from `ml-pilot-training.md` (run of 2 November
  2026). It was not rerun here.
- MiniLM was not evaluated on these pools.

Per validation mentee, nDCG@5:

| Mentee | TF-IDF | GBDT ranker |
| --- | --- | --- |
| MTE-VAL-001 | 0.882808 | 0.946136 |
| MTE-VAL-002 | 1.000000 | 1.000000 |
| MTE-VAL-003 | 1.000000 | 0.630930 |
| MTE-VAL-004 | 0.386853 | 0.500000 |
| MTE-VAL-005 | 1.000000 | 0.000000 |

The ranker is slightly ahead on two mentees, level on one and behind on two.
With five queries one mentee moves the mean by up to 0.2, and MTE-VAL-005 alone
accounts for most of the gap: its only relevant mentor (grade 2) is first under
TF-IDF and last (tenth) under the ranker.

What the saved predictions show:

- The ranker's scores are coarse. It produces 5 to 8 distinct scores for each
  pool of 10 mentors, where TF-IDF produces 10. Tied candidates are ordered by
  mentor ID, so some positions are arbitrary. For MTE-VAL-004 four mentors tie
  for first place and the relevant one is third only because of its ID.
- For MTE-VAL-005 the relevant mentor has the highest TF-IDF cosine in its
  pool (0.153), but that is low in absolute terms. Training cosines run from
  0.030 to 0.498 and validation cosines from 0.050 to 0.356.

A likely explanation, not tested here: trees split on absolute thresholds of
`tfidf_cosine` learned from 3-candidate training pools, while ranking within a
pool only needs the relative order that the raw cosine already gives. The
skill features that helped separate training pairs are all zero on validation.

## Feature importance (gain)

From `ml/runs/gbdt-pilot-v1/feature_importance.json`, for the final model
fitted on all 60 training pairs:

| Feature | Total gain | Share of gain | Splits |
| --- | --- | --- | --- |
| `tfidf_cosine` | 223.017289 | 92.8% | 98 |
| `industry_match` | 8.470667 | 3.5% | 26 |
| `skill_jaccard` | 4.618082 | 1.9% | 13 |
| `skill_overlap_count` | 4.226291 | 1.8% | 3 |
| `mentee_skill_mention_share` | 0.000000 | 0.0% | 0 |

The model is, in effect, a piecewise-constant function of the TF-IDF cosine
with small adjustments. `mentee_skill_mention_share` was never used. Gain
describes how the model fitted 60 machine-labelled training pairs; it does not
show that a feature matters for real mentoring fit, and it must not be used in
mentor explanations on this evidence.

## Limitations

- **Machine labels.** Every grade is an unreviewed machine label. Agreement
  with them is not agreement with human judgement.
- **Only 5 validation queries.** Differences of this size can come from one or
  two mentees. No confidence interval or significance test would be meaningful.
- **60 training pairs,** three candidates per mentee, with a very different
  pool shape and grade mix from validation.
- **Test split unopened.** No test file was read, and the loader refuses any
  file whose name contains `test_`. There is no held-out test result.
- **MiniLM not compared.** The frozen MiniLM model used by the app was not run
  on these pools, and MiniLM or neural cosines were not used as features, so
  the comparison asked for in #98 is incomplete.
- **No supervisor decision yet** on whether a tree ranker counts as the
  from-scratch model. This pilot does not settle or pre-empt that.
- **Validation is no longer unseen.** These pools have now been used to compare
  TF-IDF, the neural pilot and this ranker. Any change made in response to
  these figures would be tuning on validation.
- **One seed, one small grid.** No repeat over seeds or fold assignments.
- **Local evidence only.** Run on macOS arm64 with Python 3.14.7, LightGBM
  4.7.0, scikit-learn 1.9.1 and NumPy 2.5.4 at commit `00fe52a`. CI has not yet
  run the new tests.

## Recommendation

Do not adopt this tree ranker, and do not treat it as evidence that a tree
ranker is better than a neural encoder for this project. On the current data
the simple TF-IDF cosine remains the strongest of the options measured on
these pools, and adding a learned model on top of it made the ranking worse.

Do not try to rescue the result by changing the grid or the features against
this validation split. The sensible order is:

1. Get reviewed and expanded labels first (#3). Sixty machine-labelled pairs
   are too few to train or judge a ranker.
2. Ask the supervisor the open question in #98 before spending more effort on
   tree models.
3. If the tree ranker is revisited on better data, write the changes down
   before looking at any result (for example features that are relative within
   a candidate pool, training pools shaped like the evaluation pools, and the
   MiniLM comparison), and evaluate on pools that have not been used for
   model comparison.

## Reproduce

```bash
~/.venvs/alumniconnect-ml/bin/python -B ml/train_gbdt_ranker.py \
  ml/data/pilot-machine-v1 ml/runs/<new-run-name>
~/.venvs/alumniconnect-ml/bin/python -B -m unittest discover \
  -s ml/training_tests -p 'test_*.py' -v
```

The script refuses to overwrite an existing run directory. The reference run is
`ml/runs/gbdt-pilot-v1` (ignored by Git), holding `metrics.json`,
`feature_importance.json` and `config.json`. No data, run output or model file
is committed.
