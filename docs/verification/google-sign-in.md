# Google sign-in setup and verification

Issue: #37. Implementation: 4 November 2026.

## Current result

The sign-in button, provider readiness check, SSR PKCE initiation, callback code exchange, session-cookie handling and safe redirects are implemented. Local browser testing reached the server action and correctly displayed the retry/email fallback because the local Auth service is unreachable.

**A real Google sign-in has not succeeded in this environment.** The checkout currently uses `http://127.0.0.1:54321`; its Auth settings endpoint could not be reached. Neither Google client credential variable is configured locally. The Google provider remains disabled in `supabase/config.toml` until valid credentials are supplied. No Google Cloud client, hosted provider settings, deployment, production data or user account was changed.

## Configure local Google sign-in

1. In the intended [Google Auth Platform](https://console.cloud.google.com/auth/overview) project, configure the application's audience/branding and a **Web application** OAuth client. If the audience is in testing mode, add the intended test account. Request only `openid`, email and profile scopes.
2. Add this **Google authorised redirect URI** for the current local Supabase API:

   ```text
   http://127.0.0.1:54321/auth/v1/callback
   ```

   This is the Supabase callback, not the Next.js callback. If your Supabase API uses another port, use its actual callback URL. For a hosted project, obtain the callback from that project's Google-provider page; it normally uses `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Put the client ID/secret privately in the ignored `.env.local`, using the variable names shown in `.env.example`. Do not put them in chat, issues or source. Set `SITE_URL=http://127.0.0.1:3000` and use that exact app address for the whole flow.
4. Change **only** `[auth.external.google].enabled` to `true` in `supabase/config.toml` after credentials exist. Keep `skip_nonce_check=false`.
5. Start Docker, then start the local Supabase stack with those variables in its environment. Next.js loading `.env.local` does not export variables to the Supabase CLI. One way to pass them without printing them is:

   ```sh
   node --env-file=.env.local -e 'require("node:child_process").spawnSync("npx", ["supabase", "start"], { stdio: "inherit", env: process.env })'
   ```

   If the stack was already running, reload it using the CLI's documented restart workflow without resetting the database. Apply any required existing migrations separately; do not run `db reset` on member data.
6. Restart Next.js after changing `.env.local`. Visit `http://127.0.0.1:3000/login`, click **Sign in with Google** and complete Google's account/consent steps yourself.
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
- Baseline-adjusted TypeScript check reported zero diagnostics (the known profile-page typo corrected only in memory). Full build/typecheck remain blocked by the preserved pre-existing user edit at `app/(dashboard)/profile/page.tsx:12`.
- Real Google consent, callback/session success, profile creation/linking, database reads, persistence/re-login and hosted acceptance remain **pending**. No push, merge, deployment, CI success or Google account test is claimed.

## Official guidance consulted

- [Supabase Google sign-in and server PKCE callback](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase SSR cookies](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- Installed Next.js guides for Route Handlers, Server Actions, async headers, redirects and development request logging.
- Supabase changelog checked on 4 November 2026. Its CLI-v3 breaking change was noted; no CLI upgrade or hosted mutation was performed. The installed SDK's `exchangeCodeForSession(code)` signature is used; examples requiring a newer SDK overload were not copied.
