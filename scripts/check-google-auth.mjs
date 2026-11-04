// Read-only setup check. Never print credentials, Auth bodies or OAuth URLs.
import { readFileSync } from "node:fs";

let failures = 0;
function check(ok, label, remedy) {
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
  if (!ok) { failures++; console.log(`  ${remedy}`); }
}

function origin(value) {
  try {
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
        (url.protocol !== "https:" && !(loopback && url.protocol === "http:"))) return null;
    return url;
  } catch { return null; }
}

const service = origin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
check(Boolean(service), "Supabase URL is valid", "Set NEXT_PUBLIC_SUPABASE_URL to the intended Supabase API origin.");
check(Boolean(key), "Supabase public API key is present", "Set NEXT_PUBLIC_SUPABASE_ANON_KEY to that project's public key.");
const local = service && ["localhost", "127.0.0.1", "[::1]"].includes(service.hostname);
const app = origin(process.env.SITE_URL || (local && process.env.NODE_ENV !== "production" ? "http://127.0.0.1:3000" : ""));
check(Boolean(app), "Application origin is valid", "Set SITE_URL to the exact application origin (HTTPS for hosted apps).");
if (service) console.log(`Google authorised redirect URI: ${service.origin}/auth/v1/callback`);
if (app) {
  console.log(`Supabase allowed redirect URL: ${app.origin}/auth/callback`);
  console.log(`Open the app at: ${app.origin}/login (keep this hostname throughout sign-in)`);
}

if (local) {
  const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
  const google = config.split("[auth.external.google]")[1]?.split(/^\[/m)[0] ?? "";
  const enabled = /^enabled\s*=\s*true\s*$/m.test(google);
  check(Boolean(process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID), "Local Google client ID is present", "Add SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID privately to .env.local.");
  check(Boolean(process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET), "Local Google client secret is present", "Add SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET privately to .env.local.");
  check(enabled, "Local Google provider is enabled in config.toml", "After supplying credentials, set [auth.external.google].enabled = true and restart local Supabase with those variables exported.");
  const guard = config.split("[auth.hook.before_user_created]")[1]?.split(/^\[/m)[0] ?? "";
  check(/^enabled\s*=\s*true\s*$/m.test(guard) && guard.includes('"pg-functions://postgres/auth_hooks/reject_google_signup"'),
    "Local Google registration guard is configured", "Apply the Google signup migration, enable the before-user-created hook and restart local Supabase. This checks the config file; verify the running hook separately.");
} else if (service) {
  console.log("Hosted provider credentials belong in Supabase Dashboard > Authentication > Sign In / Providers > Google.");
}

if (service && key) {
  try {
    const response = await fetch(`${service.origin}/auth/v1/settings`, {
      headers: { apikey: key }, signal: AbortSignal.timeout(5000), redirect: "error",
    });
    check(response.ok, "Supabase Auth settings are reachable with this key",
      response.status === 401 || response.status === 403 ? "Check that the API URL and public key belong to the same project." : "Check the Supabase Auth service status.");
    if (response.ok) {
      const settings = await response.json();
      check(settings.external?.google === true, "Running Auth service has Google enabled", local
        ? "Start/restart local Supabase after enabling Google and exporting its credentials; Next.js loading .env.local does not configure Supabase."
        : "Enable Google and save the client ID/secret in this Supabase project's provider settings.");
    }
  } catch {
    check(false, "Supabase Auth is reachable", local
      ? "Start Docker and local Supabase. The app currently targets your local stack, not the hosted dashboard."
      : "Check network connectivity and the intended Supabase project status.");
  }
}

console.log("This checks setup only. Real Google consent, callback, session persistence and sign-out still require a browser test.");
process.exitCode = failures ? 1 : 0;
