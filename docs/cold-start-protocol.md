# Cold-start verification protocol

Issue #4: a new Mentee can obtain profile-based Mentor recommendations before any mentorship interaction, once a usable saved profile, compatible inference and eligible catalogue exist. This is a functional availability claim. Useful relevance needs independently reviewed judgments under #3; a returned card or similarity value does not establish suitability.

## Boundaries

- Signup creates identity and a name-only profile. Names are not embedding inputs. A name-only account has no match vector and receives profile-completion guidance.
- The existing Recommended path uses frozen `Xenova/all-MiniLM-L6-v2` and stored normalized 384-value vectors. Its text builder includes headline, bio, skills, industry and graduation year. Any nonempty supported field currently permits inference; start with a meaningful headline and skills rather than interpreting metadata-only input as a useful mentoring goal.
- Compare models separately runs fresh profile snapshots through MiniLM and the directional 64-value scratch pilot. It never writes scratch vectors into the MiniLM column. This is an experimental comparison, not final selected-model integration under #26.
- Mentor discoverability requires Mentor role, effective visibility, a compatible stored vector for Recommended and no block in either direction. Availability is explicitly returned and request authorization enforces it. An unavailable Mentor may remain visible in discovery; the Accepting new requests filter narrows that list. Do not report that all visible cards are requestable.
- Empty/unknown input and an empty catalogue are different conditions. There is no calibrated suitability threshold, so a nonempty eligible catalogue can still return poor matches. The suite records availability, not a fabricated no-suitable-Mentor classifier.
- New-user cold start means zero requests and connections before first results. Model/server cold start means first inference in a fresh application process. Download caches, OS caches and a restarted process are distinct. Record which were controlled.

## Repeatable scenarios

Use a dedicated EMPTY loopback Supabase project `alumni-cold-start-4`, API port 55421, app port 3144, repository migrations and local auto-confirm only. Real hosted/shared databases are rejected. There are no existing member records to hide, edit or delete. Keep optional email suppressed and disable fixture preferences. Use fictional reserved `example.test` addresses and generated ephemeral passwords; never publish them or browser cookies.

| Scenario | Expected evidence |
| --- | --- |
| Anonymous caller | Embed, Recommended and Compare reject with 401 |
| Genuine browser signup | Name-only profile, null embedding, zero interactions, incomplete-profile responses |
| Sparse professional input | Headline and skills save through actual form and real model inference |
| Empty catalogue | HTTP success with zero candidates; no fabricated cards |
| New Mentor | Invisible to Recommended before embedding, discoverable after actual profile-save inference |
| First recommendations | Recorded candidate pool and zero requests/connections before results |
| Model comparison | Same permitted pool, distinct model identities/dimensions, no mixed-vector persistence |
| Unfamiliar input and interrupted inference | Saved edits preserved; old vector unavailable; real retry regenerates it |
| Privacy and access | Both block directions, hidden profile, explicit availability, cross-user write denial |
| Model-width and stale-write checks | Incompatible width rejected; older profile timestamp cannot persist inference |
| First-contact journey | Actual browser request, intended-recipient acceptance and persistent connection, plus availability with zero/one/two distinct request interactions |
| Browser output | Scoped accessibility check and sanitized fictional-data screenshot |

## Measurements and outputs

`node scripts/run-cold-start.mjs` creates and owns that dedicated stack, builds the application with its local configuration, runs the browser suite and stops only that stack afterward. It refuses an already existing test container. Docker and installed Chrome are required; cached/downloadable MiniLM artefacts must be available. It replaces `.next`, so rebuild normally before starting the app against ordinary development configuration.

`scripts/verify-cold-start.mjs` emits sanitized JSON containing per-case outcomes, every timed API status/duration, scripted signup-submit-to-profile duration, scripted profile-save-to-embedding-response duration, each comparison model's own reported duration, model identity and exact cleanup outcome. Preserve failures and denominator counts. Results carry source identity and environment; never remove failed trials to improve summaries.

Scripted entry/submit timing is not human profile-entry or onboarding time. Genuine human entry time, reviewed relevance, representative-user usability and performance at 100 concurrent requests are separate evidence under #3/#5/#29. Do not calculate persuasive tail-percentile claims from a tiny functional sample. Repeat measurements in separately identified runs and record cache/process state before comparing.

The failure injection intercepts one browser embedding request with HTTP 503 after a real profile save. It tests recovery at that boundary, not an actual provider outage. The stale-write check deterministically exercises the same updated-at predicate used by `/api/embed`; it does not pretend native inference was held in flight. Local auto-confirm excludes hosted email-code acceptance. Cleanup deletes only registered fixtures, reads back zero profiles, then the dedicated stack is stopped.

## Completion dependencies

Engineering evidence can be completed now. Keep #4 open for human-reviewed relevance (#3), selected scratch-model training/integration (#25/#26), the supervisor's actual graph decision and any agreed comparison (#27), genuine profile-entry measurements where claimed, and final assessed hosted repetition (#8). These dependencies cannot be completed by relabelling the engineering pilot or by inventing reviewer/supervisor decisions. The protocol is reusable for that final release.
