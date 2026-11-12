// Cloudflare Turnstile bot protection for Supabase Auth.
// The browser widget produces a single-use token; Supabase Auth verifies it
// with Cloudflare (using the secret configured in the Supabase dashboard)
// before signing up, signing in with a password, or sending account emails.
// The app never sees the Turnstile secret.

export const CAPTCHA_FIELD = "captcha_token";
export const CAPTCHA_FAILED_MESSAGE = "The security check did not complete. Wait a moment for it to finish, then try again.";

// Cloudflare tokens are at most 2048 characters.
export function readCaptchaToken(form: FormData): string | undefined {
  const value = form.get(CAPTCHA_FIELD);
  return typeof value === "string" && value.length > 0 && value.length <= 2048 ? value : undefined;
}

export function captchaOption(captchaToken: string | undefined): { captchaToken?: string } {
  return captchaToken ? { captchaToken } : {};
}

// Supabase Auth reports a rejected or missing token as `captcha_failed`.
export function isCaptchaError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "captcha_failed" || /captcha/i.test(error.message ?? "");
}
