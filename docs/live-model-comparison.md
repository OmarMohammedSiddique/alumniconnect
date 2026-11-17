# Live model comparison

Issue #26 · updated 17 November 2026 · experimental integration of scratch model v3

Discover opens in **Compare models** mode. The two columns show the top five
mentors ranked by frozen MiniLM and by the model trained from scratch, version 3.
Recommended and Keyword search remain available and unchanged. This is an
experimental preview. It is not a claim of matching accuracy for real members:
the v3 model was trained and tested on synthetic profiles with generated labels
that no person has reviewed (see [`ml-scratch-v3.md`](ml-scratch-v3.md)).

**What changed on 17 November 2026:** the v3 model replaced the v1 pilot in the
scratch column. Nothing else changed: no production database change, no change
to the default Recommended list and no stored-vector migration. The v1 artefact
stays in `ml/models/scratch-pilot-v1/` for the record.

## Model identity and serving

The artefact is exported from the locked checkpoint of run
`v3-grid-conv-w128-pre-s42` (convolutional encoder, width 128, 597,632
parameters, every one trained from random initialisation). It has a byte-pair
tokeniser learned from training text and distinct normalised 64-value Mentee
(query) and Mentor heads.

- Checkpoint SHA-256: `fec862f8d00bd3c988413bb0140784c01b39ce84601a31e4ac3e86fad155d8df`
- ONNX SHA-256: `8c918ddf78e3a54503215db2bfae2f52cd83f024233105a6f002d2513595ff71`
- Tokeniser SHA-256: `20ad3b6a94b26f3f1f78d22887701a21b82cfcbbf48a59544931246d8c8f34a0`
- Lock file SHA-256: `a891014b2db38f669bc67a3c55b752d8402165621b808b4a563fb5cba92f9556`
- Version shown in the interface: `scratch-v3:8c918ddf78e3`
- Runtime: pinned `onnxruntime-node` 1.30.0, CPU, one intra-operation thread.
- Artefact: `ml/models/scratch-v3/` (`encoder.onnx` 2.29 MB, `tokenizer.json`,
  `manifest.json`, `parity.json`).

Node loads the tokeniser and the model from local files once per process and
checks both SHA-256 hashes against the manifest before use. Nothing is fetched
from a model hub for the scratch model. Text is tokenised by
`lib/scratch-tokenizer.ts`, which mirrors `ml/bpe_tokenizer.py` exactly: only
ASCII letters are lower-cased and only ASCII white space splits words, input is
truncated to 160 tokens and an empty text becomes one unknown token. Both heads
run in one batched inference. A failed load can be retried.

Export and check:

```sh
python ml/export_scratch_v3.py ml/runs/v3-grid-conv-w128-pre-s42/checkpoint_best.pt \
  ml/models/scratch-v3 --lock ml/runs/v3-grid-conv-w128-pre-s42/LOCK.json
node --experimental-strip-types --test lib/scratch-model.test.mjs
```

The exporter uses PyTorch's legacy ONNX export (opset 17, dynamic batch, fixed
sequence length). Exported outputs are checked against PyTorch within `1e-4`;
the measured largest difference on the parity fixtures is `1.8e-7`. Python is
needed for export, not for application inference.

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
Next's output trace explicitly includes the local ONNX artefact and tokeniser file, and the native
runtime is externalized for Node. Hosted platform limits still need verification.

## Verification and remaining acceptance

Automated tests (`lib/scratch-model.test.mjs`) cover tokeniser parity with
Python on plain, mixed-case, symbol, Unicode, empty and over-long text; both
heads within `1e-4`; batch and single-row execution; invalid batches; a missing
model file; an altered model or tokeniser file; and that the v1 artefact is
still present. The test split of the training data is never loaded by the app.

The local integration runner creates disposable accounts only against loopback
Supabase, checks real HTTP inference against the artefact, the served version
and name, that the two models rank the pool differently, authentication, blank
profiles, hidden and blocked profile filtering, changed-profile behaviour and
rate limiting, and deletes the accounts in `finally`:

```sh
COMPARISON_APP_URL=http://localhost:3100 COMPARISON_SCREENSHOT_DIR=docs/verification/ml-scratch-v3 \
  node --env-file=.env.local --experimental-strip-types scripts/verify-model-comparison.mjs --browser
node --env-file=.env.local --experimental-strip-types scripts/measure-comparison-latency.mjs 24
```

**Local evidence, 17 November 2026** (production build served with `next start`
against the local Supabase stack):

- Both runner stages passed, including the browser stage (desktop and mobile
  layout, accessibility scan, no browser errors).
- Screenshots: `docs/verification/ml-scratch-v3/model-comparison-v3-desktop.png`
  and `model-comparison-v3-mobile.png`. They show both columns, different
  rankings, the version `scratch-v3:8c918ddf78e3` and per-model timings.
- Single run on the screenshot: scratch v3 8 ms, MiniLM 27 ms, pool of 7 Mentors.
- 24 requests from 12 disposable accounts, pool of 5 seeded Mentors: scratch
  model median 10 ms, 95th percentile 13 ms, maximum 18 ms; first request after
  server start 68 ms including model loading. MiniLM median 26 ms. Whole HTTP
  request median 51 ms, 95th percentile 62 ms.
- Model alone on a full batch of 51 profiles (the route maximum): median 33 ms.

**If the model file is missing or altered** the scratch column shows "Your
trained model (v3) is unavailable. Please retry the comparison." while the
MiniLM column still shows its results. No other model is substituted.

Local verification does not establish hosted behaviour. The signed-in check on
the hosted site is left for the project owner. Issue #26 remains open: the
scratch model does not drive the default Recommended list, stored vectors were
not migrated, and the full request and acceptance journey with the scratch
model has not been verified. Human review of labels (#115) and supervisor
acceptance (#25, #3) are also still open.

To stop the comparison, change Discover's initial mode back to `semantic` and
remove its comparison button. To go back to the v1 pilot, point
`lib/scratch-model.ts` at the earlier artefact (see the Git history of that
file). Stored MiniLM vectors and the Recommended API are untouched, so no
database change is needed either way.
