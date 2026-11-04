# Google sign-in setup and verification

Issue: #37. Implementation: 4 November 2026.

## Current result

The sign-in button, provider readiness check, SSR PKCE initiation, callback code exchange, session-cookie handling and safe redirects are implemented. Initial local browser testing reached the server action and displayed the email fallback while the local Auth service was unreachable. The readiness check distinguishes connection failures, rejected public API keys, disabled Google providers and other service failures.

**A completed Google sign-in has not yet been verified in this environment.** After the user privately saved the Google client credentials, Google was enabled in `supabase/config.toml` and the local stack was stopped/started with `.env.local` loaded, preserving database volumes. All `npm run auth:check` checks now pass, including the running Auth service's Google flag. Clicking the local Google button in Safari reaches Google's account chooser for the configured application. Account selection/consent, callback completion, authenticated session and persistence remain pending. No credentials were committed, and no hosted provider settings, deployment or production data were changed.

## Diagnose the current setup

Run `npm run auth:check` from the repository root. It reads the ignored `.env.local`, prints the two distinct callback URLs, checks local provider configuration when using a loopback Supabase URL, and queries the running Auth service using only the public API key. It does not print credentials, response bodies or OAuth codes and exits with status 1 when checks fail. A passing setup check does not prove a completed Google login or a correctly configured Google Cloud client.

At the initial check on 4 November 2026, a direct connection check outside the sandbox returned `ECONNREFUSED` for local Auth. The setup check also found both Google credential variables missing and the local provider disabled. These initial setup blockers were resolved in the local enablement follow-up above; they were not evidence of a failed Google consent/code exchange.

The live GitHub `main` login source checked on the same date does not include the Google button; the implementation is on `security/remaining-dependency-alerts` at `11af9c9`. This explains the source difference from the local checkout. A hosted release needs the implementation merged/deployed as well as the hosted provider settings below. No deployment identity or successful hosted login is claimed by that source check.

| Symptom | Next action |
| --- | --- |
| Auth cannot be reached locally | Start Docker and local Supabase, or deliberately configure the app for the intended hosted project instead. |
| Google is disabled | Configure credentials and enable Google on the exact Supabase environment the app uses. |
| Public key is rejected | Check that the API URL and public key belong to the same project. |
| Configured address differs from browser address | Open the exact `SITE_URL`; keep the same hostname and port throughout sign-in. |
| Google reports `redirect_uri_mismatch` | Match Google's redirect URI to the Supabase callback, not `/auth/callback` on the Next.js app. |
| Consent returns but exchange fails | Restart sign-in in the same browser and hostname; check the Supabase app callback allow list and cookie settings. |

## Configure local Google sign-in

