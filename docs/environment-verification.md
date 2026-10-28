# Local environment verification · October 2026

Original 14–15 October scope: isolated temporary account on the existing local AlumniConnect stack.
The target was checked as loopback before requests. No hosted project was used.

## Diagnosis

The initial unsigned-in profiles request returned HTTP 401 with PostgreSQL code
`42501` and message `permission denied for table profiles`. The configured local
URL, anonymous key and service-role key match the active CLI-reported instance.
The table's read policy targets `authenticated`; unauthenticated clients are not
granted profile access. This is expected privilege enforcement, not evidence of
an expired or mismatched key. No application or environment change was needed.

## Expected and actual results

| Test | Expected | Actual | Outcome |
| --- | --- | --- | --- |
| Compare local URL and keys with active instance | All match | All match | Pass |
| Auth health | HTTP 200 | HTTP 200 | Pass |
| Unsigned-in profile request, API key only | Denied | HTTP 401, code 42501 | Pass |
| Unsigned-in profile request, API key plus anonymous bearer | Denied | HTTP 401, code 42501 | Pass |
| Service-role profiles request with limit 0 | HTTP 200 | HTTP 200 | Pass |
| Create temporary confirmed local mentee | Account/profile created | Created | Pass |
| Password sign-in using ordinary anonymous-key client | Session issued | Successful | Pass |
| Read own profile using signed-in client | HTTP 200; correct ID/mentee role | HTTP 200; both assertions passed | Pass |
| Delete temporary auth account and inspect profile cleanup | Auth deletion succeeds; no profile remains | Both verified | Pass |
| Browser profile persistence (15 October; user-reported) | Saved change survives refresh and logout/login | The user confirmed both | Pass, user-reported |

## Boundaries and side effects

- One temporary confirmed account was created using the local admin API, then
  signed in through the ordinary client. It was deleted in a cleanup block and
  its profile removal verified.
- Normal auth/audit events may remain. No real user's profile was fetched.
- No keys, passwords, session tokens or participant identifiers were printed or
  saved in this report. No environment, model, grant or RLS changes were made.
- Existing marketing edits and the separate SkillSwap stack were left untouched.
- Direct tests prove the local authentication/profile API path. On 15 October,
  the user additionally confirmed browser profile persistence after refresh and
  logout/login. This was user-reported, not independently observed by the agent.
  Matching, requests, all role boundaries, build and hosted readiness remain
  outside this verification.

Corrective action: correct the earlier diagnosis/checklist interpretation. Do not
grant unsigned-in clients profile access merely to make a health probe return 200.

