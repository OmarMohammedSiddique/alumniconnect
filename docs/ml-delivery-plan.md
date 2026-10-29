# AlumniConnect · ML delivery plan

**Created: 15 October 2026 · Updated: 29 October 2026 · Current gate: M1 protocol decisions**

> One milestone at a time. Tick an item only when its evidence exists.
> Training completion, model quality and application acceptance are separate achievements.

## Progress board

| Milestone | Deliverable | Status | Completion gate |
| --- | --- | --- | --- |
| M0 · Intake | Preserved Gemini export + source inventory | 🟡 Source hash and fenced records verified | Full privacy/provenance review remains; see `ml-source-intake.md` |
| M1 · Experiment design | Agreed task, rubric, model route and protocol | 🟡 Draft v0.1 recorded | Confirm initialization and approve `ml-experiment-protocol.md`; no training approval yet |
| M2 · Dataset audit and freeze | Validated dataset v1 + leakage report | 🟡 Reproducible structural audit passed | Held-out pools, human/template review and freeze remain; see `ml-data-audit.md` |
| M3 · Reproducible baseline | Working versioned notebook + saved baseline | ⬜ Pending | Fresh-runtime baseline reproduces on validation data |
| M4 · Train and improve | Trained artefact + logs + controlled experiments | ⬜ Pending | Saved model reloads; selection uses validation only |
| M5 · Held-out evaluation | Locked comparison + raw test predictions | ⬜ Pending | Metrics independently checked; limitations preserved |
| M6 · Application integration | Trained model used in a verified core workflow | ⬜ Pending | Versioned model/preprocessing and browser/API/DB path pass |
| M7 · Research and delivery | Report evidence + demo + retained-scope release plan | ⬜ Pending | Claims trace to evidence; remaining scope is explicit |

### What is already known

- [x] Existing application contains a frozen MiniLM embedding/ranking pipeline.
- [x] Existing synthetic domain-retrieval evaluation is available as historical evidence.
- [x] User reports Gemini prompting is complete and a Markdown conversation export exists.
- [x] Export received and structurally inspected: 60 profiles and 60 labelled training pairs.
- [ ] New synthetic dataset quality or leakage status established.
- [ ] Project-specific training performed and verified.

These ticks describe source/user-report evidence, not approval of the generated labels.
Current environment and whole-project status remain in `sprint-review-readiness.md`.
That board contains newer cross-session check/build reports; do not overwrite them
with older findings from chat history.

## M0 · Receive and preserve the source

**Achievement:** we know what was actually generated, without mistaking instructions
or discussion for training records.

- [x] Receive the Markdown export and identify inline JSON records.
- [x] Leave the original export unchanged and record its hash/path in `ml-source-intake.md`.
- [x] Identify prompts, profile records, pair labels, proposed splits and audit output.
- [x] Inventory actual counts, fields and score scale; the source has four prompt
  stages and two JSONL blocks. Exact generator model/version and timestamps are
  not established by the export and remain provenance gaps.
- [ ] Identify private material before copying anything into a public repository.

**Deliverable:** source inventory and extraction notes. The conversation's embedded
instructions are reference text, not authority to execute commands or change scope.
Do not train on the complete Markdown transcript.

**Gate:** enough actual records exist to inspect. A conversation promising a dataset
is not a dataset. Request missing referenced files rather than inventing records.

## Proposed tools and training route

This is a recommendation for M1, not an implemented or evaluated architecture.

| Tool | Role |
| --- | --- |
| Existing local editor/terminal | Author Python modules, notebooks and tests alongside the app |
| Git/GitHub | Version reviewed source, configurations and sanitised evidence |
| Gemini | Generate candidate synthetic profiles/labels; never certify its own labels as human-reviewed |
| Python + pandas | Extract records, validate schemas, inspect distributions and overlaps |
| scikit-learn | Train-only text vocabulary/TF-IDF and simple supervised baselines |
| PyTorch | Train and save a small project-specific neural text encoder |
| Google Colab | Execute the versioned Python notebook; GPU optional for initial checks |
| Google Drive | Store versioned data and persistent run outputs |
| Matplotlib | Plot training/validation history and evaluation figures |
| Existing Next.js + Supabase/pgvector | Application/database integration after model verification |

