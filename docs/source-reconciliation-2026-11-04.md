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
