# Email code sign-in (#32) and Resend setup (#34)

Implemented and deployed on 5 November 2026. Hosted SMTP/template configuration and
one owner-observed inbox delivery are verified. The expanded local acceptance below
is complete; the final hosted session check and publication of the outage correction
remain pending. Do not close #32 or #34 from automated tests alone.

## Contract

- Existing-account sign-in only: `signInWithOtp` always sets `shouldCreateUser: false`.
  New members register normally and retain the existing role/profile workflow.
- Password and Google sign-in remain available. An email code proves access to a
  mailbox, not alumni affiliation, employment or staff permissions.
- Supabase generates, expires and verifies the code with `verifyOtp(type: "email")`.
  The app stores no OTP, code hash or service-role credential for this flow.
- Request responses are generic for known/unknown accounts, SMTP failures and
  provider throttling. They do not guarantee delivery. Check provider dashboards
  for operational failures; never log codes, email bodies or full recipients.
- A ten-minute HttpOnly, SameSite=Lax cookie supports refresh and resends. It holds
  the email, time and intended destination, never authentication evidence. Even a
  forged cookie requires provider validation of the code; destinations are checked
  server-side again immediately before redirect. Cookie deletion uses its exact path.
- One active request per browser: if another tab changes its email/request, an old
  form is rejected. Codes can be entered on another device by opening the flow and
  requesting a code there. Use the latest delivered email after a resend; do not
  promise supersession semantics until tested on the selected provider version.
- Request/verification buttons share pending state. Paste/autofill use a single
  numeric input, with visible labels, status/error announcements and wrapped actions.
- The UI and server enforce a 60-second request cooldown while the recovery cookie
  remains. Clearing/editing that cookie can bypass this convenience guard. Supabase
  send, email-frequency and verification limits are authoritative, including direct
  API calls and requests across instances/devices. Server Actions use the app's
  outbound IP for provider limits; do not forward arbitrary client-supplied IPs or
  introduce a service-role key to bypass the limits. Check shared-egress throttling
  during hosted acceptance. A distributed app limiter/CAPTCHA can be evaluated if
  observed traffic warrants it, rather than claiming the browser cooldown is one.

## Owner dashboard steps

### 1. Verify a Resend sending domain

1. Sign in to Resend; start with the free plan. Check the account's current monthly
   quota and daily limit before enabling public sends. The public pricing page
   showed a 100-email daily free limit on 5 November 2026; do not enable paid
   overages for this setup. SMTP does not remove plan or Supabase limits.
2. Domains → Add domain → `auth.alumnikonneqt.com`. Keep open/click tracking off
   for authentication messages. Select an available sending region.
3. Add exactly the displayed DKIM/SPF/MX sending records in Porkbun DNS. Porkbun
   appends `.alumnikonneqt.com` to Host: remove that suffix from a displayed full
   name before pasting. For example `resend._domainkey.auth.alumnikonneqt.com`
   becomes `resend._domainkey.auth`; `send.auth.alumnikonneqt.com` becomes
   `send.auth`. Use Resend's actual names, types, values and MX priorities.
4. Preserve the root website A, `www` CNAME, existing TXT and unrelated MX records.
   Do not enable inbound email or replace root MX records for outbound delivery.
5. Click Verify in Resend and wait for verified sending status.

### 2. Connect Resend to the intended hosted Supabase project

Preferred: use the native Resend/Supabase integration linked from the official
partner page. Select the intended production Supabase project and verified sender.
Review the resulting SMTP sender/settings afterward. It creates/configures the
credential privately; no key needs to be pasted in chat or Vercel.

If the integration is unavailable, use Authentication → Email (Notifications) →
SMTP Settings → Enable custom SMTP, with:

| Setting | Value |
| --- | --- |
| Sender name | `AlumniKonneQt` |
| Sender email | `noreply@auth.alumnikonneqt.com` |
| SMTP host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | A dedicated Resend sending API key, restricted to the domain where supported |

Store that credential directly in Supabase, never a `NEXT_PUBLIC_` environment
variable. This flow does not need the Resend SDK or a Resend key in Next.js.
Custom SMTP affects all Supabase Auth emails, so existing confirmation/recovery
templates and delivery must be regression-tested separately under #15.

### 3. Configure the code template and provider protections

1. Authentication → Email → Templates → **Magic Link**. Set subject to
   `Your AlumniKonneQt sign-in code` and paste the HTML from
   `supabase/templates/magic_link.html`. The critical variable is `{{ .Token }}`;
   do not send a ConfirmationURL/TokenHash login link for this code-entry flow.
2. Authentication → Sign In / Providers → Email: set OTP length to **8**, expiry
   to **600 seconds**, and minimum resend interval to **60 seconds**. If the UI
   does not expose length, retain the supported default: the form accepts 6–10
   digits. Match the template's ten-minute expiry to the actual setting.
