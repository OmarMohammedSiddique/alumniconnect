import type { SupabaseClient } from "@supabase/supabase-js";

type Auth = SupabaseClient["auth"];
export const GOOGLE_NEXT_COOKIE = "alumnikonneqt-google-next";
export type GoogleAuthError = "cancelled" | "registration_required" | "exchange_failed" | "unavailable" | "unreachable" | "invalid_key" | "not_configured";
export const GOOGLE_REGISTRATION_REQUIRED_MESSAGE = "Register with AlumniKonneQt before signing in with Google.";

export function getGoogleAuthMessage(reason: string | null): string | null {
  switch (reason) {
    case "cancelled": return "Google sign-in was cancelled. Try again or use your email and password.";
    case "registration_required": return GOOGLE_REGISTRATION_REQUIRED_MESSAGE;
    case "exchange_failed": return "Google sign-in could not be completed. The link may have expired. Please start again.";
    case "unavailable": return "Google sign-in is temporarily unavailable. Try again or use your email and password.";
    case "unreachable": return "Could not reach the sign-in service. Please try again later or ask the administrator to check the authentication setup.";
    case "invalid_key": return "The sign-in service configuration needs attention. Ask the administrator to check the Supabase URL and public API key.";
    case "not_configured": return "Google sign-in is not configured for this environment yet. You can still use email and password.";
    default: return null;
  }
}

// Deployment callbacks use an explicit origin, never forwarded-host headers.
// Development only may infer a loopback origin from the initiating request.
export function getGoogleAuthOrigin(requestOrigin: string, siteUrl: string | undefined, production: boolean): string {
  const source = siteUrl || (production ? "" : requestOrigin);
  const url = new URL(source);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      (!siteUrl && !local)) {
    throw new Error("Configure SITE_URL with the trusted application origin.");
  }
  // Both loopback aliases are allow-listed locally. Keep the initiating host's
  // PKCE cookies instead of moving a localhost login to 127.0.0.1 (or vice versa).
  if (!production && local && requestOrigin) {
    const incoming = new URL(requestOrigin);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(incoming.hostname) ||
        incoming.protocol !== url.protocol || incoming.port !== url.port ||
        incoming.username || incoming.password || incoming.pathname !== "/" || incoming.search || incoming.hash) {
      throw new Error("Use a trusted loopback application origin.");
    }
    return incoming.origin;
  }
  return url.origin;
}

export function getGoogleCallbackOrigin(request: Request, siteUrl: string | undefined, production: boolean): string {
  const url = new URL(request.url);
  // Next dev can reconstruct request.url with localhost even when the browser
  // used 127.0.0.1. Preserve its host-bound cookies; inference is loopback-only.
  const incoming = !production && request.headers.get("host")
    ? `${url.protocol}//${request.headers.get("host")}`
    : url.origin;
  return getGoogleAuthOrigin(incoming, siteUrl, production);
}

export async function checkGoogleProvider(supabaseUrl: string, anonKey: string, fetcher: typeof fetch = fetch): Promise<GoogleAuthError | null> {
  try {
    const response = await fetcher(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: anonKey }, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401 || response.status === 403) return "invalid_key";
    if (!response.ok) return "unavailable";
    const settings = await response.json();
    return settings.external?.google === true ? null : "not_configured";
  } catch { return "unreachable"; }
}

export async function beginGoogleSignIn(auth: Pick<Auth, "signInWithOAuth">, callbackUrl: string, supabaseUrl: string): Promise<{ url: string | null; error: GoogleAuthError | null }> {
  try {
    const { data, error } = await auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl, scopes: "openid email profile", queryParams: { prompt: "select_account" }, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { url: null, error: "unavailable" };
    const target = new URL(data.url);
    if (target.origin !== new URL(supabaseUrl).origin || target.pathname !== "/auth/v1/authorize" || target.searchParams.get("provider") !== "google") {
      return { url: null, error: "unavailable" };
    }
    return { url: target.href, error: null };
  } catch { return { url: null, error: "unavailable" }; }
}

export async function finishGoogleSignIn(params: URLSearchParams, auth: Pick<Auth, "exchangeCodeForSession">): Promise<GoogleAuthError | null> {
  // The hosted hook predates the product rename. Recognise both exact messages;
  // never reflect arbitrary provider descriptions or relax the registration rule.
  if (params.has("error") && [GOOGLE_REGISTRATION_REQUIRED_MESSAGE,
    "Register with AlumniConnect before signing in with Google.",
  ].includes(params.get("error_description") ?? "")) return "registration_required";
  if (params.has("error")) return params.get("error") === "access_denied" ? "cancelled" : "exchange_failed";
  const code = params.get("code");
  if (!code || code.length > 2048) return "exchange_failed";
  try {
    const { data, error } = await auth.exchangeCodeForSession(code);
    return error || !data.session || !data.user ? "exchange_failed" : null;
  } catch { return "exchange_failed"; }
}
