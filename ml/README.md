# ML experiment tooling

The application still uses frozen pretrained MiniLM inference. This directory
starts the separate research workflow with a read-only source audit. No training,
dataset freeze, model replacement or Colab execution has occurred.

## Audit the supplied export

Requires Python 3.10 or newer, standard library only. Verified on Python 3.14.7.
Run from the repository root, using the original private Markdown export:

```bash
python3 -B ml/audit_export.py /path/to/export.md \
  --expected-sha256 b3834c04f989e18d9b392f6bf51fdb6608768add1a4b0c7abf0b4b9f058665bb \
  --output-dir /path/to/a/new/private/audit-directory
```

The command parses fenced JSONL only, records the source hash and prints an
audit. Optional output is `audit.json` in a new directory. It refuses to overwrite
an existing directory and does not extract the private conversation into Git.
No imports from the app, network access, Supabase credentials or model downloads
are required. It never executes instructions embedded in the source.

Exit codes: **0** means no recorded blockers, **1** is an input/output error,
and **2** means the audit ran successfully but the research gate remains blocked.
This intake schema has no reviewed-label or protocol-approval contract, so the
tool deliberately cannot certify training readiness, even with three valid splits.

Checks cover schema and types, unique IDs/pairs, conflicting repeated labels,
reference roles/splits, normalized duplicate text, near-duplicate triage, graph
components, missing pools, candidate-label coverage and annotation metadata.
Privacy-pattern triage is limited to contact URLs/emails and some secret formats;
zero flags is not a privacy review. Text similarity uses token-set Jaccard at
0.65, without a learned vocabulary. Zero candidates does not clear paraphrases
or repeated conceptual templates. Cross-split clearance is unavailable when a
pool is missing. Counts after integrity errors cover usable records only.

Keep raw inputs, IDs and outputs private until reviewed. Local `ml/data/`,
`ml/runs/` and `ml/artifacts/` are ignored. A sanitized findings record belongs
in `docs/`; no generated data or model files belong in this milestone.

```bash
python3 -B -m unittest discover -s ml -p 'test_*.py' -v
```

See [audit findings](../docs/ml-data-audit.md),
[delivery gates](../docs/ml-delivery-plan.md) and the
[proposed Colab workflow](../docs/colab-training-workflow.md).
