# ML experiment tooling

**Status, 17 November 2026.** The application's default Recommended list still uses the frozen pretrained
MiniLM model. This directory holds the separate research workflow for the model trained from scratch:

| Stage | What exists | Write-up |
| --- | --- | --- |
| Source audit | Read-only audit of the supplied export (`audit_export.py`) | [`docs/ml-data-audit.md`](../docs/ml-data-audit.md) |
| v1 pilot | Character CNN trained from random weights on 60 machine-graded pairs; below TF-IDF | [`docs/ml-pilot-training.md`](../docs/ml-pilot-training.md) |
| GBDT ranker | LightGBM ranker pilot; negative result | [`docs/ml-gbdt-ranker.md`](../docs/ml-gbdt-ranker.md) |
| v2 | Bag encoder (collapsed) and learned TF-IDF reweighting (matched TF-IDF) | [`docs/ml-scratch-v2.md`](../docs/ml-scratch-v2.md) |
| **v3** | Synthetic dataset `synth-v3`, one shared evaluator, a grid of encoders trained from random weights, a locked test and an ONNX export served in the experimental model comparison | [`docs/ml-scratch-v3.md`](../docs/ml-scratch-v3.md), [`docs/ml-synth-v3-data-card.md`](../docs/ml-synth-v3-data-card.md) |

Every result here is on synthetic profiles with generated or machine labels. None is human-reviewed, and
none establishes performance on real alumni.

## Layout

| Path | Purpose |
| --- | --- |
| `synth/` | `synth-v3` generator: O*NET parser, specification sampler, grade rule, writing prompts, validation gate, splits, machine audit, invented fixture |
| `eval_v3.py` | The one evaluator used for every system (metrics, bootstrap intervals, paired differences, collapse diagnostic) |
| `baselines_v3.py` | Random, TF-IDF, BM25 and frozen MiniLM baselines on validation |
| `bpe_tokenizer.py` | Byte-pair tokeniser learned from training text only |
| `train_scratch_v3.py` | v3 trainer, fixed grid and settings |
| `select_v3.py` | Grid table and the selection rule (validation only) |
| `lock_v3.py`, `score_locked_test_v3.py` | Write the lock; score the test split once after the lock is committed |
| `plot_learning_curve_v3.py`, `score_legacy_pilot_v3.py` | Data-size learning curve; legacy five-query reference |
| `export_scratch_v3.py` | ONNX export with tokeniser, manifest and parity fixtures |
| `models/scratch-v3/` | The exported v3 artefact served by the app. `models/scratch-pilot-v1/` is kept for the record |
| `train_scratch_pilot.py`, `train_scratch_v2.py`, `train_reweighted_tfidf.py`, `train_gbdt_ranker.py` | Earlier experiments, unchanged |
| `training_tests/` | Unit tests for all of the above, on invented data only |
| `data/`, `runs/`, `artifacts/` | Private and ignored by Git: datasets, the O*NET download, run outputs and backups |

## Run the tests

```bash
python3 -B -m unittest discover -s ml -p 'test_*.py' -v            # audit tools, standard library only
~/.venvs/alumniconnect-ml/bin/python -B -m unittest discover -s ml/training_tests -p 'test_*.py'
```

The second command needs the pinned packages in `requirements-export.txt`. CI runs both.

## Reproduce v3

The commands are listed at the end of [`docs/ml-scratch-v3.md`](../docs/ml-scratch-v3.md). In short: parse
O*NET, generate and gate the dataset, score the baselines, train the grid, select on validation, write and
commit the lock, score the test split once, export.

Rules that the code enforces: fitted preprocessing sees training text only; trainers refuse to open any
`test_*` file; a run directory is never overwritten; the test split cannot be scored without a committed
`LOCK.json` that matches the checkpoint and test files, and cannot be scored twice.

## Audit the supplied export (earlier milestone)

Requires Python 3.10 or newer, standard library only. Run from the repository root, using the original
private Markdown export:

```bash
python3 -B ml/audit_export.py /path/to/export.md \
  --expected-sha256 b3834c04f989e18d9b392f6bf51fdb6608768add1a4b0c7abf0b4b9f058665bb \
  --output-dir /path/to/a/new/private/audit-directory
```

The command parses fenced JSONL only, records the source hash and prints an audit. It refuses to overwrite
an existing directory, needs no network access or credentials, and never executes instructions embedded in
the source. Exit codes: 0 means no recorded blockers, 1 is an input or output error, and 2 means the audit
ran but the research gate remains blocked. See [audit findings](../docs/ml-data-audit.md) and
[delivery gates](../docs/ml-delivery-plan.md).