3. Email OTP expiry is shared with other email links (including confirmation and
   recovery). Record this ten-minute policy and verify #15's user-facing copy.
4. Keep provider request/verification limits enabled. The current documented
   defaults are 30 requests per five minutes per IP for signups/signins and
   verification, with an initial burst up to 30, plus 60 seconds between OTP
   requests for the same user. Inspect the actual project values rather than
   assuming defaults. Choose an email/hour quota within Resend's current plan;
   SMTP's shared quota includes signup, recovery and other Auth emails.
5. URL Configuration: Site URL `https://alumnikonneqt.com`; retain the exact
   `https://alumnikonneqt.com/auth/callback` redirect for Google. Numeric email
   codes are submitted by POST and require no token-bearing callback URL.

### 4. Enable and deploy after implementation review

In Vercel Production, set `SITE_URL=https://alumnikonneqt.com` and
`EMAIL_OTP_ENABLED=true`. Redeploy the reviewed implementation only after the
SMTP/template setup is ready. Until then the feature stays hidden and direct
Server Action calls return an unavailable message. No deployment is performed by
this document. Use separately configured preview/test resources for testing.

## Local environment

`supabase/config.toml` configures an eight-digit, ten-minute code template and
60-second email frequency. Local mail stays in the local Supabase mail sink;
do not wire local tests to production SMTP. Config changes require an appropriate
local Supabase restart, not a destructive `db reset`. Do not restart another
active developer's environment without coordinating it. Set `EMAIL_OTP_ENABLED=true`
in the local dev process to expose `/login/code` and the login-page link.

## Acceptance procedure (controlled disposable accounts only)

Record environment, commit, configuration and sanitized outcomes, never codes or
recipient identifiers. Separate mocked SDK evidence, local mail-sink delivery,
Resend acceptance, observed inbox arrival and hosted session behavior.

1. Verify password and existing-account Google sign-in still work.
2. Register a controlled account normally; request code and observe actual mailbox
   delivery. Verify it, inspect session cookies, refresh a protected page, save a
   permitted profile field, sign out, confirm protected access is denied, then repeat.
3. Request for an unknown address: same generic UI, no account/profile insertion.
4. Reject malformed/wrong, expired, reused and previous codes after resend; record
   actual supersession behavior. Keep errors generic, including any provider details.
5. Check resend countdown, provider email/send/verification throttling and recovery.
   Do not stress-test production or send repeatedly to real members.
6. Test delayed/failing delivery, refresh while awaiting code, change email,
   concurrent tabs and a separate browser/device. Old tabs must not accidentally
   authenticate the email displayed before another tab changed the request.
7. Test safe `next=/profile` and unsafe external/protocol-relative destinations;
   unsafe redirects must resolve to `/discover`.
8. Check keyboard, paste, autofill, screen reader error/status announcements and a
   320px viewport. Ensure code/email never enter URLs or analytics events.

### Local implementation evidence — 5 November 2026

- An isolated copy of committed `HEAD` plus only the OTP changes passed lint,
  TypeScript, all 83 baseline/OTP tests, and Webpack production builds with
  `EMAIL_OTP_ENABLED` both disabled and enabled. Placeholder public build settings
  were used; no hosted provider credentials or user data were needed.
- Five production HTTP smoke checks passed: enabled form/email validation;
  recovery-cookie refresh/malformed-code rejection; server resend cooldown;
  stale-tab/email mismatch; edit-email cookie deletion at `/login/code`.
  These checks did not contact Supabase or send email.
- Five focused tests include real Supabase SSR SDK HTTP serialization of
  `create_user: false`, `verifyOtp(type: email)` and session cookie persistence,
  using mocked provider responses. They do not prove real provider single-use,
  expiry, resend invalidation, mail delivery or hosted session behavior.
- Initial whole-worktree checks passed 99 tests (before the fifth OTP test was
  added), but lint/typecheck had unrelated in-progress privacy/admin errors.
  Those files were excluded from the isolated check and were not changed by
  this milestone. The local Supabase Auth endpoint was not reachable; no local
  service was restarted and no migrations or production configuration were applied.

The design hook's Arial-font warning was resolved with a mail-client-safe generic
sans-serif fallback. Visual/mobile/assistive-technology acceptance remains pending.

Rollback: set `EMAIL_OTP_ENABLED=false` and redeploy; password/Google remain.
Retain a private copy of original hosted SMTP/templates/settings so the owner can
restore them if delivery regresses. Revoke a Resend key only when it is no longer
used by SMTP. #34's application notifications/webhooks remain separate work.

## Sources checked 5 November 2026

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/partners/catalog/resend
- https://resend.com/docs/send-with-supabase-smtp
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/pricing

## Expanded OTP acceptance — 5 November 2026 (#32)

Based on merged `bfac917`, with a scoped correction for outages: verification now
returns an actionable service-unavailable message for provider 5xx/transport errors
and its Auth fetch has an eight-second deadline. This avoids indefinite gateway
waits while retaining the email/recovery context. Other database/Storage clients
keep their previous fetch behavior. These corrections are not claimed as deployed
until their branch is published and merged.

