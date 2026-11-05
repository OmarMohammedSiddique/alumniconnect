# Sign-in and discovery recovery — 5 November 2026

Scope: #8 hosted acceptance, #26 model runtime recovery, #37 Google sign-in.

## Confirmed findings

- The local checkout targets Supabase at `http://127.0.0.1:54321`; production
  targets the hosted AlumniConnect project. Accounts and mentor pools are separate.
- Google sign-in explicitly rejected `localhost:3000` when the configured local
  `SITE_URL` was `http://127.0.0.1:3000`. Both callback addresses are allow-listed
  in local Supabase. The fix preserves the initiating loopback host, restricted to
  the configured protocol/port in development. Production origin trust is unchanged.
- Read-only inspection confirmed the hosted registration hook returns the legacy
  `Register with AlumniConnect before signing in with Google.` message. The app
  recognised only the renamed product message and misclassified this rejection as
  cancellation. It now recognises both exact messages without changing signup policy.
- Both existing local browser tabs initially showed comparison rate-limit errors.
  Retrying subsequently produced both models' results. This does not establish
  the cause of the user's earlier indefinite loading.
- Comparison and Recommended fetches had no browser deadline; keyword search had
  no deadline/finally recovery. A stalled response or body could leave loading active.
  The server comparison deadline also excluded authentication and profile reads.

## Repairs and verification

Google initiation now passes through the actual Next.js server action on **both**
local origins: it writes a PKCE verifier cookie and returns an authorize URL with
the same origin's `/auth/callback`. Missing-code callback HTTP tests also retain
each origin. These checks do not complete Google consent or account linking.

Discovery now bounds Recommended and keyword requests at 15 seconds and comparison
requests at 65 seconds, including body reads. Cancellation prevents stale updates
after leaving comparison/Recommended. Comparison server handling bounds auth,
profile reads and inference together at 55 seconds and aborts network work at the
deadline; native work retains its concurrency slot until it actually settles.
Expired-session and rate-limit feedback are actionable; comparison reports the
server's retry interval. Existing ranking, model versions, permissions and data
remain unchanged.

Safari on the patched development app verified:

- `127.0.0.1:3000`: both models ranked the same five-mentor pool; MiniLM reported
  39 ms and the scratch pilot 14 ms on the observed warm run.
- `localhost:3000`: both models ranked the five-mentor pool; observed warm timings
  were 40 ms and 14 ms respectively.
- Recommended returned mentor cards, and keyword search for `Python` returned cards.

These are individual warm observations, not performance benchmarks or cold-start
measurements. Tests cover timeouts, stalled response bodies, cancellation, normal
results/errors, retry feedback and Google origin/rejection regressions. All 146
Node tests, ESLint, TypeScript and the default Turbopack production build pass
(22 pages).

## Hosted boundary

The inspected public production deployment was `dpl_DfaunnGXXC5eeLmzTZCEQBLyAhSo`
at commit `c582f2283b12e2b906c3a69383c7273be765600b`; its configured `SITE_URL` is
`https://alumnikonneqt.com`. Read-only aggregate queries found two hosted accounts
and zero mentor profiles. Local accounts/data were not copied to production.
The public browser showed Google registration rejection; `/login` returned 200.
No fresh successful hosted Google/password session or hosted inference is claimed.
No recent runtime logs were returned, and older logs exceeded provider retention.

The fixes are local commits. They require an authorised push/review/release before
they affect the public site. No provider settings, production data, migrations or
deployment were changed. Registration remains required in each environment before
using Google with the same email. Keep #8 and #26 open for hosted acceptance and
retain #37's earlier successful evidence separately from this regression/retest.