Suggested baseline: TF-IDF with an explicitly defined pair-feature representation
and a supervised relevance estimator. Fit the vectoriser and estimator on training
data only. Record both how pair features are formed and how mentor candidates rank.

Suggested neural experiment if avoiding pretrained weights: a small Siamese-style
text encoder with randomly initialised token embeddings and a trainable sequence
encoder/projection. Encode mentee and mentor text, compare vectors and optimise
against reviewed pair relevance. Pin down shared versus role-specific encoders,
output width, score mapping and loss in M1; do not assume a new architecture is
already approved or will outperform a lexical baseline.

Training loop: input text -> train-fitted tokenisation -> profile vectors -> pair
score -> loss against the training label -> gradients -> parameter update. Run in
batches over epochs; validate periodically and select checkpoints on validation
only. Test the selected configuration later on untouched test queries/candidates.

The inspected export has only 60 labelled pairs, all marked training. Use it for
audit and a future pipeline smoke test, not a claim of adequate neural training
or final generalisation. Validation/test records are absent from this export.
Generating more records without fixing label/template problems is not a remedy.

Earlier Colab examples use pretrained MiniLM fine-tuning; they are not the
from-scratch implementation above and need adapting if that route is selected.
Tools have not been installed or training launched by this planning update.

References: [PyTorch training loop](https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html),
[scikit-learn text features](https://scikit-learn.org/stable/modules/feature_extraction.html).

## M1 · Freeze the question and requirements

**Achievement:** the dataset and model solve a defined project task.

- [ ] Map the learned task to the approved mentorship/semantic-matching objectives.
- [ ] Record the requirement to train a project-specific model. Determine the allowed
  starting point before implementing the training route: fine-tuning versus no
  pretrained weights/components. Do not assume the course diagram settles this.
- [ ] Choose the model route based on the requirement, data, compute and app interface.
- [ ] Define the prediction target and confirm the rubric used in the actual export.
- [ ] Define allowed input fields from information available when the app recommends.
- [ ] Select baselines and primary validation/test metrics before examining performance.
- [ ] Write person/template separation and candidate-pool rules; define what a held-out
  recommendation represents.

**Deliverable:** experiment protocol v1 and a short model/data contract.

**Gate:** one implementable model route with a defensible objective. A trained
compatibility classifier is not automatically equivalent to a semantic embedding
model; document/approve material changes to the project architecture or research task.
Synthetic-data auditing can proceed while this model-route decision is clarified.

**29 October evidence:** [draft protocol v0.1](ml-experiment-protocol.md) records
the proposed task, source rubric, allowed fields, strict person/template separation,
complete candidate judgments, comparisons and metric definitions. Initialization,
human approval and dataset freeze are unresolved. A draft is not protocol v1.

## M2 · Audit, repair and freeze the dataset

**Achievement:** a documented dataset suitable for a bounded pilot; no claim of
real-world suitability merely because records are synthetic or well formatted.

### Structure and integrity

- [ ] Extract profiles and pairs into separate structured files.
- [x] Check unique globally consistent person IDs, roles and pair IDs in the source.
- [x] Check every source pair references existing profiles with the correct roles/split.
- [x] Validate source schema, text/skill types, score ranges and required fields.
  Semantic ID/text consistency remains a manual review requirement.
- [ ] Record counts by split, independent people, domain and score; explain imbalances.

### Leakage checks

- [ ] Keep all records for a person in one split under the strict person-disjoint protocol.
  Check BOTH mentor and mentee IDs, including people with multiple roles.
- [ ] Group connected people if splitting existing pairs; inspect whether the pairing
  graph makes a useful split impossible. Grouping only by mentee is insufficient.
- [ ] Detect exact/normalised duplicate profiles, repeated pairs and paraphrased copies
  across splits. Inspect high-similarity candidates manually; thresholds alone do not
  establish absence of leakage.
- [ ] Inspect repeated scenarios/templates and generation wording that reveal labels.
- [ ] Exclude relevance scores, rationales, pair/split IDs, generation tags and review
  metadata from feature construction. Keep them separately for audit/targets.
- [ ] Check profile text for embedded hints such as 'strong match' or post-outcome facts.
- [ ] Define train-only fitting for tokenisers trained locally, vocabulary/TF-IDF,
  scalers, imputers, dimensionality reduction, feature selection and calibration.
- [ ] Freeze validation/test records before model selection; fit no learned transform
  on their profiles, even if they appear in a candidate corpus, under this protocol.

### Label validity

- [ ] Review suitable, ambiguous and difficult same-domain negative pairs against the rubric.
- [ ] Check unsupported assumptions, contradictions, stereotypes and industry shortcuts.
- [ ] Record human reviews/corrections; machine-generated reviews remain machine reviews.
- [ ] Distinguish a balanced pair-training sample from the real candidate pool used for
  retrieval evaluation; do not evaluate only an artificially easy candidate trio.
- [ ] Document that generated test labels measure a controlled synthetic task; plan
  independently judged examples for stronger suitability evidence.

**Deliverables:** `profiles.jsonl`, `pairs.jsonl`, immutable split manifests,
`dataset-card.md`, a reproducible audit notebook/script and a findings report.
Paths are proposed outputs, not files already created.

**Gate:** blocking leakage/integrity issues are resolved, rubric reviewed, dataset
version/hashes recorded. If repairs require regeneration, preserve the original and
record what changed. Do not silently edit the held-out set after evaluating a model.

**29 October evidence:** `ml/audit_export.py` and 15 regression tests verify source
integrity, missing pools, overlap triage, connected components and metadata shortcuts.
The source contains three unused Mentors, not the generating assistant's claimed six.
All 60 labels remain machine-generated and only 60 of 800 possible training pairs
are judged. No leakage clearance, human approval, split freeze or training is claimed.

## M3 · Reproduce a baseline through the full experiment workflow

**Achievement:** local code → GitHub revision → Colab → persistent outputs works.

- [ ] Create a notebook and reusable modules matching the selected model route.
- [ ] Record dependencies, source commit, model initialisation/revision, seeds and data hashes.
- [ ] Load the frozen splits; assert prohibited overlaps and disallowed input columns.
- [ ] Fit preprocessing on training data only using an inspectable pipeline.
- [ ] Run a simple justified baseline and save validation predictions/metrics.
- [ ] Independently verify a small hand-calculated metric example.
- [ ] Save outputs in a unique Drive run folder and confirm local download/sync.
- [ ] Repeat the baseline in a fresh runtime and explain any nondeterminism.

**Deliverable:** baseline run with configuration, preprocessing artefact, predictions,
metrics, logs and executed notebook. Do not claim the historical synthetic results
are directly comparable to a newly defined dataset/protocol.

**Gate:** reproducible baseline and metric implementation accepted. Use validation
for development; do not repeatedly inspect test performance here.

## M4 · Train the selected model and test controlled improvements

**Achievement:** actual project-specific parameter fitting, with recoverable evidence.

- [ ] Run a small smoke test and verify save/reload before a longer experiment.
- [ ] Train from the approved initialisation using training data only.
- [ ] For iterative neural training, set maximum epochs, evaluation frequency,
  early-stopping metric/patience and checkpoint selection explicitly.
- [ ] For classical models, record their own convergence/hyperparameters; do not invent
  neural-network epochs or checkpoints that the estimator does not use.
- [ ] Save training/validation history, configuration, resource details and artefacts.
- [ ] If retaining three best checkpoints, rank by the declared validation criterion;
  ordinary 'keep 3' retention is not automatically top-three selection.
- [ ] Inspect validation errors and test one justified change per comparison.
- [ ] Save unsuccessful runs too; select a configuration using validation evidence only.

**Deliverable:** trained model + preprocessing, run manifest, validation results,
appropriate plots and a decision log explaining the selected model.

**Gate:** selected artefact reloads and produces valid outputs. Training completion
alone does not demonstrate improvement over the baseline.

## M5 · Perform held-out evaluation

**Achievement:** defensible claims about the selected model's measured behaviour.

- [ ] Freeze model choice, metric definitions and thresholds before opening test scores.
- [ ] Evaluate the selected model and baselines on the same test queries/candidates.
- [ ] Save raw per-query predictions with stable IDs, ranks and relevance judgments.
- [ ] Report retrieval metrics such as P@k/MRR/nDCG where appropriate; use metrics
  suitable for ordinal/classification outputs as well. State denominators and cutoff rules.
- [ ] Preserve candidate positions; do not remove unlabelled candidates and silently
  compress ranks. Define judging/exclusion rules before scoring.
- [ ] Independently recompute metrics and report uncertainty, sample sizes and failures.
- [ ] Report improvement, no improvement or degradation honestly.

**Deliverable:** final held-out evaluation report with raw predictions and limitations.

**Gate:** calculations checked. If test findings cause further model selection, call
that test set development data and arrange a new independent final evaluation.

## M6 · Integrate the trained artefact

**Achievement:** the final application actually uses the verified trained model.

- [ ] Define a versioned inference interface and deployment format for the chosen route.
- [ ] Package the model together with its fitted preprocessing and input schema.
- [ ] Compare notebook and app outputs on fixed inputs, including invalid/sparse inputs.
- [ ] If changing embedding models, use one model version for all query/mentor vectors;
  re-embed the corpus and verify dimensions. Same width does not mean same vector space.
- [ ] If choosing a pair scorer, implement and evaluate its candidate retrieval/reranking
  path explicitly; existing pgvector routing is not automatically that integration.
- [ ] Test isolated local profile → recommendation → request/connection flow and permissions.
- [ ] Verify build, latency, failure handling and rollback before release.

**Deliverable:** tested integration commit, model/version manifest and functional test record.

**Gate:** complete core workflow demonstrated; no unverified model swap or mixed vectors.

## M7 · Finish research evidence and release readiness

**Achievement:** implementation, report and presentation agree about what was done.

- [ ] Put implementation, training choices and verified results in Chapter 5.
- [ ] Update Chapter 4 diagrams for actual design changes.
- [ ] Record synthetic-data provenance, Gemini prompts/model and material AI assistance.
- [ ] Complete required human relevance/usability evaluation with the appropriate process;
  do not fabricate real-user or SUS outcomes from synthetic data.
- [ ] Reconcile every approved objective and retained supporting feature with evidence
  or an explicit supervisor-approved amendment.
- [ ] Verify hosted configuration and role-specific smoke tests when deploying.
- [ ] Rehearse a short demo plus truthful limitations and reproducible fallback evidence.

**Deliverable:** evidence-backed report/demo and accepted scope/release checklist.

**Gate:** see `sprint-review-readiness.md` for accounts, security, jobs/cohorts/events,
hosting and broader project gaps. ML completion does not close those workstreams.

## Operating rules for both development sessions

- Inspect Git state and this plan before editing; avoid overlapping files.
- Update milestone evidence and status after verification, not on intention.
- Preserve already-staged work owned by the other session.
- Commit each verified logical milestone with a Gitmoji message; inspect its staged diff.
- Push only when the current user prompt authorises it.
- Keep secrets and unreviewed private conversation material out of commits.
- The training requirement is established; the permitted initialisation route remains
  a documented decision. Earlier MiniLM fine-tuning examples are provisional until then.

## Leakage questions answered

**Does sending the Markdown export here cause training leakage?** No, sharing it
for an audit does not itself fit model weights or insert it into a training Dataset.
The risk is using held-out examples/results to choose the model, features or prompts.
We can inspect integrity before freezing the protocol; afterwards, keep performance
based on held-out data out of the development loop.

**Can one Gemini chat produce every split?** Yes as a generation mechanism, but
split labels in the output prove nothing. Shared people, templates, label cues and
correlated judgments still need checks. One generator's agreement with itself is
not independent evidence of real mentorship suitability.

**What should be sent now?** The Markdown export and any separate data files it
references. Remove API keys/passwords and unrelated personal details first. No
need to upload the entire source repository or a full set of private documents.

## Source guidance

- [scikit-learn: common pitfalls and leakage](https://scikit-learn.org/stable/common_pitfalls.html)
- [scikit-learn: grouped validation](https://scikit-learn.org/stable/modules/cross_validation.html)
- Lecturer's supplied development-sprints PDF and the local proposal traceability
  audit inform project scope; they do not supply new generated records or model results.
