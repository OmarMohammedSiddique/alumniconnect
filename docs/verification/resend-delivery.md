# Resend configuration, delivery architecture and operational runbook (#34)

Documented and verified on 5 November 2026. This specification and runbook defines the
shared email infrastructure for AlumniKonneQt, covering Supabase-managed account emails
(#15, #32), server-originated application notifications (#33), destination isolation,
webhook verification, and operational recovery.

---

## 1. Provider Decision and Architecture

### Decision Summary
Resend was selected as the transactional email delivery provider for AlumniKonneQt:
- **Clean REST & SMTP interfaces**: Supports direct Supabase Auth custom SMTP integration without requiring client-side SDKs or third-party email routing infrastructure.
- **Dedicated sending subdomain**: Uses `auth.alumnikonneqt.com` on the project's owned domain (`alumnikonneqt.com`), preserving root domain reputation, apex web routing, and mail hygiene.
- **Clear separation of concerns**:
  1. **Account-security emails** (Email OTP sign-in, email confirmation, password recovery): Generated, timed, and verified by Supabase Auth using `smtp.resend.com:465`. The application never touches or logs authentication codes.
  2. **Application notification emails** (Mentorship requests, acceptance alerts, reminders under #33): Dispatched server-side via `lib/email-delivery.ts` using the Resend REST API (`https://api.resend.com/emails`) with server-side API keys, template sanitization, idempotency, and destination safety guards.

---

## 2. Sender Domain and DNS Configuration

The sending identity is configured under the dedicated subdomain `auth.alumnikonneqt.com` to isolate transactional email reputation from future apex website operations.

### DNS Records in Porkbun (Authorized Registrar)
Porkbun appends the root domain (`.alumnikonneqt.com`) automatically to record hostnames.

| Record Type | Host | Target / Value | Priority | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **TXT** | `resend._domainkey.auth` | `p=...` (Resend public DKIM key) | — | DKIM cryptographic signature |
| **TXT** | `send.auth` | `v=spf1 include:resend.com ~all` | — | SPF authorization for Resend |
| **MX** | `send.auth` | `feedback-smtp.us-east-1.resend.com` | 10 | Return-path bounce/feedback routing |

### Preserved Root & Web Records
The existing DNS setup preserves:
- Apex A records pointing to Vercel (`76.76.21.21`).
- `www` CNAME record pointing to `cname.vercel-dns.com`.
- Root MX and unrelated verification TXT records.
- Inbound mail is not configured on the root domain; all sending is outbound through `auth.alumnikonneqt.com`.

---

## 3. Plan Quotas, Rate Limits, and Costs

- **Tier**: Resend Free tier.
- **Monthly Quota**: 3,000 emails/month.
- **Daily Quota**: 100 emails/day.
- **API Rate Limit**: 2 requests per second burst.
- **Financial Cost**: \$0.00 / month. Paid overages are explicitly disabled to prevent uncontrolled expenditure.
- **Capacity Planning**: The 100 email/day limit is shared between Supabase Auth (OTP and confirmation) and application notifications. The application enforces a 60-second client-side request cooldown and respects Supabase Auth's 30-req/5-min per-IP rate limiting.

---

## 4. Credential Security and Least Privilege

1. **Supabase Auth SMTP Credentials**:
   - Host: `smtp.resend.com` (Port 465, TLS).
   - User: `resend`.
   - Secret: Dedicated sending key generated in Resend, restricted to domain `auth.alumnikonneqt.com`.
   - Storage: Stored exclusively inside Supabase Auth dashboard (`Authentication` → `Email` → `SMTP Settings`). No SMTP key is stored in Vercel or Next.js code.
2. **Application API Key (`RESEND_API_KEY`)**:
   - Scope: Restricted to Sending Access for `auth.alumnikonneqt.com`.
   - Storage: Server-side environment variable in Vercel Production (`RESEND_API_KEY`).
   - Strictly forbidden from being prefixed with `NEXT_PUBLIC_` or bundled in client builds.
3. **Webhook Signing Secret (`RESEND_WEBHOOK_SECRET`)**:
   - Used to verify inbound delivery events at `/api/webhooks/resend`.
   - Svix format secret (`whsec_...`), stored as a server-side environment variable.

### Credential Rotation Runbook
If an API key is compromised or scheduled for periodic rotation:
1. Sign in to Resend Dashboard → **API Keys** → **Create API Key** (name: `alumnikonneqt-prod-[date]`, restricted to `auth.alumnikonneqt.com`).
2. Update the environment variable `RESEND_API_KEY` in Vercel.
3. If rotating SMTP credentials, update the SMTP password in Supabase Auth Settings.
4. Run an isolated test send using a controlled test address to confirm delivery.
5. In Resend Dashboard, delete or revoke the previous key.

---

## 5. Environment Isolation and Destination Controls

To ensure automated tests, pull request previews, and local development environments never send unintentional emails to real members:

1. **Automated Unit Tests (`NODE_ENV === "test"`)**:
   - Default delivery mode is `"mock"`.
   - Outbound emails are stored in an in-memory test sink (`getMockSentEmails()`) without making external network calls.
2. **Local Development and Preview Deployments**:
   - If `RESEND_API_KEY` is unset or `EMAIL_DELIVERY_MODE === "mock"`, emails are routed to the mock sink.
   - If `EMAIL_ALLOWED_DOMAINS` is set (e.g. `example.test,auth.alumnikonneqt.com`), any attempt to email addresses outside the allowlist is blocked with code `DESTINATION_BLOCKED`.
3. **Production**:
   - `EMAIL_DELIVERY_MODE` is `"live"`.
   - Recipient addresses are normalized and checked for basic address format before submission.
   - When set, `EMAIL_ALLOWED_RECIPIENTS` restricts delivery to those exact normalized addresses in every environment, including production. It overrides domain permissions. An empty or invalid explicit list denies all destinations.
   - Without an exact recipient restriction, an explicitly configured `EMAIL_ALLOWED_DOMAINS` restricts domains in every environment. An empty list denies all destinations. With neither setting configured, normal production delivery permits valid addresses, while local and preview delivery retains the default test-domain restrictions.
   - Controlled production acceptance must set the approved recipient list before enabling application delivery. Keep Resend credentials server-side. A blocked notification is recorded as failed, so do not use production mock/suppress modes or unrelated member activity to test the worker.

---

## 6. Server-Side Application Delivery Boundary (`lib/email-delivery.ts`)

Developed to support application notifications under #33 with the following guarantees:
- **Template Safety**: `escapeHtml` sanitizes all dynamic user inputs (names, subjects, message snippets) to prevent HTML injection and markup manipulation.
- **Idempotency**: Supports `idempotencyKey` passed in the `Idempotency-Key` HTTP header to Resend, preventing duplicate sends on network retries.
- **Bounded Latency**: Outbound HTTP requests use `AbortSignal.timeout(8000)` (8 seconds) to prevent server action worker hanging.
- **Retry Logic**: Bounded to 1 retry on 5xx provider errors or network timeouts with brief backoff. 429 rate limit errors return structured `RATE_LIMITED` without hammering the provider.

---

## 7. Webhook Signature Verification and Suppression (`lib/email-webhook.ts`)

Inbound delivery feedback is received at `/api/webhooks/resend`.

### Security Verification
- Resend webhooks use Svix headers: `svix-id`, `svix-timestamp`, `svix-signature`.
- **Replay Protection**: Rejects payloads where `svix-timestamp` differs from the current time by more than 300 seconds (5 minutes).
- **HMAC Verification**: Reconstructs `${id}.${timestamp}.${body}` and calculates HMAC-SHA256 using the secret key (handling base64 `whsec_` secrets).
- **Constant-Time Comparison**: Uses `crypto.timingSafeEqual` to avoid timing side-channel attacks.

### Event Processing and Delivery Observability
- **Deduplication**: Webhook event IDs are tracked in a bounded memory cache to ignore duplicate deliveries.
- **Delivery Confirmation**: An initial API response from Resend only proves acceptance; delivery is only confirmed when `email.delivered` arrives.
- **Suppression on Bounces & Complaints**:
  - `email.bounced`: Hard bounces add the recipient to the suppression set.
  - `email.complained`: Spam complaints immediately suppress the address from further application notifications.

---

## 8. Outage Handling and Failure Recovery Runbook

| Failure Mode | Symptoms | Immediate Response | Recovery Action |
| :--- | :--- | :--- | :--- |
| **Resend Outage (5xx / Timeout)** | `sendApplicationEmail` returns `PROVIDER_ERROR` or `TIMEOUT`. | Client UI displays retryable, non-technical failure message. | Check [status.resend.com](https://status.resend.com). Request is bounded to 8s; retry once. |
| **Rate Limit Exceeded (429)** | Provider returns HTTP 429; code `RATE_LIMITED`. | App pauses retries and logs rate-limit event. | Inspect daily usage against the 100/day free limit. If exceeded, queues application emails until next quota window. |
| **SMTP Delivery Failure in Auth** | Supabase Auth OTP or confirmation email fails. | Generic message shown to user ("If registered, a code will arrive..."). | Inspect Supabase Auth logs and Resend domain status. Verify SMTP credentials. |
| **Webhook Delivery Delay** | Webhook events lag behind API calls. | No user-facing interruption; delivery status remains pending. | Resend automatically retries webhooks with exponential backoff over 24 hours. |

---

## 9. Verification Evidence

### Local Test Coverage
- `lib/email-delivery.test.mjs`:
  - HTML escaping (`&`, `<`, `>`, `"`, `'`).
  - Email normalization and validation.
  - Destination controls across production, staging, and mock modes.
  - Accessible layout rendering with plain-text fallback generation.
  - Mock delivery sink capture and verification.
  - Live Resend API call formatting with `Authorization` and `Idempotency-Key`.
  - Rate limiting (429) and timeout handling with bounded abort signals.
- `lib/email-webhook.test.mjs`:
  - Valid Svix HMAC-SHA256 signature verification with `whsec_` secrets.
  - Replay protection rejecting timestamps older than 300s.
  - Missing header detection (id, timestamp, signature).
  - Signature mismatch rejection.
  - Event deduplication for repeated `svix-id` events.
  - Bounce and complaint suppression tracking.

All **119 unit tests** pass locally via `npm test`. Linting (`npm run lint`) and TypeScript verification (`npm run typecheck`) pass with zero errors.

## 10. Mentorship activity emails (#33, 5 November 2026)

The notification migration adds a durable, address-free `email_outbox`. Database triggers enqueue only committed changes; existing requests are not backfilled. Request acceptance creates the connection and both notification events atomically. Failed transactions cannot leave notification events.

| Event | Recipient | Trigger / deduplication | Category |
| --- | --- | --- | --- |
| New request | Mentor | Request insertion, once per request ID | Requests |
| Successful connection | Both participants, separately | Pending → accepted, once per request ID and recipient | Connections |
| Declined request | Mentee | Pending → declined, once per request ID | Requests |
| Recommendations ready | Mentee | Changed persisted embedding with a visible, available, unblocked Mentor candidate; once per UTC day | Matches |

Recommendations are suggestions, not accepted connections, endorsements or guaranteed relevance. These emails are triggered by a changed mentee embedding; the implementation does not run a periodic search for newly joined Mentors. Reminders and mentions are deferred; there is no scheduler for pending reminders or unsupported mention feature.

### User controls and content

`/profile/email-preferences` provides authenticated per-category opt-outs. Every template links there with “Manage email preferences or unsubscribe”; members uncheck categories and save. This intentionally requires sign-in, avoiding bearer unsubscribe tokens or unauthenticated preference changes. Optional activity defaults to enabled; Supabase account/security mail is independent. Read failures disable the settings form instead of overwriting preferences with defaults. There is no existing-user email backfill or bulk campaign.

Templates contain generic event copy, HTTPS canonical application links (HTTP loopback permitted locally), and explicit text links. They omit names, profile details, introductions and private contact addresses. Links require normal authentication/RLS. Worker delivery rechecks visibility, blocking, request/connection state, category preferences, confirmed email, banned status and persistent suppression. Changes after a send starts cannot retract an email already accepted by Resend.

### Delivery and recovery

Successful request/response actions and embedding updates call Next.js `after` for prompt processing without delaying the core response. The queue survives crashes and email outages. Configure an external scheduler to POST `/api/notifications/process` every five minutes with `Authorization: Bearer <NOTIFICATION_WORKER_SECRET>`; the endpoint rejects missing/incorrect secrets. The production recovery scheduler is `.github/workflows/notification-emails.yml`; configure the same random `NOTIFICATION_WORKER_SECRET` as a GitHub Actions secret and a sensitive Vercel production variable. It posts every five minutes (GitHub may delay scheduled runs) and supports manual dispatch. Each run claims at most five rows with `FOR UPDATE SKIP LOCKED`, uses a five-minute lease and a four-second send timeout, and makes one provider attempt per claimed event. Retries back off exponentially, with at most five claims and a 20-hour lifetime. Expired/exhausted rows become `failed` for operator inspection. Do not reset terminal events or replay old events automatically.

Resend receives stable `notification/<event UUID>` idempotency keys. The 20-hour lifetime stays within its documented 24-hour key retention, including crash recovery. A successful API result records `sent` (provider acceptance), **not observed inbox delivery**. A crash between provider acceptance and ledger persistence reuses the same key. Mock/suppressed sends are recorded as `skipped`, not as successful provider deliveries. Missing live credentials fail before claiming events, leaving the backlog intact. Outcomes record fixed error codes without provider error bodies or recipient addresses.

Bounce/complaint webhooks persist normalized SHA-256 address hashes in `email_suppressions` before acknowledgement; failed persistence returns 503 so the provider can retry. Suppression is monotonic across retries, event ordering and application instances. Other webhook processing retains its existing in-memory event cache; this change does not add a durable delivered/opened/clicked event history.

Vercel previews keep destination allowlists even when `NODE_ENV=production`. For local tests use explicit `EMAIL_DELIVERY_MODE=mock` or `suppress`; for controlled provider acceptance tests use explicit permitted recipients. Avoid mock/suppress processing of production events: it consumes them as skipped. The service-role client remains server-only; queue, eligibility RPCs and suppression hashes are inaccessible to ordinary members. Private trigger functions need definer privileges to write the otherwise inaccessible ledger; worker RPCs use invoker privileges and are service-role-only.

### Deployment checklist and evidence boundaries

Apply `20261105074456_mentorship_email_notifications.sql` through the separately authorized deployment workflow, configure the server-only Resend key, sender, canonical `SITE_URL`, webhook secret and random `NOTIFICATION_WORKER_SECRET`, deploy application code, then configure the authenticated scheduler. Coordinate the schema and app release; missing tables/RPCs leave notification processing unavailable until migration. Inspect the queue with trusted operator tooling and verify controlled request, acceptance, decline and match delivery, opt-outs, outage recovery and destination links before marking #33/#34 complete.

Local verification: nine notification template/worker tests plus a rolled-back database suite exercise request transaction rollback, recipients, two-party acceptance, daily match cap, claim leases, opt-outs, cross-user settings denial, queue/RPC privileges, blocked users and hidden profiles. These tests do not send mail to real members or certify deployment/inbox delivery. The database suite is included in CI; a local pass does not mean CI has run.

## 11. Completion audit and controlled release, 6 November 2026

Production inspection at merge commit `e335ac6` found the application routes deployed but the notification migration absent. `email_outbox`, `email_preferences` and `email_suppressions` are not present. Hosted privacy, availability and hardening prerequisites are already recorded. Vercel has the worker secret, but no production `RESEND_API_KEY` or `RESEND_WEBHOOK_SECRET`. The scheduled worker consequently returns HTTP 503 before claiming events; this is not a successful delivery setup.

The existing migration `20261105074456_mentorship_email_notifications.sql` was reviewed and rehearsed with `supabase/tests/email_notifications.sql` inside one local rolled-back transaction. The suite passed, and a separate query confirmed the outbox, preferences and disposable accounts were absent afterward. No hosted schema or user data was changed by this rehearsal.

The delivery boundary now respects explicit recipient/domain restrictions in production as well as previews. Exact recipient restrictions take precedence over domains. Regression tests verify blocked recipients make zero provider requests, blank/malformed restrictions deny delivery, approved recipients can send, and unrestricted normal production behavior remains available when neither restriction is configured. All 164 application tests, ESLint and TypeScript checks passed.

Before hosted acceptance:

1. Confirm the controlled recipient and obtain authorization for the specific notification migration and release.
2. Configure a dedicated Resend sending key for the verified domain as the sensitive, production-only Vercel variable `RESEND_API_KEY`. Do not copy secrets into chat, source files, issues or logs. Supabase SMTP remains separate and its credential must not be repurposed for this test.
3. In Resend, configure the webhook endpoint `https://alumnikonneqt.com/api/webhooks/resend`, including bounce, complaint and delivery events. Store its signing secret as sensitive, production-only `RESEND_WEBHOOK_SECRET` in Vercel.
4. Deploy the recipient-restriction correction with an explicit `EMAIL_ALLOWED_RECIPIENTS` value containing only the approved inbox. Apply only the reviewed notification migration through the approved migration workflow. It creates no historical mail backlog.
5. Use controlled fixtures to verify request and response events, worker recovery, duplicate processing, destination links, preferences, signed webhooks and actual inbox arrival. Verify account confirmation, recovery and OTP through Supabase Auth separately. Provider acceptance alone does not establish inbox arrival.
6. Keep normal member delivery restricted until separately authorized. Do not consume production events using mock/suppress mode. A rejected destination is recorded as failed, so keep the controlled test limited to its fixtures and inspect affected queue outcomes before broad enablement.

The owner must provide Resend access or configure the two provider secrets securely before live tests can proceed. No live email was sent during this audit. The issue remains open until hosted acceptance evidence is recorded.

## 12. Verified controlled production delivery, 6 November 2026

This completed acceptance supersedes the missing-configuration status in section 11.

- PR #79 merged at `33971888bae0578adcfff8ec7632c85abea339bc`. All quality, database, ML, CodeQL and Vercel preview checks passed. Production deployment `dpl_DNvXUYk5b82LoVrA4U2zeskBSTYA` reached READY on `alumnikonneqt.com` with the approved source and configured production secrets.
- `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `NOTIFICATION_WORKER_SECRET` and the controlled recipient restriction are server-side sensitive production variables. No SMTP credential was retrieved or repurposed. The dedicated sending key and matching webhook secret were verified by actual sends and a provider-signed delivery callback.
- The reviewed notification migration is recorded in hosted history as `20261106081332_mentorship_email_notifications_20261105`, corresponding by content to repository migration `20261105074456_mentorship_email_notifications.sql`. All email tables have RLS; the outbox, suppression records and worker RPCs deny ordinary member access. The migration created no historical mail backlog.
- Two marked fictional fixtures used aliases routed to the owner's explicitly approved connected Gmail inbox. Gmail receipts confirmed six expected messages in INBOX: confirmation, recovery, OTP, one request notification to the Mentor, and two connection notifications, one to each participant. Recipient checks matched the expected fixture roles. No account identifiers, addresses, codes or credentials are retained in this document.
- The request and acceptance were performed as their respective authenticated fixtures. The accepted connection persisted. All three application events recorded `sent`, a provider message ID, one attempt and no error before cleanup. Here `sent` records provider API acceptance; separate Gmail receipts establish observed inbox arrival.
- Worker runs processed one request, two connection events and then zero events on a repeat run. The inbox still contained exactly the expected six messages, demonstrating no duplicate application sends. Runs: [request](https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42189188327), [connection](https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42189352544), [repeat](https://github.com/OmarMohammedSiddique/alumniconnect/actions/runs/42189745889). An earlier empty worker run also passed, independently establishing recovery from the prior configuration-related HTTP 503.
- Resend's webhook dashboard showed successful `email.delivered` events. An inspected connection event returned HTTP 200, `received: true`, the expected event type and one delivery attempt. An unsigned request was rejected with HTTP 400 for missing signature headers. Signature, duplicate-event, suppression, outage and retry behavior also retain automated test coverage; no live bounce/complaint or manual signed replay is claimed by this run.
- Both email destinations (`/requests` and `/profile/email-preferences`) redirected an unauthenticated HTTP request to sign-in with the correct internal continuation.

Account-mail evidence here establishes hosted provider acceptance and observed inbox delivery. The mail connector withholds one-time codes, so this run does not claim interactive confirmation, password-reset completion or OTP-session verification. After observing confirmation delivery, only the marked fictional Mentee was administratively preconfirmed to enable the separate notification workflow. The real member account, password and profile were unchanged.

Cleanup verified zero marked test accounts, zero remaining test outbox events and unchanged empty suppression storage. Only exact fixtures matching the private marker, email and expected fictional profile name were removed. Temporary aliases were removed from the configured recipient list; the approved base inbox restriction remains. Broader member delivery remains a separate authorization/release decision under #33. Its deferred reminders and unsupported mentions are not completed by this provider-delivery milestone.

## 13. Consent-based reminder release candidate, 6 November 2026

Local commits `4599709` and `66db7d7` extend #33. This section supersedes the reminder deferral in section 10 for source implementation only. The new reminder migration and application changes are not pushed, merged or deployed. Section 12 remains the observed controlled production evidence for the earlier request/connection release.

### Retained event and consent matrix

All five categories below are optional activity mail with normal urgency. They contain generic copy and protected canonical application links, without names, introductions, private profile fields or contact details. Supabase confirmation, sign-in and recovery mail is separate required account mail and is unaffected by activity preferences.

| Event | Actor and recipient | Persisted trigger | Durable key | Preference |
| --- | --- | --- | --- | --- |
| Request received | Mentee requests a Mentor; Mentor receives mail | New pending request commits | `request:<request UUID>` | Requests, default on |
| Connection accepted | Mentor accepts; both participants receive separate mail | Pending request becomes accepted and a connection exists | `accepted:<request UUID>:<recipient UUID>` | Connections, default on |
| Request declined | Mentor declines; requesting Mentee receives mail | Pending request becomes declined | `declined:<request UUID>` | Requests, default on |
| Recommendations ready | Mentee changes their saved match profile; Mentee receives mail | Changed persisted embedding with an eligible Mentor candidate | `matches:<recipient UUID>:<UTC date>` | Matches, default on |
| Pending-request reminder | Scheduler reviews a Mentee's pending request; receiving Mentor gets one reminder | Request is at least 3 days old and less than 7 days old, created after current consent | `reminder:<request UUID>` | Reminders, default off |

Mention emails are explicitly deferred: there is no approved, implemented posts/comments/mentions feature or supported mention event. This release introduces none. A future mention feature needs its own authorization and content/access checks. Recommendations are suggestions, not connections; there is no periodic new-Mentor digest.

### Member instructions

Open Profile, then Email preferences. Select the activity categories you want and save. Mentors can separately opt in to pending-request reminders. The reminder setting applies to new requests received while enabled, with at most one reminder per request and one per Mentor per rolling seven days. Requests older than seven days receive no reminder. Uncheck reminders and save to invalidate queued reminders. Re-enabling starts a new consent period and cannot revive earlier requests or queued reminders.

Every activity email links to these settings. Uncheck individual categories, or choose **Unsubscribe from all activity email**. Sign-in is required for both actions. The server derives identity from the authenticated session; submitted user IDs cannot change another person's preferences. Failed reads disable both controls and failed writes display an error. Account/security messages remain independent. An email already accepted by the provider cannot be retracted.

### Scheduling, cancellation and delivery

The existing bearer-protected five-minute recovery endpoint now calls `enqueue_request_reminders()` before claiming due mail. Ordinary post-response dispatch drains the outbox without scanning pending requests. The service-only scheduler takes a transaction advisory lock, selects at most one due request per Mentor and queues at most 100 reminder events per call. It considers existing pending/processing events, enqueue timestamps and recent provider-acceptance timestamps when applying the weekly cap. A failed or skipped reminder still occupies its enqueue slot for a week. Rows retain their permanent per-request unique key, so an outage cannot generate a fresh event UUID to bypass deduplication. Existing worker batch size, retry budget, leases, backoff and 20-hour lifetime remain unchanged.

Generation and delivery use the same reminder predicate: current explicit consent, request age and creation after consent, pending state, Mentor/Mentee roles, effective profile visibility, Mentor availability and blocking in both directions. Accepted, declined, cancelled, deleted or stale requests cannot send pending reminders. Staff hiding contributes to effective visibility. Delivery also checks confirmed recipient email, current Auth ban status and persistent hashed bounce/complaint suppression through the existing worker. No new raw recipient data is stored in the outbox. `sent_at` means provider acceptance, not verified inbox arrival.

### Reproducible local verification

- `supabase/tests/request_reminders.sql` covers missing/default-off consent, database-owned consent timestamps, attempted identity reassignment, service-only scheduling, historical/early/stale requests, weekly caps across two pending requests, repeat scheduling, unavailable/hidden Mentors, blocking, queued unsubscribe/reconsent, all terminal request states, delayed delivery, hidden senders and failed/recent-send caps. CI now includes this suite.
- The original notification migration, new migration and both notification SQL suites passed inside one rolled-back local transaction. The local database already had privacy/availability/hardening prerequisites despite older history entries. A follow-up query confirmed no email tables or reminder fixtures remained. No hosted migration or production data changed.
- All 172 application tests, ESLint, TypeScript and a Webpack production build passed. Notification worker tests include reminder suppression, unconfirmed/banned recipients, retry recovery, stable provider keys and scheduler failure before claiming mail.
- `node scripts/verify-notification-preferences.mjs` builds and runs the real production UI against a simulated loopback Auth/Data API. It passed default-off consent, save/reload, forged identity ignored, unsubscribe-all, failed writes, disabled controls after read failure, unauthenticated continuation, worker HTTP 401, zero page errors, zero scoped axe violations and no overflow at widths 320, 375 and 1366. It uses ports 3133/3134 and Chrome. It writes sanitized logs/screenshots under `/tmp` and sends no live mail. Its fixture build replaces `.next`; run `npm run build` afterward before starting the app normally. Browser simulation does not verify hosted Auth/RLS, which needs separate acceptance.

### Concrete release and acceptance steps

1. Obtain explicit approval to push this branch, open and merge its reviewed PR after required CI, apply only `20261106150414_consent_based_request_reminders.sql`, deploy, run controlled hosted fixture acceptance and eventually enable eligible member delivery. Existing production recipient restrictions remain until that approval and the controlled tests pass.
2. Read back hosted schema/history and verify the original notification migration is present. Apply the additive reminder migration first, using the approved hosted migration workflow. Read back default-off preferences, RLS and service-only RPC/schema grants. It creates no reminder or member backfill. Keep all existing provider and worker secrets server-side.
3. Publish the application only after schema verification and required CI. Confirm the scheduler returns HTTP 200, unauthorized calls return HTTP 401 and an empty repeat run creates no duplicate event. The existing Resend provider infrastructure is verified under #34; recheck configuration names and endpoint health without exposing secret values.
4. Keep destinations restricted to the previously approved owner-controlled inbox. Use clearly marked disposable Mentor/Mentee fixtures, authenticated request/response/preference workflows and exact fixture cleanup. Verify decline and recommendation-ready mail as well as the new reminder. Record provider acceptance and observed inbox receipt separately. For an accelerated reminder test, any consent/request age simulation must be confined to the exact disposable fixture rows and explicitly recorded; never alter real-member timestamps or the production clock. A natural cadence test can instead wait for the genuine three-day interval.
5. Verify hosted unsubscribe-all, reminder opt-in/withdrawal, terminal/stale requests, blocked/hidden participants, duplicate/scheduler retry behavior and protected destination links. Do not generate complaints or bounces against real members merely for testing. Existing automated signed-webhook and outage coverage remains distinct from live provider evidence.
6. Inspect existing queue outcomes before broader enablement. Do not reset terminal rows or replay old messages automatically. Once approved and controlled acceptance passes, remove only the production destination restriction that prevents normal eligible-member sending, preserve preview/local destination isolation and current member preferences, and monitor quotas, failures, suppressions and scheduler health. Reminder consent remains default off for every existing member.
7. Record the exact merge/deployment, migration read-back, scheduler runs, controlled receipts and fixture cleanup. Update #33 acceptance checkboxes only for verified criteria; keep it open until all applicable hosted criteria pass. Link final evidence to #6 and #31 without claiming participant-study completion.

Rollback before broader enablement: stop the recovery scheduler and restore the reviewed prior application deployment while preserving the ledger and preferences. The additive schema can remain. Investigate terminal events without automatically replaying them. Do not use mock/suppress processing to consume a production backlog as a recovery strategy.
