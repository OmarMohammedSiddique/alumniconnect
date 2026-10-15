# Local environment verification · 14–15 October 2026

Scope: isolated temporary account on the existing local AlumniConnect stack.
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
