# From-scratch pilot execution · 2 November 2026

**Actual training performed locally on CPU. Machine labels remain unreviewed.**
This milestone proves pipeline execution, parameter updates and checkpoint reload,
not model quality, human approval, Colab account execution or final app integration.

## Completed

- [x] Separate derived machine-labelled dataset prepared; original data unchanged.
- [x] Training uses random weights; no pretrained model/encoder/tokenizer loaded.
- [x] Character vocabulary and TF-IDF fitted on training profiles only.
- [x] Explicit machine-label opt-in required; inputs whitelist profile fields.
- [x] Lexical baseline compared with neural model on machine-labelled validation.
- [x] Real optimizer updates, early stopping and best-three checkpoint retention.
- [x] Selected checkpoint loaded with `weights_only=True`; finite output checked.
- [x] Six training/metric/leakage-focused tests pass, plus 24 audit/preparation tests.
- [ ] Human label review and research-approved data freeze (deferred by user).
- [ ] Google Colab upload/Drive-mount branch exercised in user's account.
- [ ] Final held-out test performance accessed (deliberately not done).
- [ ] Model exported/integrated in the application (not done).

## Model and actual observed result

Random character embeddings (32) -> character Conv1d (32 filters, kernel 5) ->
max pooling -> directional 64-value projection heads -> L2 normalization.
Cosine score fits grade/3 with MSE. This small encoder lacks pretrained semantic
knowledge and is not a claim of an adequate final architecture.

Seed 42; CPU; 11,200 parameters; 57-character vocabulary; truncation at 512
characters; batch 16; Adam learning rate 0.001; ceiling 10 epochs; patience 3.
Actual run stopped after 4 epochs; checkpoint 1 selected by lowest validation loss.
The three lowest validation losses belong to epochs 1, 4 and 3. Checkpoints support
selection/reload; optimizer/RNG-state resume is not implemented by this runner.

| Machine-labelled validation metric | TF-IDF | From-scratch neural |
| --- | --- | --- |
| nDCG@5 | 0.853932 | 0.502278 |
| Precision@1 | 0.800000 | 0.200000 |
| MRR@5 | 0.840000 | 0.433333 |
| Relevant-hit coverage@5 | 1.000000 | 0.800000 |

These are 5 validation queries, not test results. The neural pilot performs worse;
preserve that evidence. More epochs or a larger GPU is not evidence of a remedy.
Do not select a final model or promise improvement from this tiny unreviewed set.

## Run and inspect

Local reference run: `ml/runs/scratch-verified-2026-11-02` (ignored by Git).
It contains source snapshot/hash, dataset-manifest hash, dependency capture,
configuration, history, raw validation predictions, vocabulary, plot and three
checkpoints. The code-commit field names the parent checkout; the recorded source
hash/snapshot identifies the then-uncommitted runner exactly. The verified source
is committed with this milestone. No secrets or raw profiles are in committed results.

Dependencies were installed in `/private/tmp/alumniconnect-ml-env`, not system Python.
Pinned direct dependencies: `ml/requirements-pilot.txt`. Pip captures the fully
resolved local environment with each run; Colab may have different Python/runtime
constraints and must be checked rather than assumed identical.

```bash
python3 ml/train_scratch_pilot.py ml/data/pilot-machine-v1 /path/to/new-run \
  --epochs 10 --allow-machine-labels
python3 -B -m unittest discover -s ml -p 'test_*.py'
python3 -B -m unittest discover -s ml/training_tests -v
```

The saved learning curve was inspected. Full notebook layout has not been checked
in a browser viewer; schema, cell execution and embedded figure output were checked.

## Notebook / Colab handoff

`ml/notebooks/scratch_pilot.ipynb` is the portable source. Local executed evidence
is saved privately under `ml/artifacts/scratch_pilot.executed.ipynb`; the notebook
executed top-to-bottom and reproduced the standalone validation metrics. The notebook checks implementation and data-manifest hashes,
uses an explicit machine-label opt-in, and displays the saved learning curve.

The handoff ZIP contains the notebook, runner, requirements and derived pilot data.
In Colab, open the notebook, run its cells, upload that ZIP when prompted, and
approve Drive mounting to retain run outputs. Those Google account actions require
the user's access. No GitHub push, Google upload or paid compute purchase was made.
Local execution does not establish that the Colab upload/install/Drive branch passed.

Review `docs/ml-next-steps.md` for the later human-review path. The app still runs
MiniLM with 384-value vectors; this pilot outputs 64 values and cannot replace it
without a separately designed and tested integration/re-embedding milestone.
