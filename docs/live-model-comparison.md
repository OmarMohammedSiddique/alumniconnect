# Live model comparison

Issue #26 · 5 November 2026 · experimental pilot integration

Discover opens in **Compare models** mode. The two columns show the top five
mentors ranked by frozen MiniLM and the student's saved scratch-trained pilot.
Recommended and Keyword search remain available. This is an engineering preview,
not final model selection, a new training run, or a claim of matching accuracy.

## Model identity and serving

The scratch artifact is exported from the selected `checkpoint-1.pt` in the
verified 2 November run. It retains the random-initialized character CNN's learned
weights, training vocabulary, 512-codepoint casefold/truncation/padding contract,
and distinct normalized 64-value query and mentor projection heads.

- Checkpoint SHA-256: `235d1a1a4ff0c37fd76ec9f2c99c4a3365dc136768e9757f1a3f4f6279486409`
- ONNX SHA-256: `1ed9ed95cc33cf63e5c3f4db020248975fdd841573b56615b197df58df3a24e7`
- Version: `scratch-pilot-v1:1ed9ed95cc33`
- Runtime: pinned `onnxruntime-node` 1.30.0, CPU, one intra-operation thread.
- Artifact: `ml/models/scratch-pilot-v1/encoder.onnx`, approximately 46 KiB.

Node loads the local artifact once per process, verifies its hash, and executes
both heads in one batched inference. A failed model load can be retried. No
Python service, new database column, profile-vector migration, external scratch
model download, or new training is required. The model and private training
profiles are separate: only the export, character vocabulary/casefold map and
invented reference fixtures are committed. The original checkpoint/run stay private.

Export reproducibly using the pilot Python environment and `requirements-export.txt`:

```sh
python ml/export_scratch_pilot.py \
  ml/runs/scratch-verified-2026-11-02/checkpoint-1.pt \
  ml/models/scratch-pilot-v1
node --experimental-strip-types --test lib/scratch-model.test.mjs
```

The exporter explicitly uses PyTorch's legacy ONNX export for this fixed simple
graph (opset 17, dynamic batch, fixed sequence length). Its deprecation warning is
expected; exported outputs are independently checked against PyTorch within
absolute tolerance `1e-5`. Python is needed for export, not app inference.

## Comparison contract

`POST /api/match/compare` authenticates the caller and reads a fresh profile
snapshot with the caller's Supabase client/RLS. Visible mentors excluding the
caller are selected in stable ID order. Both models receive exactly the same
headline, bio, skills and industry text and candidate pool. Names and graduation
years are displayed but excluded from inference. This differs from the existing
Recommended route, whose MiniLM text can include graduation year.

This bounded preview considers at most 50 visible mentors. If more exist, the UI
explicitly identifies the selected subset. It does not preselect using MiniLM or
claim a whole-community comparison. Both models encode the current text on each
request, with no saved comparison-vector cache or database writes. MiniLM runs
sequentially over the pool to bound memory. The scratch query head is compared
only with scratch mentor-head outputs; no cross-model vectors are compared.

Each column reports its own cosine rankings, model identifier and measured
inference/startup time. Scores are not comparable confidence scales between
models, and live inputs without reviewed labels have no computed accuracy.
Results retain mentor availability, shared skills, request state and safety
actions. Blocking removes a mentor from both displayed lists. Request forms use
unique IDs even when the same mentor appears in both columns.

## Failure and resource behavior

Authentication, blank profile, data access, rate limiting, native-model failure
and request timeout have explicit responses. Each model's failure is isolated
when its inference rejects; its column shows an error without substituting the
other model's rankings. Model tasks are awaited together; a hung task causes the
overall 55-second deadline to return a retryable timeout. MiniLM initialization
failures can be retried rather than poisoning the process permanently.

The comparison has a per-user three-request/minute guard and two active jobs per
server process. Timed-out native work retains its slot until it finishes. These
are process-local protections, not a distributed scalability guarantee. Responses
are private/no-store; no profile text or raw embeddings are returned in metadata.
Next's output trace explicitly includes the local ONNX artifact, and the native
runtime is externalized for Node. Hosted platform limits still need verification.

## Verification and remaining acceptance

The automated parity fixtures cover both heads, empty/sparse text, Unicode and
unfamiliar characters, long input, batch and single-row execution. Additional
tests cover invalid batches/vectors, complete output, input-field exclusions,
cosine ranking and ties. The existing final test dataset is never loaded.

The local integration runner creates disposable accounts only against loopback
Supabase, checks real HTTP inference against the artifact, authentication, blank
profiles, hidden/block filtering, changed-profile behavior and rate limiting,
and deletes the accounts in `finally`:

```sh
node --env-file=.env.local --experimental-strip-types \
  scripts/verify-model-comparison.mjs --browser
```

The optional browser stage checks authenticated rendering, desktop/mobile layout,
an accessibility scan and browser errors using installed Chrome. Screenshots go
to `/private/tmp`, not public issues. Local verification does not establish CI,
deployment, final human-reviewed quality, or the complete request/acceptance
journey. Issue #26 remains open for those required acceptance gates. #25/#3 still
own improved training and reviewed evaluation; this pilot does not close them.

To stop the temporary comparison, change Discover's initial mode back to
`semantic` and remove its comparison button. Existing stored MiniLM vectors and
the Recommended API are preserved, so no reverse database migration is needed.