Reference: [Supabase 42501 troubleshooting](https://supabase.com/docs/guides/troubleshooting/database-api-42501-errors).

## User-performed local account smoke test · 15 October 2026

The user reported these successful checks against the local application:

- Local account signup succeeded.
- Logout succeeded.
- Login succeeded.
- Account data remained available after logging in again.

This is user-performed local manual smoke-test evidence. It is not an automated
end-to-end test or an independently repeated agent test. It did not verify
persistence after stopping and restarting Supabase, and it did not verify a
hosted Supabase environment. No personal account data is recorded here.

## Core mentorship workflow · 28 October 2026

Scope: the local production build on port 3002, local Supabase on port 54321,
and four fresh disposable accounts per successful smoke run. Application code
is based on `021e2af`; the authorization fix is `f8fb640`. The application URL
and both configured keys were checked against the running local CLI instance
without printing secrets. No service-role key uses a `NEXT_PUBLIC` variable.

### Results

| Check | Actual result | Boundary |
| --- | --- | --- |
| Unsigned-in access | `/profile` redirects to login; `/api/embed` and `/api/match` return 401 | Actual HTTP requests |
| Invalid signup role | Signup action returns `Invalid role.` before creating an account | Actual Next.js Server Action over HTTP |
| Signup and profile creation | Four accounts receive sessions and correct roles; lowercase names are formatted | Actual signup action and local auth trigger |
| Empty profile recovery | Embedding and matching return 422, then succeed after a valid profile save | Actual APIs; no artificial service outage |
| Profile save and embedding | Save action returns the formatted name; skills are deduplicated; `/api/embed` persists finite, normalized 384-value vectors | Actual profile action, frozen model inference and database reads |
| Invalid profile input | Invalid graduation year returns a validation error without changing saved fields | Actual profile action and database read |
| Mentor discovery | pgvector and keyword search return the visible fixture Mentor; shared skills are correct; hidden Mentor excluded even with an embedding | Controlled identical profile text, not a suitability or model-quality evaluation |
| Column/row permissions | Role escalation, client embedding writes, other-profile edits and hidden-Mentor requests are rejected | Real SDK calls under fixture user sessions |
| Request permissions and duplicates | Duplicate pending request returns a clear action error; non-parties cannot read requests; non-recipient response and anonymous known-ID RPC attempt are rejected | Actual request actions, SDK/RPC and database assertions |
| Acceptance and connection | Recipient acceptance creates one connection; both parties can read it and their rendered request pages show Accepted and Your connections; repeat acceptance fails | Actual response action, server-rendered HTML and database assertions |
| Decline, cancel and stale actions | Decline works; only the Mentee cancels; stale cancel/accept returns failure and preserves connection count | Actual request actions and database assertions |
| Logout and login persistence | Logout action removes API access; login action restores saved profile, matching and connection | Actual auth actions and subsequent reads; no Supabase restart |

The smoke runner reads action IDs from the matching production build and uses
the installed Next.js 16 action encoder. It invokes real server functions over
HTTP. It does not execute React event handlers, effects, client navigation or
browser-native validation. Profile-triggered automatic embedding, pending
button interaction, keyboard/mobile behavior and in-browser failure/retry
feedback still need a browser acceptance pass.

### Permission defect found and corrected

The original `respond_to_request` function was executable by `anon`. With no
authenticated subject, its `req.mentor_id <> auth.uid()` comparison evaluated
to NULL, bypassing the rejection. An expanded rollback-only SQL test reproduced
`FAIL 11a: anonymous caller accepted a known request`. The existing unrelated-
user test was also improved to supply an actual known ID instead of an empty
RLS-filtered subquery.

Migration `20261028000001_request_response_auth.sql` adds an explicit subject
check, uses a null-safe recipient comparison, and revokes PUBLIC/anonymous
execution. It was applied with `supabase migration up --local` only. The
expanded SQL suite now passes, including a missing-subject authenticated
context, and a real anonymous REST RPC call returns PostgreSQL 42501 without
changing the pending request or creating a connection. Existing migrations
were not rewritten. Hosted environments have not received this fix.

### Verification and cleanup

- `npm run smoke:local`: 12 checks passed; four temporary auth accounts removed;
  no fixture profiles, requests or connections remained after the run.
- `docker exec -i supabase_db_alumniconnect psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/rls_tests.sql`:
  `ALL RLS TESTS PASSED`, followed by `ROLLBACK`.
- `npm run check`: lint, TypeScript and the Next.js 16.3.6 production build passed.
- `node --experimental-strip-types --test lib/profile-name.test.mjs lib/profile-skills.test.mjs lib/profile-match-update.test.mjs lib/mentorship-request.test.mjs`:
  26 passed, zero failed. These remain a separate mocked/unit layer and do not
  establish live outage recovery. The existing Node module-type warning remains.
- The first version of the new smoke runner supplied the wrong keyword RPC
  argument. That test-harness error was corrected to `search_query`; its four
  fixtures were cleaned up. It was not an application defect.
- Browser control failed twice with `Sky Computer Use native pipe startup
  failed`, including after a session reset; no alternate browser connection
  was available. No browser result is claimed for this run.

Docker Desktop was started, resuming existing containers through their restart
policies. Only the AlumniConnect database received the new migration; no stack
or database was reset. Fixture signup uses public auth, and service-role access
is limited to test-only visibility setup, scoped assertions and cleanup. Normal
local auth/audit events may remain. No personal account data, credentials,
tokens, generated model files or raw fixture identifiers are committed.

Remaining gates: complete browser acceptance, test persistence across a
Supabase restart, apply migrations to any hosted target when authorized, and
verify hosted configuration and role-specific behavior separately. This work
does not establish model quality, project-specific training, concurrency/load
behavior or representative-user usability.