`npm run test:otp` runs `scripts/verify-email-otp.mjs` against the same dedicated
local stack used by registration acceptance. It refuses non-loopback or unexpected
project/API targets. Use Node 22.12+ for the pinned Playwright/axe test tooling.
The actual run used Chrome 157.0.8103.38, Playwright 1.64.1 and axe 4.14.0.

All nine real-provider/browser acceptance groups passed:

1. Unknown address: generic response, no mailbox message and no account/profile
   creation. Entry layouts at 320/375/768/1366px had no horizontal overflow and no
   WCAG 2 A/AA or WCAG 2.1 AA violations in the automated axe checks.
2. Pending submission blocked duplicates; one code arrived in Mailpit; provider
   email-frequency throttling returned 429; resend countdown was disabled. Labels,
   numeric input and one-time-code autocomplete semantics were checked.
3. Wrong/reused codes were rejected. Clipboard paste, refresh during verification,
   actual session cookies, intended `/profile` redirect, own-profile mutation through
   RLS, refresh persistence, staff-page denial, sign-out and protected-page denial
   passed. Request codes did not appear in URLs.
4. Real resend produced a fresh code; its predecessor failed; the new code permitted
   a subsequent sign-in after logout.
5. Expiry was exercised by aging only the fixture's provider token timestamps past
   the configured 600 seconds. Provider rejection and fresh-code recovery passed;
   the application challenge was still valid, so this tested provider expiry.
6. A second tab changed the email/request. The stale tab was rejected, refresh
   recovered the current request and authenticated the correct account. A separate
   browser context could verify the valid delivered code for its intended account.
7. A protocol-relative external destination fell back to `/discover` on the app's
   own origin after actual authentication.
8. Stopping only the disposable SMTP container produced the same generic request
   response and retained refresh/retry context. Stopping only its Auth container
   produced bounded, actionable unavailability; the same still-valid code worked
   once Auth recovered. Both services were restored in cleanup.
9. Real provider verification throttling produced 429 and the application's fixed
   safe message. Error accessibility checks passed; delivered codes/passwords were
   absent from the actual local production-app log.

**Rate-limit test boundary:** the installed local Auth v2.192.0 explicitly skips
IP limits when `RateLimitHeader` is unset, which is the CLI's local default. The
suite starts a temporary replica of that exact image with a dedicated test header
and uses a controlled local key to measure actual enforcement. The main test stack
is unchanged, the replica/private environment file are removed, and no bursts or
outage injection run against production. This is not a claim that the unmodified
local CLI stack enforces its displayed IP-limit values. Production's configured
provider limits were inspected separately; its limiter was not stress-tested.

All four synthetic fixture accounts were removed after each run, global fixture
sessions revoked and the isolated account baseline restored. No codes, recipient
identifiers, passwords or session tokens are included in this evidence. Automated
accessibility/ARIA/keyboard evidence does not claim a native VoiceOver listening
session or physical-device test.

### Reproduction

Start the dedicated stack using the registration acceptance guide. In the private
test environment `/private/tmp/issue36.env`, set `EMAIL_OTP_ENABLED=true`. Keep the
normal eight-digit/600-second/60-second configuration. The test quota can be raised
only on this disposable local project; the CLI's local SMTP quota is not equivalent
to the hosted Resend plan. Build with `node scripts/registration-test-stack.mjs build`
and serve with its `serve` command, then run:

```sh
node --experimental-strip-types --env-file=/private/tmp/issue36.env scripts/verify-email-otp.mjs
```

With normal installed dependencies no module-path overrides are needed. A separate
local tools install can be selected via `REGISTRATION_PLAYWRIGHT_PATH` and
`OTP_AXE_PATH`. Optional `OTP_EVIDENCE_DIR` retains screenshots of the empty entry
page only. Stop the dedicated app/stack afterward. Private failure diagnostics may
contain synthetic codes and must never be committed or pasted into issues.

### Hosted evidence and remaining closure gate

Production deployment `dpl_DiV1YNhXWa3HzQT1Vt3GHR5aYnhG` was READY on merged main
`bfac917`, with the canonical custom domain and OTP feature enabled. Supabase's
numeric-code template, eight digits, 600-second expiry, 60-second resend interval,
custom sender and exact callback configuration were read back. The owner confirmed
actual inbox delivery; the first disposable delivery account was removed afterward.

A separate controlled hosted account is prepared for the owner-performed session
check without sharing any password/code in chat: delivered-code sign-in, refresh,
sign-out and fresh-code sign-in. Only sanitized backend session/audit counts will
be retained to corroborate that result. #32 remains open until this evidence and
publication/merge of the outage correction are recorded. #15's confirmation/recovery
journey and #34's application mail/isolation/webhooks remain separate work.
