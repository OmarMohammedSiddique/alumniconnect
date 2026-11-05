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
   - All recipient addresses are validated using strict RFC 5322 normalization before submission.

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

Successful request/response actions and embedding updates call Next.js `after` for prompt processing without delaying the core response. The queue survives crashes and email outages. Configure an external scheduler to POST `/api/notifications/process` every five minutes with `Authorization: Bearer <NOTIFICATION_WORKER_SECRET>`; the endpoint rejects missing/incorrect secrets. Scheduler setup is an operator/deployment step and has not been performed by this local implementation. Each run claims at most five rows with `FOR UPDATE SKIP LOCKED`, uses a five-minute lease and a four-second send timeout, and makes one provider attempt per claimed event. Retries back off exponentially, with at most five claims and a 20-hour lifetime. Expired/exhausted rows become `failed` for operator inspection. Do not reset terminal events or replay old events automatically.

Resend receives stable `notification/<event UUID>` idempotency keys. The 20-hour lifetime stays within its documented 24-hour key retention, including crash recovery. A successful API result records `sent` (provider acceptance), **not observed inbox delivery**. A crash between provider acceptance and ledger persistence reuses the same key. Mock/suppressed sends are recorded as `skipped`, not as successful provider deliveries. Missing live credentials fail before claiming events, leaving the backlog intact. Outcomes record fixed error codes without provider error bodies or recipient addresses.

Bounce/complaint webhooks persist normalized SHA-256 address hashes in `email_suppressions` before acknowledgement; failed persistence returns 503 so the provider can retry. Suppression is monotonic across retries, event ordering and application instances. Other webhook processing retains its existing in-memory event cache; this change does not add a durable delivered/opened/clicked event history.

Vercel previews keep destination allowlists even when `NODE_ENV=production`. For local tests use explicit `EMAIL_DELIVERY_MODE=mock` or `suppress`; for controlled provider acceptance tests use explicit permitted recipients. Avoid mock/suppress processing of production events: it consumes them as skipped. The service-role client remains server-only; queue, eligibility RPCs and suppression hashes are inaccessible to ordinary members. Private trigger functions need definer privileges to write the otherwise inaccessible ledger; worker RPCs use invoker privileges and are service-role-only.

### Deployment checklist and evidence boundaries

Apply `20261105074456_mentorship_email_notifications.sql` through the separately authorized deployment workflow, configure the server-only Resend key, sender, canonical `SITE_URL`, webhook secret and random `NOTIFICATION_WORKER_SECRET`, deploy application code, then configure the authenticated scheduler. Coordinate the schema and app release; missing tables/RPCs leave notification processing unavailable until migration. Inspect the queue with trusted operator tooling and verify controlled request, acceptance, decline and match delivery, opt-outs, outage recovery and destination links before marking #33/#34 complete.

Local verification: nine notification template/worker tests plus a rolled-back database suite exercise request transaction rollback, recipients, two-party acceptance, daily match cap, claim leases, opt-outs, cross-user settings denial, queue/RPC privileges, blocked users and hidden profiles. These tests do not send mail to real members or certify deployment/inbox delivery. The database suite is included in CI; a local pass does not mean CI has run.
