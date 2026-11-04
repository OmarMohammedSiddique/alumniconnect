# Source reconciliation · 4 November 2026

Issue: #24. The user authorized publishing all pending work to `main`.

## Retained history

- Hosted GitHub `main` first received the registration/Google/security work through
  PR #38, merge `881f7a1`.
- Local `main` still ended at `a7a59ad` and contained four unique unpublished ML
  commits: `f7a77a2`, `4a0711e`, `6057398` and `a7a59ad`.
- Branch `research/pilot-publication` starts from `881f7a1` and merges that local
  `main` history without rewriting or discarding its commits. The merge was clean.
  Its changes are the existing audit, preparation, training, notebook and ML
  status documents, plus this reconciliation record.

## Verification of the combined source

- Full ESLint, TypeScript, all 45 Node tests and Webpack production build passed.
- All 24 ML audit/preparation tests and six training/metric/input tests passed
  using an isolated temporary Python environment with the pinned Torch, NumPy
  and scikit-learn versions.
- The notebook's code cells parse, have no execution outputs and retain the
  expected training-runner hash. The locally ignored data manifest matches the
  notebook's expected manifest hash.
- A clean Git source export runs all 30 ML tests and all three documented Python
  CLI entry points. It contains no private dataset, checkpoint or run directory.
- The merge retains production MiniLM inference and the latest application/auth
  changes. No new training, final-test scoring or model deployment was performed.

The [pilot execution record](ml-pilot-training.md) documents the earlier local
and Colab runs and negative machine-labelled validation result. Human review,
final model selection, comparable evaluation and live-model integration remain
separate open work. Publishing source does not validate mentorship quality or
establish which revision is deployed; PR/CI/default-branch evidence is recorded
in issue #24.

## Acceptance review after the user questioned closure

The issue was reopened after PR #39 automatically closed it. Source integration
is a bounded deliverable; it does not certify the research model. Each original
criterion was then checked separately:

| Criterion | Evidence and result |
| --- | --- |
| Identify refs/divergence and preserve work | `881f7a1` retained the app/auth/security line; local `a7a59ad` contained four unique ML commits. The clean integration and final fast-forward preserved both histories. |
| Retain all four ML milestones | All four original SHAs are ancestors of merged main, rather than replacement or fabricated commits. |
| Publish tooling and exclude private artefacts | The 15 ML source/notebook/documentation files are merged. Git tracks no files under `ml/data`, `ml/runs` or `ml/artifacts`; credentials remain ignored. |
| Reconcile stale status statements | The pilot execution record distinguishes earlier local/Colab evidence from research readiness. PR #40 corrects the system guide's stale claim that no scratch training exists. |
| Verify the combined application and ML source | Lint/typecheck, 45 Node tests, Webpack production build, 24 audit/preparation tests and six training/metric/input tests passed. |
| Verify fresh-source tooling with permitted inputs | Installed all seven pinned direct dependencies in an isolated environment. A clean main source export prepared dummy synthetic fixtures, ran one optimizer epoch, saved/reloaded a checkpoint and passed notebook schema validation. All three CLI entry points and 30 ML tests also run from the export. The private local pilot manifest matches the notebook's expected hash. |
| Verify authorized PR/default-branch integration | PRs #38/#39 passed required CI and merged; local and remote main matched at `a1a44e7`, with no unpublished local-branch commits. PR #40 separately verifies the updated guide through CI. |

The extra one-epoch run uses disposable test fixtures solely to verify fresh-source
execution. It does not rerun the real pilot, access final-test performance, create
new research results or change production recommendations. No human-reviewed
labels, final-model selection, superior mentorship quality or scratch-model
deployment is claimed. Those acceptance criteria remain in #3, #25 and #26.
