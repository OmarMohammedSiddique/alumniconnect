# What to do next · beginner's guide

**2 November 2026 · From-scratch training is the user's selected requirement.**

## Where you are

You have a structurally consistent small synthetic dataset with separate pools.
You do not yet have human-reviewed labels, a frozen curated version or a trained model.
The app still uses its original frozen MiniLM model. Leave it working while we experiment.

A profile describes a person. A pair connects one mentee and one mentor. Its label
is a 0–3 relevance judgment. Training learns from pairs; validation chooses settings;
the test pool measures the locked model later. Audit inspection is not a test-model run.

## Step 1 · Review the labels, before paying for compute

1. Open Finder and use Go → Go to Folder with:
   `/Users/omarsiddique/.gemini/users/user2/alumniconnect_pilot_dataset/`.
2. Keep every file in this original directory unchanged.
3. Open `human_review_sheet.csv` in Excel, Numbers or another spreadsheet editor.
   Save a WORKING COPY outside the original directory. Preserve the original pair IDs.
4. Read the mentee's headline/bio/skills/industry and then the mentor's fields.
   Do not look up Gemini's label or rationale before making your own judgment.
5. Enter a reviewer ID (a pseudonym is enough), a grade from 0 to 3, and a brief
   explanation quoting the relevant goal/offer evidence. Enter ambiguity as true/false.
   Do not use score 0 as a substitute for 'I do not know'. Flag uncertainty in notes.
6. Start with the 60 training rows. We can walk through the first few together;
   an assistant's suggestions must not be recorded as independent human judgments.
7. Review validation/test labels before model selection. Ideally have a second
   reviewer independently judge them without seeing the first review or model outputs.
   Where you lack domain knowledge, request an informed reviewer or mark unresolved.
   Do not fabricate reviewer agreement or expertise.
8. Save the reviewed copy as CSV and provide its path here. Do not edit labels just
   to obtain equal class counts. The tiny held-out pools need their original rankings preserved.

Rubric:
- 0: evidence of an unsuitable pairing or no supported meaningful alignment.
- 1: tangential/secondary help or insufficient evidence for the main need.
- 2: primary-goal support with a significant context/coverage limitation.
- 3: clear primary-goal and offered-support alignment.

Resolve vague/generalist examples consistently. If the rubric itself changes,
version it and revisit affected labels before freezing. An unreviewed label is
not automatically wrong; it is simply not approved evidence yet.

## Step 2 · Curate and freeze a pilot version

What we do after receiving your review:

- Join your grades to original pairs by pair ID; keep original and reviewed grades.
- Review proposed profile edits individually; rejudge every pair whose profile changed.
- Create separate curated JSONL files and an input-only export.
- Standardize `val` versus `validation` in the loader without repartitioning people.
- Validate reviewed statuses with a curated-data contract; the generated validator
  is designed for blank review sheets and cannot serve as final approval.
- Rerun identity, reference, duplicate, metadata and matrix checks.
- Save split manifests and hashes so later runs identify exactly what they used.

Achievement: dataset pilot v1 frozen. No training data is silently replaced.
If labels remain unresolved, exclude/resolve them under a documented protocol;
formal retrieval evaluation needs complete judgments for the retained pool.

## Step 3 · Set up Colab and persistent storage

1. Sign into the intended Google account and open Colab.
2. Create a Drive folder `AlumniConnect-ML` with `data/pilot-v1` and `runs`.
3. Upload only the frozen curated files/manifests into `data/pilot-v1`.
4. Use the versioned training notebook we will build locally; put source/config in
   GitHub and use its exact commit in Colab. Do not upload secrets or raw review identities.
5. Mount Drive in the notebook and install the pinned dependencies it specifies.
6. Start on CPU for dataset/metric checks. Use an available GPU for neural training
   if useful; no A100 or paid subscription is required to establish this small pipeline.

Tools: Python/pandas for data; scikit-learn for lexical baselines; PyTorch for
randomly initialized training; Matplotlib for plots; GitHub for code; Drive for runs.
There is no runnable training notebook in this milestone; do not paste the older
MiniLM fine-tuning example and call it training from scratch.

## Step 4 · Implement a simple baseline and a small neural model

We will write and test the notebook and reusable Python code after dataset review.

- First: TF-IDF cosine retrieval, vocabulary/IDF fitted ONLY on training profiles.
- Proposed from-scratch pilot: a small trainable text encoder using random token
  embeddings and a compact sequence encoder/projection, with role handling and
  relevance loss explicitly recorded. Final dimensions/loss are a design task,
  not a completed model selection or guarantee of semantic skill.
- Choose a compact architecture to limit memorization; a huge transformer does
  not become appropriate because Colab offers a GPU.
- Train-fitted vocabulary maps unseen words to unknown/subword handling. Never
  add validation/test words to the training vocabulary to make scores look better.
- Use only headline, bio, skills and industry as inputs. Labels are targets;
  rationale, ambiguity, IDs, split and review metadata never enter the model.

Achievement: a reproducible baseline run and a model smoke test with save/reload.
The current 60 training pairs are a pipeline pilot. Review learning curves and
plan diverse, reviewed expansion before claiming useful model generalization.
More synthetic pairs alone do not create more independent people or better labels.

## Step 5 · Train and improve using validation only

An epoch is one pass over training examples. A batch is a small group used to
compute an update. Loss measures prediction error. An optimizer updates weights.
Validation checks a separate pool without fitting weights or preprocessing on it.

1. Start each comparison from the recorded random initialization/seed.
2. Run a short smoke test and verify saved weights reload.
3. Record batch size, learning rate, epoch ceiling, loss, metric and early stopping.
4. Train in batches and evaluate after each declared interval.
5. Save checkpoints; select the best using the agreed VALIDATION criterion.
6. Preserve three highest-ranked checkpoints if requested; 'keep last 3' is different.
7. Save the code commit, dependencies, data hashes, configuration, logs, curves,
   full validation rankings and failures in a unique Drive run folder.
8. Change one justified factor per experiment and preserve unsuccessful results.

Achievement: an actual trained, reloadable model and a validation-based selection.
Do not promise an accuracy target or force training until a desired test score appears.

## Step 6 · Evaluate once the model choice is locked

Run the selected model and lexical baseline on the same complete held-out candidate
pool. Compute agreed ranking metrics, including nDCG@5 and P@k/MRR as specified
in the experiment protocol. Inspect raw per-query results and independently verify
metric calculations. An always-unsuitable classifier gets 80% exact-grade accuracy
on the current test labels; that does not mean it recommends anybody well.

Five test mentees give highly uncertain results. Report them as a small synthetic
pilot. If test results drive another model choice, arrange a new independent final
set instead of treating the reused test as untouched.

## Step 7 · Integrate, document and demonstrate

Only after verification, package the selected model with its own preprocessing.
Compare notebook/app outputs. If replacing embeddings, regenerate every mentor
and query vector using the same version; do not mix with old MiniLM vectors.
Test profile → recommendations → request → acceptance plus permissions/errors.
Update Chapter 4 design and Chapter 5 implementation/results with actual evidence.
Report synthetic-data limits and finish any required independent human evaluation.

**Your immediate task: Step 1, a reviewed working copy of the CSV.**
You do not need to open Colab, install PyTorch or buy GPU access yet.
