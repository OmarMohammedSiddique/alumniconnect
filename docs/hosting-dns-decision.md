# Hosting and DNS decision: Cloudflare (#35)

| Field | Value |
| --- | --- |
| Date | 4 November 2026 |
| Owner | Omar Mohammed Siddique (project owner) |
| Status | **Recommendation.** Keep Vercel hosting. Do not proxy through Cloudflare or move hosting to Workers. Cloudflare is acceptable as a **DNS-only** provider for a future custom domain. |
| Authorizes | Nothing. DNS/nameserver changes, domain purchases, migrations and deployments each need their own separate approval. |
| Related | #8 hosted release, #26 model integration, #29 performance evidence, #30 progress review, #31 final release, #34 Resend sender domain |

## 1. Current setup (inventory)

| Concern | Current state | Source |
| --- | --- | --- |
| App hosting | Next.js 16.4.5 App Router on Vercel, live at `alumniconnect-kq.vercel.app` | `README.md`, `package.json` |
| Auth and database | Supabase (Auth, Postgres with RLS, pgvector, Storage for profile photos) | `supabase/migrations/` |
| Server code | Server Actions (`app/(dashboard)/*/actions.ts`), route handlers `/api/embed`, `/api/match`, `/auth/callback`, and `proxy.ts` (Next.js 16 request proxy) | `app/`, `proxy.ts` |
| Embedding/model runtime | `@huggingface/transformers` runs inside Node server code (`lib/embedding/embed.ts`). The scratch model's serving format is still undecided (#26, `docs/ml-delivery-plan.md`) | code, ML plan |
| Owned domain | **None yet.** The owner expects to buy a domain (working name `alumnikonneqt`, TLD not yet chosen) around 5 November 2026 | owner, 4 Nov 2026 |
| DNS provider | None besides Vercel's own `*.vercel.app` subdomain. A shared `vercel.app` name can't host custom DNS records | — |
| Certificates | Issued and renewed automatically by Vercel | Vercel platform |
| Email sending | Resend is planned (#34). It requires a sender domain the project controls, so a `vercel.app` address can't be used | Resend docs |

## 2. Need and decision criteria

**The concrete need:** the only real gap is **a domain the project owns**. That gives a professional URL, and Resend needs it to verify a sender. No performance, DDoS, WAF or cost problem has been measured that Cloudflare would solve. Adding a provider isn't justified just because it appears in course examples.

Criteria, in priority order for the assessment timeline:
1. **Simplicity and delivery risk.** Nothing should put the 5 November review (#30) or the final release (#31) at risk.
2. **Compatibility** with Server Actions, sessions/cookies, Supabase Auth redirects, `proxy.ts` and the Node embedding runtime.
3. **Security.** Accurate client IPs for Vercel's firewall, no broken certificate renewal, no extra secrets.
4. **Performance.** Only claim gains that have been measured (#29).
5. **Cost.** Stay on free tiers. The domain costs roughly the registry price either way.
6. **Maintainability and handover.** As few dashboards and providers as possible (#31).

## 3. Options compared

| Option | What it is | Assessment | Verdict |
| --- | --- | --- | --- |
| **A. Keep the current setup** | Vercel hosting and DNS, with a domain bought through Vercel or any registrar and pointed at Vercel | Fewest moving parts. Vercel handles DNS, certificates and redirects in one place. Vercel Domains sells at registry price. Works for Resend: add its MX/TXT records in Vercel DNS. | ✅ **Recommended default** |
| **B. Cloudflare DNS-only + Vercel** | Domain/nameservers on Cloudflare, records set to "DNS only" (grey cloud) pointing at Vercel | Vercel's documented setup when an external DNS provider is used. Traffic goes straight to Vercel, so certificate issuance, caching and client IPs behave exactly as in A. Cloudflare Registrar is also at-cost, but it requires Cloudflare nameservers. Fine for Resend, as long as any CNAME records stay DNS-only. | ✅ **Acceptable alternative** (e.g. if the domain is bought at Cloudflare Registrar) |
| **C. Cloudflare proxy in front of Vercel** | Orange-cloud reverse proxy (CDN/WAF) in front of Vercel | Vercel advises against it. Two CDNs mean double caching and unreliable purges, plus an extra network hop. Vercel's firewall loses direct visibility unless `CF-Connecting-IP` is honoured. TLS must be "Full (strict)" or you get redirect loops / error 526. ACME (`/.well-known/acme-challenge/*`) and `/.well-known/vercel/*` must never be blocked or cached. Server Action POSTs, auth cookies and the OAuth callback would need explicit no-cache rules. None of this solves a problem we actually have. | ❌ **Rejected for now** |
| **D. Host on Cloudflare Workers** | Rebuild the app with the OpenNext Cloudflare adapter and deploy to Workers | OpenNext supports Next.js 16, App Router and Server Actions, but it means a full platform migration. Risks: Workers' 64 MiB uncompressed size limit and 1-second startup limit (current limits page) against a Next.js + Supabase + transformers server bundle, where large bundles slow startup; the Node-runtime `proxy.ts` being bundled statically; the Node/ONNX embedding runtime and the undecided scratch-model format (#26) may not fit the Workers runtime at all; and every hosted smoke test (#8) would have to be redone. Big delivery risk for no measured gain. | ❌ **Rejected for this release** |

Compatibility is **not claimed** for C or D. If either is reconsidered, see the isolated tests in §6 first.

## 4. Decision

1. **Keep Vercel** for application hosting, certificates and edge delivery.
2. **Buy one owned domain** and connect it either through **Vercel DNS (Option A)** or through **Cloudflare DNS-only (Option B)**. The choice can follow where the domain is bought. Both behave the same for the app.
3. **No Cloudflare proxying and no Workers migration** in this release.
4. The 5 November review does not depend on any infrastructure change. The live `vercel.app` URL stays the demo URL until the domain is connected and smoke-tested.

**Release impact:** none on the code. Deployment steps add "connect custom domain" and "verify Resend sender subdomain", both tracked under existing issues (#8, #34). No new implementation issue is needed, because adoption beyond DNS-only was declined.

## 5. How the DNS layout supports Resend (#34)

- Use a **dedicated sending subdomain** (e.g. `send.<domain>`) so mail authentication records can't collide with the website records on the apex/`www`.
- Add exactly the records the Resend dashboard shows: an MX record and a TXT (SPF) record on the sending subdomain, plus the DKIM record (`resend._domainkey...`). Add DMARC on `_dmarc.<domain>` once sending works.
- **Website records stay as Vercel specifies:** the apex A record and `www` CNAME. Under Option B they **must be DNS-only**. Any Resend CNAME must also be DNS-only, or verification fails.
- Don't add an apex MX record or change existing records unless inbound mail is actually needed. Record each DNS change (name, type, value, date) in #34.

## 6. Conditions that would trigger reconsideration

Reopen this decision if any of these happens:
- Measured abuse or DDoS traffic that Vercel's firewall can't handle. Then evaluate Option C on a test subdomain, with Full (strict) TLS, ACME/`.well-known` exclusions, bypass rules for Server Actions/auth, and checks that client IPs come through correctly.
- Vercel's cost or plan limits become a real constraint after release.
- An institutional requirement mandates Cloudflare.
- The scratch model's serving format (#26) needs a runtime Vercel can't provide.

Before recommending Option D, run these isolated tests on a throwaway Worker and a disposable Supabase project: an OpenNext build that reports the uncompressed bundle size and startup time; signup/login/OAuth callback and cookie sessions; every Server Action (profile, requests, admin); `/api/embed` and `/api/match` with the chosen model format; `proxy.ts` redirects; and a latency comparison against Vercel recorded under #29. Without those results, compatibility is unknown.

## 7. References (checked 4 November 2026)

- Vercel: [Can I use a proxy on top of my Vercel deployment?](https://vercel.com/kb/guide/can-i-use-a-proxy-on-top-of-my-vercel-deployment) and [Adding and configuring a custom domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- Cloudflare: [Next.js on Workers (OpenNext)](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)
- Resend: [Managing domains](https://resend.com/docs/dashboard/domains/introduction) and [Cloudflare DNS setup](https://resend.com/docs/knowledge-base/cloudflare)

Plan limits and prices change. Check them again on the day of purchase or configuration, and record what you saw.

## 8. Addendum (12 November 2026): Cloudflare Turnstile on auth forms

The owner asked to adopt Cloudflare where it gives a real, explainable security benefit. Sections 3 and 4 still apply unchanged: **no proxying and no Workers migration**, and DNS stays at Porkbun.

The one gap that Cloudflare fills without touching hosting is **bot protection on the public auth forms**. Sign-up, password sign-in, email-code sign-in, confirmation-code resend and password-reset requests were limited only by Supabase's own rate limits. Scripts could use them for credential stuffing, mass fake sign-ups, or making the app send unwanted mail (OTP/recovery spam).

**Decision:** adopt **Cloudflare Turnstile**, verified by **Supabase Auth's built-in CAPTCHA protection**.
- The browser widget (`components/turnstile-widget.tsx`) gets a single-use token. Each auth server action forwards it to Supabase as `captchaToken` (`lib/turnstile.ts`).
- Supabase checks the token with Cloudflare before it creates a user, checks a password or sends mail. The secret key lives only in the Supabase dashboard, never in this app or Vercel.
- Google OAuth sign-in isn't affected. Session refresh and the PKCE callback don't need tokens.
- The widget uses `interaction-only` appearance, so most visitors never see a challenge.

Operational steps and the verification record are in `docs/verification/turnstile.md`.