1. In the intended [Google Auth Platform](https://console.cloud.google.com/auth/overview) project, configure the application's audience/branding and a **Web application** OAuth client. If the audience is in testing mode, add the intended test account. Request only `openid`, email and profile scopes.
2. Add this **Google authorised redirect URI** for the current local Supabase API:

   ```text
   http://127.0.0.1:54321/auth/v1/callback
   ```

   This is the Supabase callback, not the Next.js callback. If your Supabase API uses another port, use its actual callback URL. For a hosted project, obtain the callback from that project's Google-provider page; it normally uses `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Put the client ID/secret privately in the ignored `.env.local`, using `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` as shown in `.env.example`. Do not put them in chat, issues or source. Set `SITE_URL=http://127.0.0.1:3000` and use that exact app address for the whole flow.
4. Change **only** `[auth.external.google].enabled` to `true` in `supabase/config.toml` after credentials exist. Keep `skip_nonce_check=false`.
5. Start Docker, then start the local Supabase stack with those variables in its environment. Next.js loading `.env.local` does not export variables to the Supabase CLI. One way to pass them without printing them is:

   ```sh
   node --env-file=.env.local -e 'require("node:child_process").spawnSync("npx", ["supabase", "start"], { stdio: "inherit", env: process.env })'
   ```

   If the stack was already running, reload it using the CLI's documented restart workflow without resetting the database. Apply any required existing migrations separately; do not run `db reset` on member data.
6. Run `npm run auth:check` again and resolve any failures. Restart Next.js after changing `.env.local`. Visit `http://127.0.0.1:3000/login`, click **Sign in with Google** and complete Google's account/consent steps yourself.
7. Confirm an authenticated page loads, the correct profile/role is retained, refresh persists, sign-out removes access and subsequent sign-in works. Verify an existing email/password account and a new Google account separately.

Supabase's local redirect allow list includes the exact Next.js URLs `http://127.0.0.1:3000/auth/callback` and `http://localhost:3000/auth/callback`. The callback URL has no dynamic query string; the desired next page is stored separately in a short-lived HttpOnly cookie. Do not mix `localhost` and `127.0.0.1` within one flow because cookies are host-bound.

## Configure a hosted environment

- Configure the Google provider on the intended Supabase project's Auth provider page. The Google client secret belongs in Supabase's provider configuration, never in a `NEXT_PUBLIC_*` app variable.
- Set that project's Site URL and exact allowed Next.js callback URL to the actual app origin and `/auth/callback`. Set the app's server-side `SITE_URL` to that trusted HTTPS origin. Wildcard origins and untrusted forwarded-host headers are not used by this implementation.
- Provider setup, Google consent/audience restrictions and app deployment must refer to the same intended environment. `.env.local` in this checkout currently targets local Supabase; changing only a hosted dashboard does not activate local sign-in.
- Check hosted access logging/redaction for callback codes. This change suppresses `/auth/callback` request logging in Next development only; hosted log settings were not inspected or changed.

## Behavior and security boundaries

- `/login` offers Google separately from the password form; passwords are not required to initiate Google sign-in.
- Supabase SSR generates the PKCE verifier cookie; the server action returns its authorize URL only after validating its origin/path/provider.
- `SITE_URL` is mandatory in production. Development inference is limited to loopback hosts; an explicit trusted origin is used for deployed redirects.
- `/auth/callback` exchanges the one-time code with Supabase, requires a returned session/user and sets no-store/no-referrer response headers. Fixed cancellation/failure reasons are shown; provider descriptions and tokens are not reflected or logged by app code.
- The next-page cookie is HttpOnly, SameSite=Lax, short-lived and Secure on HTTPS. It is cleared at callback, and its destination passes the existing same-origin redirect validator. The PKCE verifier and session cookies remain managed by Supabase SSR.
- New Google users use the existing database-trigger Mentee default. Existing profile roles are not overwritten. There is no user-selected staff role or self-granted affiliation. New Mentors can use the existing email registration path.
- Identity linking stays with Supabase Auth; the application does not merge users by a submitted email address. Same-email linking behavior needs live verification under the configured provider.
- Basic identity scopes only; no Drive/Gmail/offline access is requested. The privacy explanation now includes Google sign-in.
- The button icon is Google's official [G asset](https://developers.google.com/static/identity/images/g-logo.png), used according to the [button branding guidance](https://developers.google.com/identity/branding-guidelines).

## Evidence

- Targeted ESLint and the Node unit suite pass (45 tests total, eight Google-specific tests).
- Installed Supabase SSR SDK creates a PKCE challenge and verifier cookie in a test using its real implementation.
- Installed SDK code exchange with a **mocked Auth service** persists session cookies. This is protocol-integration evidence, not a real Google or database login.
- Tests cover provider availability, fixed error messages, cancellation/missing code, invalid destinations, rejected provider URLs, production origin configuration and loopback cookie-host preservation.
- Local HTTP: login 200; missing-code/cancelled callback 303 to a same-origin login page, with no-store/no-referrer headers. Tested both localhost and 127.0.0.1 and corrected Next dev's reconstructed callback origin to preserve the browser's loopback host.
- Native Safari: Google button renders and clicking it returns actionable service-unavailable feedback while the local Auth service is down. Verification stops at this unavailable boundary.
- Follow-up setup diagnosis: full ESLint, `npm run typecheck` and all 45 Node tests passed. Four isolated CLI fixtures checked enabled/disabled hosted providers, rejected keys and connection failures, including failure exit codes and credential redaction. These fixtures mock HTTP; the direct local Auth request returned `ECONNREFUSED`.
- The earlier profile-page typo was resolved before this follow-up; it no longer blocks type checking. The original implementation was subsequently pushed as recorded in issue #37. This follow-up does not claim a new push, merge, deployment or CI result.
- Real Google consent, callback/session success, profile creation/linking, database reads, persistence/re-login and hosted acceptance remain **pending**.
- Local enablement follow-up: Docker reports a running server; the Supabase CLI's default `stop` and credential-loaded `start` both exited 0 without deleting database volumes. All setup checks pass. Safari's real Google account chooser appears after clicking the local sign-in button; this verifies initiation/provider routing, not a completed account sign-in. The account chooser displays the Google app branding `AlumniKonneQt`.

## Official guidance consulted

- [Supabase Google sign-in and server PKCE callback](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase SSR cookies](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- Installed Next.js guides for Route Handlers, Server Actions, async headers, redirects and development request logging.
- Supabase changelog checked on 4 November 2026. Its CLI-v3 breaking change was noted; no CLI upgrade or hosted mutation was performed. The installed SDK's `exchangeCodeForSession(code)` signature is used; examples requiring a newer SDK overload were not copied.
