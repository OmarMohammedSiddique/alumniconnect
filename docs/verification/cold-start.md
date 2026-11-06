# Cold-start engineering evidence

Recorded trials: 6 November 2026. Publication audit: 7 November 2026. Issue #4 remains open for its final research/model requirements.

## Published implementation and CI

[PR #84](https://github.com/OmarMohammedSiddique/alumniconnect/pull/84) merged on 6 November at `4aad49e58012a4ad8491b8abbe7dc829c7703de4`. All checks passed: quality, database permissions, ML regression, CodeQL, previews and the new `Cold-start browser journey`. [CI run 42258825560](https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42258825560) independently built the production app against a dedicated empty Supabase stack and passed all 12 scenarios. The retained [sanitized CI record](cold-start/2026-11-06-ci.json) identifies GitHub's synthetic test-merge source `5e51b4d`, the exact verification-script/migration hashes, Node 22.23.4 and Chrome 157.0.8103.38. That synthetic CI source is distinct from the final merge commit.

The normal recommendation path uses frozen MiniLM and stored 384-value vectors. Compare models independently runs MiniLM and the directional 64-value scratch pilot on fresh snapshots. These tests do not replace normal recommendations with the selected scratch model or establish its relevance.

## Defect and verified correction

The [before-fix regression](cold-start/2026-11-06-regression-before-fix.json) passed five scenario groups, then found that saved profile text retained its previous vector when a browser embedding request failed with an injected HTTP 503. Recommended could therefore rank using an earlier goal. Exact fixture cleanup passed despite the failed test.

Migration `20261106165316_invalidate_stale_profile_embeddings.sql`, committed in `1668f9f`, adds a private invoker trigger after existing profile guards. Changes to headline, bio, skills, industry or graduation year atomically clear the vector. Direct member vector writes remain forbidden; same-value saves, name edits, visibility and availability preserve valid inference. The existing save/refresh/retry path rebuilds the vector and the existing updated-at predicate rejects stale inference persistence. No historical vectors are backfilled.

The new SQL suite checks every matching field, same-value/name edits, normal inference writes and forbidden member vector writes. Full RLS, notification, reminder and embedding suites passed locally and in CI. The availability fixture now refreshes its synthetic vector after editing skills, matching the new lifecycle.

## Measured functional results

| Observation | Local trial 1 | Local trial 2 | CI trial |
| --- | --- | --- | --- |
| Scenario groups passed | 12/12 | 12/12 | 12/12 |
| Scripted Mentee profile-save to first result | 240 ms | 211 ms | 555 ms |
| Candidates / returned results in that case | 2 / 2 | 2 / 2 | 2 / 2 |
| Prior requests for that fresh Mentee | 0 | 0 | 0 |
| Exact cleanup | Zero profiles | Zero profiles | Zero accounts and profiles |

[Local trial 1](cold-start/2026-11-06-local-1.json) and [local trial 2](cold-start/2026-11-06-local-2.json) preceded the final harness commit `5632827`; their source field identifies the functional database/app baseline `1668f9f`. Trial 2 additionally retains its then-executed development script hash. The CI artifact verifies the final committed harness, including both empty-account and cleanup read-back guards. Do not silently relabel the development runs as executions of the final harness.

Four fictional accounts, two Mentees and two Mentors, formed a catalogue of zero, one and then two Mentors. The browser submitted actual signup, profile-save, request and acceptance forms. Supabase Auth/Postgres and both model runtimes were real. The suite checked zero, one and two distinct request interactions, name-only and sparse profiles, empty catalogue, new Mentor discoverability, unfamiliar input, interrupted refresh/retry, both blocking directions, hidden profiles, explicit availability, cross-user write denial, incompatible vector width, stale persistence and scoped accessibility. Optional fixture mail was disabled, delivery suppressed, exact accounts removed and the dedicated stack stopped. Existing local and hosted member data were untouched.

All per-operation statuses and timings are retained, including expected incomplete-profile errors and the injected failure. The CI trial records 29 operations. Its first sparse-profile save/embedding response took 1505 ms; its later same-pool comparison reported MiniLM 29 ms and scratch 79 ms. Those comparison calls occurred after earlier MiniLM inference. A fresh app process, pre-existing disk download cache and a warm model are different conditions; this record does not claim an uncached download benchmark.

These are small scripted functional observations, not human profile-entry times, load tests, population coverage or tail-latency estimates. They do not establish the 100-concurrent-user/two-second target in #29. A fresh marine-archaeology/Stratigraphy profile received two backend/database candidates with no shared skills. That demonstrates why nonempty output is not a suitability guarantee; no automated assertion calls those candidates suitable. Independently reviewed relevance remains #3.

## Reproduction and current production boundary

Run `node scripts/run-cold-start.mjs` with pinned dependencies, Docker and Chrome. It owns the separate `alumni-cold-start-4` stack (API 55421, app 3144), refuses an existing dedicated container and rejects shared/hosted or nonempty databases. Only its temporary configuration disables Google auth/seed data and uses local auto-confirm. Signup email-code acceptance is outside this suite. Full setup output stays in a private temporary log; CI uploads only sanitized JSON. Rebuild normally afterward because the isolated build replaces `.next`.

The injected HTTP 503 is a controlled browser/API-boundary failure, not a real model-provider outage. The stale-write test deterministically exercises the existing timestamp predicate rather than claiming native inference was held in flight. The protocol is in `docs/cold-start-protocol.md`.

The initial 7 November audit found application merge `4aad49e` READY in production while the hosted migration was absent. That finding was corrected after the owner explicitly approved the exact migration and controlled hosted verification. The verified release below supersedes the earlier pending production status.

## Remaining final acceptance

Keep #4 open for independently reviewed relevance (#3), selected scratch-model training/integration (#25/#26), the actual supervisor graph-scope decision and any agreed comparison (#27), genuine human profile-entry timing where claimed and final assessed hosted repetition (#8). The test infrastructure and present MiniLM engineering baseline are reusable for that release. Neither reviewer judgments nor supervisor approval can be manufactured by automated engineering work.

## Approved hosted correction and acceptance, 7 November 2026

The exact reviewed migration was applied as hosted version `20261106213149_invalidate_stale_profile_embeddings`. Read-back verified the trigger enabled, invoker privileges, no authenticated/anonymous direct function execution and no ordinary-member usage of the private schema. Existing vectors were not backfilled. Security advisor finding names/counts were unchanged from the pre-migration baseline; no new private-trigger exposure appeared. The application source `0a80b20` was already deployed and needed no application-code change for the trigger to take effect.

[Sanitized hosted results](cold-start/2026-11-07-hosted.json) retain all six passed groups, per-operation statuses/timings, model identities and exact cleanup. Two generated, marked fictional accounts used reserved addresses, administrative preconfirmation and disabled email preferences before profile content/inference. This is not hosted signup-code verification. Chrome used the actual custom domain and submitted the real profile forms.

- A name-only fixture had no vector and Recommended returned HTTP 422.
- Actual Mentor/Mentee profile saves generated 384-value vectors, and the fresh Mentee saw the newly completed Mentor with zero requests/connections. The normal response returned six total candidates, including the fixture; existing member profiles were not edited.
- Intercepting only the fixture browser's refresh with HTTP 503 after a saved goal change preserved the new text and immediately left the stored vector null. Recommended returned HTTP 422 rather than using the earlier goal. Clicking the real Retry update button regenerated inference and restored HTTP 200 recommendations.
- Same-value saves preserved the valid vector. Authenticated member vector writes were rejected and cross-user profile updates returned no changed row.
- Hosted Compare models returned separate MiniLM 384-value and scratch-pilot 64-value outputs without errors or mixed persistence. This remains the experimental pilot comparison, not final model selection.
- No fixture event recorded provider acceptance or sent status. Exact identity/marker guards, sign-out and deletion removed only the two test accounts. Independent SQL read-back confirmed zero marked accounts, zero fixture profiles, zero fixture outbox records and the trigger still enabled. No real-member profile/password changed.

Individual hosted observations were 5900 ms and 4589 ms for the two initial profile-save/embedding responses, 1733 ms for the first normal retrieval and 1050 ms for retrieval after retry. Comparison reported MiniLM 816 ms and scratch 100 ms internally, with an overall HTTP observation of 3585 ms. These include different boundaries and conditions from the isolated local trials; they are not a benchmark, relevance result or evidence that a performance target was met. The controlled HTTP 503 is a fault injection, not a claim of a real provider outage.

The stale-vector correction is now active on production profile writes. Future matching-input edits clear old inference atomically; members use the existing save/refresh/retry path to obtain results for their current saved goal. Remaining #4 requirements are reviewed relevance, human timing where claimed, final selected scratch-model integration and the supervisor graph decision/comparison, followed by final assessed-release repetition. Hosted engineering acceptance does not close those research dependencies.
