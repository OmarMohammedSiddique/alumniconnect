# Cloudflare Turnstile on auth forms

Decision and rationale: `docs/hosting-dns-decision.md` §8.

## What is protected

| Form | Server action | Supabase call (token checked) |
| --- | --- | --- |
| `/signup` | `signUp` | `auth.signUp` |
| `/login` (password) | `signIn` | `auth.signInWithPassword` |
| `/login/code` request/resend/verify | `emailOtpAction` | `auth.signInWithOtp`, `auth.verifyOtp` |
| `/verify-email` resend/verify | `accountEmailAction("signup")` | `auth.resend`, `auth.verifyOtp` |
| `/forgot-password` request/resend/verify | `accountEmailAction("recovery")` | `auth.resetPasswordForEmail`, `auth.verifyOtp` |

Not covered by design: Google OAuth, the `/auth/callback` code exchange, session refresh in `proxy.ts`, and the post-recovery `updateUser`.

A rejected token comes back from Supabase as `captcha_failed`. The forms then show "The security check did not complete…", and the widget resets for a fresh token. A failed check happens before any account lookup, so this message doesn't reveal whether an account exists. Every other provider error keeps its existing generic, non-enumerating message.

## Configuration

| Where | Setting | Value |
| --- | --- | --- |
| Cloudflare dashboard → Turnstile | Widget | Managed mode; hostnames `alumnikonneqt.com`, `www.alumnikonneqt.com`, `localhost` |
| Vercel (Production + Preview) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Widget **site key** (public) |
| Supabase dashboard → Authentication → Attack Protection | CAPTCHA protection | Provider **Turnstile**, widget **secret key** |
| Local `.env.local` (optional) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` (Cloudflare always-pass test key) |
| Local `supabase/config.toml` (optional) | `[auth.captcha]` | Commented template with the matching test secret |

With no site key set, the widget doesn't render and no token is sent. That's fine as long as Supabase CAPTCHA is off, which is the local default.

## Release order (avoid locking everyone out)

1. Deploy this code with `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set. Confirm the widget loads on `/login` and `/signup` and that sign-in still works. Supabase ignores tokens while CAPTCHA is off.
2. Only then enable CAPTCHA protection in Supabase with the secret key.
3. Re-test on production: password sign-in, sign-up with a disposable address, email-code request, password-reset request, and Google sign-in.
4. **Rollback:** turn off CAPTCHA protection in Supabase. This takes effect at once and needs no redeploy.

## Effect on scripts

Once hosted CAPTCHA is on, scripts that call hosted Supabase Auth directly with the anon key (e.g. `scripts/hosted-demo.mjs` using `signInWithPassword`) will get `captcha_failed`. Run them before enabling CAPTCHA, or switch CAPTCHA off briefly while they run. Local scripts are unaffected while local `[auth.captcha]` stays commented out.

## Verification record

| Date | Environment | Scenario | Result |
| --- | --- | --- | --- |
| 12 Nov 2026 | Local unit tests | Token forwarding, `captcha_failed` mapping, non-enumeration preserved | Pass (`npm test`) |
| 12 Nov 2026 | Local dev (`next dev`, Cloudflare always-pass test key, local Supabase with CAPTCHA off) | Widget loads on `/login`, `/signup`, `/login/code` (request and verify/resend steps), `/forgot-password`, `/verify-email`; token reaches every Supabase-calling form; failed password sign-in shows the existing message and the widget resets; no console errors | Pass |
| — | Production | Widget with real site key, then Supabase CAPTCHA enabled, then the step 3 re-test | **Not yet run** |
