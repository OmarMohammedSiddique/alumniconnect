# AlumniConnect · local → GitHub → Colab → Drive

**Working guide · 14 October 2026**

This is a proposed, project-specific setup and starter experiment, not an executed
training run. The example cells have not been run in Colab. No account purchase,
Drive synchronisation, repository push or app model replacement has been performed.

## The board, translated

```text
YOUR LAPTOP                                  CLOUD
Application + reusable ML code ── Git push ──> GitHub
       ↑                                         │ exact commit
       │                                         ↓
Local experiment evidence <── sync/download ── Drive <── Colab runtime
       │                                                    │
IDE assistant reads metrics, logs and plots        trains/evaluates models
       │
You verify the analysis → change code → next versioned experiment
```

GitHub stores source/notebooks/configuration. Colab supplies a temporary Python
computer, optionally with a GPU. Drive stores persistent datasets and experiment
outputs. Drive for desktop makes selected files readable locally. These are separate
connections, not one automatic integration. Opening a notebook from GitHub does not
install its dependencies or clone its supporting modules.

The IDE assistant is a coding/research aid, separate from the MiniLM model being
trained. It reads saved evidence. Loading a checkpoint lets Python run inference;
it does not make an assistant automatically understand the training run. Local
Codex chats work with local project files; a cloud task has a separate environment
and does not automatically inherit local files/services.
[Official Codex environment documentation](https://learn.chatgpt.com/docs/environments/modes).

## Vocabulary before clicking anything

| Term | Meaning | Worked example, not our dataset size |
| --- | --- | --- |
| Training example | One labelled learning item | Mentee text + mentor text + reviewed relevance score |
| Batch | Examples processed together | 32 pairs |
| Epoch | One pass through the training dataset | 320 pairs / 32 = 10 batches per epoch |
| Optimizer step | One parameter update | With accumulation 1, roughly one update per batch on one GPU |
| Gradient accumulation | Collect gradients over several batches before updating | Four batches of 8 give an effective batch of 32 on one GPU |
| Training loss | Objective measured on examples used to update weights | Usually decreases as the model fits training data |
| Validation loss | Same objective on a separate development dataset | Helps detect overfitting; not a mentorship success measure |
| Patience 3 | Stop after three validation checks without sufficient improvement | Means three epochs only when validation happens once per epoch |
| Checkpoint | Saved training state | Weights, configuration and usually optimizer/scheduler state |
| Inference | Use current weights to produce outputs | Encode profiles and rank mentors |

For 10 epochs, the number is a ceiling; early stopping may stop sooner. Increasing
it to 20 does not guarantee a better result. Example validation losses 0.60, 0.48,
0.41, 0.42, 0.43, 0.44 give a best at epoch 3 and a possible stop at epoch 6 with
patience 3. These numbers are illustrative, not AlumniConnect measurements.
[Early stopping reference](https://huggingface.co/docs/transformers/main_classes/callback#transformers.EarlyStoppingCallback).

## Phase A · establish the connections

### 1. Keep the existing application as the baseline

On your laptop, open a terminal in `/Users/omarsiddique/alumniconnect`.

```bash
pwd
git status --short
node --version
npm run ml:walkthrough
```

Expected: the repository path, an honest list of pending changes, Node version,
and successful frozen-inference output. Do not use `git add .` because unrelated
changes already exist. Do not replace `lib/embedding/embed.ts` during setup.

Training starts from `sentence-transformers/all-MiniLM-L6-v2` in Python. The app
currently runs the ONNX-compatible `Xenova/all-MiniLM-L6-v2` with q8 inference.
The floating-point Python baseline must be measured too: differences from the
app can come from runtime/precision, not just fine-tuning.

### 2. Create experiment folders in Google Drive

In Drive, create this folder tree manually. Keep datasets and outputs private.

```text
My Drive/AlumniConnect-ML/
  data/
    v1/
      train.jsonl
      validation.jsonl
      test.jsonl
      retrieval-validation.json
      retrieval-test.json
      dataset-card.md
  runs/
  notebooks/
```

The filenames above are the target layout, not files we already possess.
A folder setup is useful progress; it is not a prepared training dataset.

### 3. Create a Colab notebook

1. Open https://colab.research.google.com/ and sign into the intended Google account.
2. Create a new notebook; name it `alumniconnect_experiments.ipynb`.
3. Move its Drive copy into `AlumniConnect-ML/notebooks` if desired.
4. Initially choose a standard CPU runtime for checking paths/data.
5. Add the cells in this guide, in order. Do not run the training cell until the
   dataset checks and baseline experiment are ready.
6. Download the notebook using Colab's File menu as `.ipynb`.
7. On the laptop create `ml/notebooks/` and put that downloaded notebook there.
   Do not overwrite an existing notebook accidentally.

### 4. Version the notebook and reusable experiment code

The intended code layout is:

```text
ml/
  notebooks/alumniconnect_experiments.ipynb
  requirements-colab.txt
  README.md
  configs/
  src/
```

Initially `src/` can be empty; move reusable training/evaluation functions there
once the notebook works. Add raw datasets, checkpoints and private outputs to
Git ignore rules before storing any locally. Clear notebook outputs before
committing if they contain private text, credentials or participant data.

Review the notebook and intended files, then stage only those files. For example,
when these are the only files intentionally ready:

```bash
git add ml/notebooks/alumniconnect_experiments.ipynb
git diff --cached --stat
git diff --cached
git commit -m "🧪 experiment: add reproducible Colab notebook"
git rev-parse HEAD
```

Push the intended branch through your normal GitHub workflow. Use the full
commit hash as `CODE_COMMIT` below. Uncommitted laptop edits are not present in
Colab. For a private repository, use Colab's GitHub authorisation flow or securely
upload a source archive; do not put access tokens in notebook code or URLs.

### 5. Open the versioned notebook from GitHub

In Colab choose File → Open notebook → GitHub. Paste the repository URL, select
the intended branch and notebook. The UI labels may vary. Verify the notebook
version. Supporting modules still need an explicit clone/checkout.

If the repository is public, add this code cell. If access is denied, use the
private-repository authorisation/archive route above rather than embedding a token:

```python
import subprocess
from pathlib import Path

CODE_COMMIT = "REPLACE_WITH_FULL_40_CHARACTER_COMMIT"
assert len(CODE_COMMIT) == 40 and all(c in "0123456789abcdef" for c in CODE_COMMIT)
REPO = Path("/content/alumniconnect")
if not REPO.exists():
    subprocess.run([
        "git", "clone", "https://github.com/OmarMohammedSiddique/alumniconnect.git", str(REPO)
    ], check=True)
subprocess.run(["git", "fetch", "origin", CODE_COMMIT], cwd=REPO, check=True)
subprocess.run(["git", "checkout", "--detach", CODE_COMMIT], cwd=REPO, check=True)
actual = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()
assert actual == CODE_COMMIT
print("Loaded code:", actual)
```

After changing the notebook, download it back into the laptop repo, review, commit,
push and rerun from that commit. Do not label a modified notebook as identical
to the old commit. Save the executed notebook alongside run evidence too.

### 6. Mount Drive inside Colab

```python
from google.colab import drive
from pathlib import Path

drive.mount("/content/drive")
ROOT = Path("/content/drive/MyDrive/AlumniConnect-ML")
assert ROOT.exists(), "Create the Drive folder first"
DATA = ROOT / "data" / "v1"
print("Persistent experiment folder:", ROOT)
```

Authorise only your intended account. Confirm the directory listing without
printing private dataset contents. Files left only in `/content` disappear when
the runtime is discarded; Drive mounting is a separate step from GitHub access.
[Colab storage and notebook guidance](https://research.google.com/colaboratory/faq.html).

### 7. Connect Drive back to the laptop

1. Install Google Drive for desktop from Google's official download page if needed.
2. Sign into the same Google account.
3. Find `AlumniConnect-ML/runs` in Finder.
4. Make the required run folder available offline, or download that run folder.
5. Wait for synchronisation to finish; open `run.json` and the plots locally.
6. Give the actual local folder path to the IDE assistant. Do not guess a macOS
   Drive path: account and installation paths differ.

A manual download is sufficient if you do not want Drive for desktop.
The agent needs readable evidence files, not only a `.safetensors` file.

## Phase B · prepare a defensible dataset

### 8. Define what the model should learn

Suggested research question: does project-specific fine-tuning improve retrieval
of mentors judged suitable for a mentee, compared with frozen MiniLM and the
existing keyword baselines?

Use a written rubric covering relevant expertise, the mentee's stated goals,
mentoring experience and any documented constraints actually represented in
profiles. Do not pretend availability or preferences are known if they are absent.
Record supervisor guidance and apply the actual institutional ethics requirements.

Use a graded 0–1 relevance label for this starter recipe. Include plausible but
unsuitable mentors from the same domain. Have humans review the labels; generated
labels alone do not establish real suitability. The existing same-domain synthetic
generator is an illustration and is not a ready human-labelled training corpus.

### 9. Create the data files

Each JSONL line is one independently reviewed pair:

```json
{"mentee_id":"q001","mentor_id":"m001","mentee_text":"...","mentor_text":"...","score":0.75}
```

The dots are placeholders, not usable training examples. Keep reviewer/source
metadata separately from model input. `dataset-card.md` records provenance,
licence/consent status, rubric, reviewers, limitations, version and split policy.
There is no universal sample size that guarantees adequate training: report the
actual independent people, pairs, label distribution and uncertainty.

Partition people before constructing pairs. All profiles and pairs involving a
person must stay in one split for the strict person-disjoint protocol used here.
If pairs already form a connected graph, allocate connected groups rather than
random rows; a giant connected group may require redesigning the collection.
Deduplicate copied/near-identical profile text across splits as well.
Do not train on the existing evaluation queries and then claim they are held out.

For ranking evaluation create separate validation and test JSON files:

```json
{"queries":{"q001":"mentee profile text"},"corpus":{"m001":"mentor profile text","m002":"other mentor text"},"relevant_docs":{"q001":["m001"]}}
```

Use the actual labelled candidate pool, not only an easy positive/negative pair.
Record how relevance grades become binary qrels if using binary retrieval metrics.
Use the same candidate pool and judgments for every compared method.

### 10. Check the dataset before paying for compute

A validation cell should assert nonempty splits, finite scores in [0,1], nonblank
texts, consistent IDs/texts, multiple label levels in training and validation,
no duplicated pairs, and no people or duplicate profile texts crossing splits.
The runnable starter checks below cover basic schema and person separation;
manual rubric review and near-duplicate checks remain necessary.

## Phase C · install, baseline, train and save

### 11. Resolve and record the Python environment

For the first bootstrap run, use this Colab cell:

```python
%pip install -U "sentence-transformers[train]" matplotlib
```

If Colab asks for a session restart, restart and rerun setup cells. Do not
repeatedly upgrade mid-experiment. Save the resolved environment with the run.
Copy the resulting requirements into `ml/requirements-colab.txt`, test that pinned
setup in a fresh runtime and commit it before the controlled comparison.
Subsequent runs install the reviewed lock file, not another unpinned upgrade:

```python
# Use this instead of the bootstrap install once the file exists in the checked-out commit.
%pip install -r /content/alumniconnect/ml/requirements-colab.txt
```

A `pip freeze` capture records what happened; it is not proof that every Colab
system package is portable. Keep GPU/Python/runtime details too.

### 12. Select the runtime

For training: Runtime → Change runtime type → choose an available GPU → connect.
Check the allocation:

```python
import torch
print("CUDA:", torch.cuda.is_available())
print("Device:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU")
```

Do not assume A100 access. Start with the available GPU and a small smoke test.
Check the current account checkout page before purchasing. The board's $10/$50
figures are not a verified quote for your region. Pro+ supports up to 24 hours
continuous execution with sufficient units; paid resources are still limited and
hardware availability varies. Ordinary Pro is not a 24-hour guarantee.
[Google's resource limits](https://research.google.com/colaboratory/faq.html).

### 13. Load and validate the pair files

```python
import json, math
from datasets import Dataset

raw = {}
for split in ("train", "validation", "test"):
    path = DATA / f"{split}.jsonl"
    assert path.is_file(), f"Missing reviewed dataset: {path}"
    rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    assert rows, f"Empty {split}"
    seen = set()
    for row in rows:
        for field in ("mentee_id", "mentor_id", "mentee_text", "mentor_text"):
            assert isinstance(row[field], str) and row[field].strip()
        assert isinstance(row["score"], (float, int)) and not isinstance(row["score"], bool)
        assert math.isfinite(row["score"]) and 0 <= row["score"] <= 1
        pair = (row["mentee_id"], row["mentor_id"])
        assert pair not in seen, f"Duplicate pair in {split}"
        seen.add(pair)
    raw[split] = rows
ids = {s: {r[k] for r in rows for k in ("mentee_id", "mentor_id")} for s, rows in raw.items()}
assert not (ids["train"] & ids["validation"] or ids["train"] & ids["test"] or ids["validation"] & ids["test"])
for split in ("train", "validation"):
    assert len({r["score"] for r in raw[split]}) > 1, "Need varied relevance labels"

def as_dataset(rows):
    return Dataset.from_dict({
        "sentence1": [r["mentee_text"] for r in rows],
        "sentence2": [r["mentor_text"] for r in rows],
        "score": [float(r["score"]) for r in rows],
    })
train_data = as_dataset(raw["train"])
validation_data = as_dataset(raw["validation"])
print({s: len(rows) for s, rows in raw.items()})
```

Use globally unique person IDs, including when a person has both roles. Loading
test data here is for integrity checks only; do not inspect its performance to
choose hyperparameters. The strict ID check alone cannot detect paraphrase leakage.

### 14. Save a baseline and a run manifest

Use a unique folder for each experiment. Do not overwrite the earlier run.

```python
from datetime import datetime, timezone
import hashlib, platform, subprocess
from sentence_transformers import SentenceTransformer
from sentence_transformers.evaluation import InformationRetrievalEvaluator
from transformers import set_seed

SEED = 42
set_seed(SEED)
RUN_ID = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-minilm-pilot"
RUN = ROOT / "runs" / RUN_ID
RUN.mkdir(parents=True, exist_ok=False)
BASE_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
manifest = {
    "run_id": RUN_ID, "code_commit": CODE_COMMIT, "dataset_version": "v1",
    "base_model": BASE_MODEL, "seed": SEED, "python": platform.python_version(),
    "torch": torch.__version__, "cuda": torch.version.cuda,
    "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
    "data_sha256": {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in DATA.iterdir() if p.is_file()},
    "counts": {s: len(rows) for s, rows in raw.items()},
}
(RUN / "run.json").write_text(json.dumps(manifest, indent=2))
(RUN / "requirements-resolved.txt").write_text(
    subprocess.check_output(["python", "-m", "pip", "freeze"], text=True))
model = SentenceTransformer(BASE_MODEL)

def retrieval_evaluator(filename, name):
    spec = json.loads((DATA / filename).read_text())
    assert spec["queries"] and spec["corpus"]
    for qid in spec["queries"]:
        assert qid in spec["relevant_docs"] and spec["relevant_docs"][qid]
        assert set(spec["relevant_docs"][qid]).issubset(spec["corpus"])
    return InformationRetrievalEvaluator(
        queries=spec["queries"], corpus=spec["corpus"],
        relevant_docs={k: set(v) for k,v in spec["relevant_docs"].items()},
        precision_recall_at_k=[1,3,5], mrr_at_k=[5], ndcg_at_k=[5],
        name=name, write_csv=True,
    )
validation_ir = retrieval_evaluator("retrieval-validation.json", "validation")
baseline = validation_ir(model, output_path=str(RUN))
(RUN / "baseline-validation.json").write_text(json.dumps(baseline, indent=2))
```

Also save the resolved base-model revision/file hashes before a formal comparison;
`BASE_MODEL` alone is a name, not an immutable weight version. Inspect per-query
rankings and save IDs/scores for the keyword baselines and semantic method.
The evaluator above supplies aggregate metrics; a per-query prediction exporter
is still required for the final research evidence. Preserve candidate ranks.

### 15. Run a starter fine-tuning experiment

This uses graded pairs with `CoSENTLoss`. It is a reasonable pilot recipe, not a
proven best configuration. A different label format needs a suitable different
loss. Keep only the three model-input columns in the training Dataset.
[Sentence Transformers training reference](https://sbert.net/docs/sentence_transformer/training_overview.html).

First run a one-epoch smoke test in its own folder. If it saves and reloads
correctly, start a fresh run from the base weights with this pilot configuration:

```python
from sentence_transformers import SentenceTransformerTrainer, SentenceTransformerTrainingArguments, losses
from transformers import EarlyStoppingCallback

args = SentenceTransformerTrainingArguments(
    output_dir=str(RUN / "checkpoints"),
    num_train_epochs=10,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    learning_rate=2e-5,
    gradient_accumulation_steps=1,
    eval_strategy="epoch",
    save_strategy="epoch",
    logging_strategy="steps",
    logging_steps=1,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    save_total_limit=None,
    report_to="none",
    fp16=False,
    bf16=False,
    seed=SEED,
    data_seed=SEED,
)
manifest["training_args"] = args.to_dict()
(RUN / "run.json").write_text(json.dumps(manifest, indent=2, default=str))
trainer = SentenceTransformerTrainer(
    model=model,
    args=args,
    train_dataset=train_data,
    eval_dataset=validation_data,
    loss=losses.CoSENTLoss(model),
    callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
)
trainer.train()
trainer.save_model(str(RUN / "best-model"))
trainer.save_state()
(RUN / "history.json").write_text(json.dumps(trainer.state.log_history, indent=2))
(RUN / "best-checkpoint.json").write_text(json.dumps({
    "checkpoint": trainer.state.best_model_checkpoint,
    "validation_loss": trainer.state.best_metric,
}, indent=2))
after = validation_ir(model, output_path=str(RUN))
(RUN / "finetuned-validation.json").write_text(json.dumps(after, indent=2))
```

Ten epochs is the maximum. Validation happens each epoch, so patience 3 means
three such checks without qualifying improvement. Best checkpoint here means
lowest validation loss, not best real-world mentorship outcomes. Inspect retrieval
metrics too. Full precision is simpler for the pilot; optimise precision later
and record it as a changed experimental condition.

Checkpoints are written directly to Drive for persistence. This can be slower;
monitor free storage, and verify checkpoints are complete. Do not fill Drive with
unbounded runs. For a larger experiment use a tested periodic copy mechanism.

### 16. Identify the literal three best checkpoints

`save_total_limit=3` does NOT mean the best three: the standard Trainer keeps
recent checkpoints plus the best when configured that way. This pilot preserves
all epoch checkpoints, then ranks them by the recorded validation criterion:

```python
candidates = {}
for entry in trainer.state.log_history:
    if "eval_loss" not in entry:
        continue
    checkpoint = RUN / "checkpoints" / f"checkpoint-{entry['step']}"
    if checkpoint.is_dir():
        candidates[str(checkpoint)] = {
            "checkpoint": str(checkpoint), "step": entry["step"],
            "epoch": entry.get("epoch"), "eval_loss": entry["eval_loss"],
        }
best_three = sorted(candidates.values(), key=lambda item: item["eval_loss"])[:3]
assert best_three, "No completed evaluated checkpoints found"
(RUN / "top-checkpoints.json").write_text(json.dumps(best_three, indent=2))
print(best_three)
```

The listed checkpoint folders are already saved in Drive. Do not delete the rest
automatically during the first pilot. Fewer than three checkpoints means keep
what actually exists. To retain only three later, review this manifest plus the
resume checkpoint and explicitly archive/prune after confirming integrity.
[Trainer checkpoint retention semantics](https://huggingface.co/docs/transformers/main_classes/trainer).

### 17. Save plots and predictions

```python
import matplotlib.pyplot as plt
h = trainer.state.log_history
fig, ax = plt.subplots()
for key, label in (("loss", "Training"), ("eval_loss", "Validation")):
    points = [(x.get("epoch", 0), x[key]) for x in h if key in x]
    if points:
        xs, ys = zip(*points)
        ax.plot(xs, ys, label=label)
ax.set(xlabel="Epoch", ylabel="CoSENT loss", title="Pilot learning curves")
ax.legend()
fig.savefig(RUN / "loss-curves.png", dpi=160, bbox_inches="tight")
plt.show()
```

Training and validation loss use different sampling/batches and are not directly
interchangeable quantities; use curves as diagnostics. Save per-query mentor
IDs, ranks, similarities and relevance judgments separately. Record failed runs
and errors too. Save the executed notebook with its run ID.

### 18. Resume versus start a new experiment

After a disconnect, remount Drive, reload the same code/dependencies/data/config,
rebuild the Trainer and run `trainer.train(resume_from_checkpoint=CHECKPOINT_PATH)`
using a completed checkpoint that includes optimizer/scheduler state. This is a
continuation of that experiment; check the actual saved epoch/global step.

For a comparison, reload the original base model and use a new run ID. Do not
continue experiment 1 and describe experiment 2 as starting from the same baseline.
Increase 10 to 20 epochs only for a stated validation-based reason. Preserve the
same data split, metric definitions and resource budget; record every changed
parameter. Do not use the test set to decide when to stop or which run to choose.

### 19. Final held-out evaluation

After selecting a configuration with validation evidence, freeze the decision.
Evaluate the selected model and frozen baseline against the same held-out test
queries/corpus and keyword baselines. Save raw rankings and recomputable metrics.
Use `retrieval_evaluator("retrieval-test.json", "test")` only at this stage.
Repeated model selection on those scores would make the test set development data.

The current historical evaluation script needs its candidate/rank protocol
reviewed; do not silently treat old and new metrics as directly comparable.
Fine-tuning is a result even when it fails to improve the chosen metrics.

### 20. Finish and bring evidence home

1. Confirm Drive contains `run.json`, resolved dependencies, completed checkpoints,
   best-model, learning curves, aggregate metrics, raw predictions and executed notebook.
2. Reload `best-model` with `SentenceTransformer(str(RUN / "best-model"))` and
   run an example encoding to check dimensions and finite outputs.
3. Verify those files from a fresh Drive view before deleting the runtime.
4. Use Runtime → Disconnect and delete runtime when finished. Closing a browser
   tab is not a reliable way to release paid resources.
5. Optionally call `from google.colab import runtime; runtime.unassign()` as the
   final cell after saving and checking outputs; the manual menu is the fallback.
   [Official runtime function](https://github.com/googlecolab/colabtools/blob/main/google/colab/runtime.py).
6. Download/sync the run folder to the laptop and confirm local files open.
7. Ask the assistant to inspect exact code, `run.json`, history, plots and predictions.

Example request: “Compare this run with its frozen baseline using these actual
files. Separate observed results from hypotheses. Inspect failure queries and
possible leakage. Propose one controlled change and explain the evidence for it.”
Verify that analysis yourself before changing the experiment.

## Phase D · use the trained model in AlumniConnect

Training does not automatically update the application. Keep the working model
until the new one is independently evaluated and integration-tested.

1. Confirm output width, text construction, tokenizer limits, mean pooling and
   normalization are compatible with the app.
2. Export the chosen Python checkpoint to a Transformers.js-compatible ONNX
   model layout with tokenizer/config files. A raw PyTorch checkpoint is not a
   drop-in replacement for the app's q8 ONNX model.
3. Verify floating-point versus ONNX/quantized inference on fixed profile texts;
   measure ranking and latency differences, not only successful loading.
4. Stage a server-only model loader change with an explicit model version.
5. Regenerate ALL mentor and query vectors with the same selected model version.
   Even two models with 384 dimensions do not have interchangeable embedding spaces.
6. Test storage, ranking, profile saves, errors/retries and permissions on an
   isolated local database. Keep a rollback path to the original model/vectors.
7. Only then promote a verified version and update the report.

Export commands depend on the actual selected checkpoint and pinned runtime;
implement/test that step once an actual trained artefact exists. This guide does
not claim an export or app replacement has already been made.
[Transformers.js custom models](https://huggingface.co/docs/transformers.js/custom_usage),
[Sentence Transformers inference backends](https://sbert.net/docs/sentence_transformer/usage/efficiency.html).

## Completion evidence

- [ ] Local notebook and reusable code recorded in GitHub at a known revision.
- [ ] Colab loads that revision and the reviewed data version.
- [ ] Drive stores outputs under a unique run ID.
- [ ] Train/validation/test integrity and label provenance checked.
- [ ] Frozen baseline measured before fine-tuning.
- [ ] Actual training, early stopping and checkpoint reload demonstrated.
- [ ] Top-three selection criterion and manifest saved.
- [ ] Curves, metrics, raw rankings, dependencies and executed notebook preserved.
- [ ] Evidence available locally and analysis checked.
- [ ] Held-out comparison reported honestly; app integration verified separately.
