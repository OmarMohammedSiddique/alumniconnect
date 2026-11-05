# Account confirmation and password recovery — issues #15 and #36

## Supported journey

Supabase Auth generates and verifies eight-digit numeric codes. Confirmation and
recovery templates use `{{ .Token }}`. No custom token store or token-bearing link
is needed. Mailbox ownership does not verify alumni or employment affiliation.
Resend remains the SMTP delivery service; there is no Resend API key in the app.

`ACCOUNT_EMAIL_ENABLED` defaults to `false`. Enable it only after the hosted
**Confirm signup** and **Reset password** templates match the versioned
`supabase/templates/confirmation.html` and `recovery.html`. The existing
`EMAIL_OTP_ENABLED` flag and **Magic Link** template remain separate under #32.

With confirmation required, registration shows the submitted address and a code
continuation, rather than redirecting an unauthenticated member to a private page.
Correction keeps non-sensitive names/email/role and clears passwords. A selected
photo must be chosen again after confirmation. With confirmation disabled, the
existing immediate-session/profile-photo path remains supported.

`/verify-email` supports confirmation/resend. `/forgot-password`, linked from
sign-in, accepts a registered email and then the latest reset code plus a new
password and exact confirmation. Requests return identical wording for known,
unknown, already-confirmed and delivery-failure outcomes. No request creates an
account. Provider quotas remain authoritative; the cookie/UI adds a 60-second
convenience cooldown and disables pending/resend buttons. Clearing cookies cannot
bypass the provider quota.

Recovery validates the password on the server **before consuming the code**.
It verifies a fresh provider `recovery` code in the same Server Action that calls
`updateUser`. A normal session, forged context cookie or client recovery flag is
insufficient. Successful reset signs out all refresh sessions and returns to
sign-in. Previously issued JWT access tokens can remain valid until their normal
expiry; refresh-session revocation is not a claim of immediate JWT invalidation.
Errors after code consumption require a fresh reset request, with safe feedback.

Context cookies expire in 10 minutes and bind the submitted email/request time.
They are convenience state, never ownership proof. Code failures use fixed
messages, external continuation destinations fall back to `/discover`, and
passwords/codes are not included in URLs or application logs. During an outage,
the address and request context remain available; submitted sensitive fields
clear. Errors are announced and associated with relevant fields; code inputs
support numeric keyboards, paste and `one-time-code` autofill.

## Verified local evidence — 5 November 2026

The dedicated loopback Supabase project `alumnikonneqt-issue36` was used with
production Next.js build, actual Auth/Postgres/SMTP and Mailpit capture, plus
headless Chrome. Other local projects and production were not reset or faulted.
`npm run lint`, `npm run typecheck`, all **108 unit tests**, and the production
Webpack build passed.

`node --env-file=/private/tmp/issue36.env scripts/verify-account-email.mjs`
passed all **nine** groups:

1. Missing signup confirmation is rejected by the actual Server Action without
   creating an account. This closes the locally reproduced #36 validation gap.
2. Confirmation-required registration, correction retention/password clearing,
   real numeric mail, refresh interruption, wrong/reused codes, authenticated
   continuation, and axe WCAG audits at 320/375/768/1366 pixels.
3. Actual provider confirmation expiry, resend supersession and safe continuation.
4. Forgot-password navigation, generic unknown-address/no-account behavior, real
   delivery, one pending submission, provider HTTP 429 send cooldown, accessible UI.
5. Forged context/wrong code denied; server rejects weak/mismatched passwords
   before consuming a valid code; successful reset, old-password denial, new
   password sign-in and old refresh-token revocation.
6. An ordinary authenticated session plus forged recovery cookie cannot reset.
7. Actual provider recovery expiry, supersession and successful fresh-code retry.
8. Stopped local SMTP retains generic retry context; stopped local Auth produces
   bounded unavailable feedback, retains email context and permits successful retry.
9. Delivered codes/passwords absent from server logs and destinations.

Four synthetic accounts were removed and the original isolated account baseline
restored. The existing registration/photo suite also passed with confirmation
enabled (five groups) and disabled (seven groups), including authenticated photo
persistence, storage authorization boundaries, optional-upload failure/retry and
no-photo signup. A 375-pixel recovery-page screenshot was visually
inspected. Codes, passwords and session tokens stay in memory. The expiry/resend
cases age only fixture timestamps by 601/61 seconds; they exercise real provider
verification without waiting ten minutes. Failure diagnostics are private and may
contain synthetic values: never commit or paste them into issues.

Provider verification throttling is measured in #32's dedicated replica test;
the default CLI Auth intentionally skips IP limits without a RateLimitHeader.
The normal local test stack is not claimed to enforce hosted IP quotas. Automated
axe/ARIA/focus evidence does not claim a native screen-reader listening session
or physical-device testing.

## Reproduction

Use `scripts/registration-test-stack.mjs prepare` and `confirmations-on`, then add
`EMAIL_OTP_ENABLED=true` and `ACCOUNT_EMAIL_ENABLED=true` to its private environment
file `/private/tmp/issue36.env`. Build/serve with that helper, then run the command
above. It refuses non-loopback services and cleans only accounts it created.
Run `node scripts/registration-test-stack.mjs test` for the existing photo/signup
regression suite. To test confirmations off, stop the dedicated stack, change only
its `auth.email.enable_confirmations` to false, restart and re-add the flags.
Never paste private environment/status output. Stop the disposable app/stack when
finished; no hosted fault or quota-burst tests are required.

## Hosted rollout and remaining acceptance

This is local evidence, not a publication or hosted-completion claim. Before
closing #15, publish/merge the tested source, apply/read back the two hosted
numeric templates, preserve SMTP identity/credentials and confirmation policy,
verify 600-second expiry/eight digits/60-second resend and canonical site/callback
URLs, enable the separate account-email flag and deploy. Then use a controlled
mailbox for real registration confirmation and password recovery followed by
new-password sign-in. Do not use admin preconfirmation as signup evidence.
Record delivery and session results without addresses, codes or private tokens.

#32's remaining hosted session/publication gates and #34's remaining shared mail
requirements stay separate. #36's omitted-confirmation criterion requires the fix
to reach merged/deployed code before reclosure; the previous photo evidence remains
valid. No hosted confirmation/recovery templates were changed by this local work.
