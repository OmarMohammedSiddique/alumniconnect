"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthWithDeadline } from "@/lib/supabase/auth-fetch";
import { normalizeOtpEmail } from "@/lib/email-otp";
import { getPasswordError } from "@/lib/signup-validation";
import { getSafeSignInRedirect } from "@/lib/auth-redirect";
import { ACCOUNT_EMAIL_FLOW, ACCOUNT_EMAIL_SECONDS, ACCOUNT_EMAIL_INVALID_CODE, accountEmailError, accountEmailRetrySeconds, readAccountEmailChallenge, requestAccountEmail, verifyAccountEmail, type AccountEmailPurpose, type AccountEmailState } from "@/lib/account-email";

export async function accountEmailAction(purpose: AccountEmailPurpose, _previous: AccountEmailState, form: FormData): Promise<AccountEmailState> {
  if ((purpose !== "signup" && purpose !== "recovery") || process.env.ACCOUNT_EMAIL_ENABLED !== "true") return { error: "This email flow is not available yet. Return to sign in.", message: null, challenge: null, email: "" };
  const flow = ACCOUNT_EMAIL_FLOW[purpose];
  const jar = await cookies();
  const challenge = readAccountEmailChallenge(jar.get(flow.cookie)?.value, purpose);
  const email = normalizeOtpEmail(form.get("email")) ?? challenge?.email ?? "";
  const fail = (error: string, field?: AccountEmailState["field"]): AccountEmailState => ({ error, field, message: null, challenge, email });
  const clear = () => jar.set(flow.cookie, "", { path: flow.path, maxAge: 0 });
  const intent = form.get("intent");
  if (intent === "edit") { clear(); return { error: null, message: null, challenge: null, email }; }
  if (intent === "verify") {
    if (!challenge || form.get("email") !== challenge.email || String(form.get("requestedAt")) !== String(challenge.requestedAt)) return fail("This request changed or expired. Request a new code or refresh this page.");
    const token = String(form.get("token") ?? "").trim();
    if (!/^\d{6,10}$/.test(token)) return fail("Enter the 6–10 digit code from your email.", "token");
    const password = String(form.get("password") ?? "");
    if (purpose === "recovery") {
      const error = getPasswordError(password, String(form.get("confirm_password") ?? ""));
      if (error) return fail(error, error === "Passwords do not match." ? "confirm_password" : "password");
    }
    const supabase = await createClient(fetchAuthWithDeadline);
    const error = await verifyAccountEmail(supabase.auth, purpose, challenge.email, token);
    if (error) return fail(error, error === ACCOUNT_EMAIL_INVALID_CODE ? "token" : undefined);
    if (purpose === "signup") { clear(); redirect(getSafeSignInRedirect(challenge.next)); }
    // A normal session or forged cookie can never reach this update without a
    // fresh recovery-code verification above. Do not trust client session flags.
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) {
        await supabase.auth.signOut({ scope: "local" });
        clear();
        return { error: result.error.code === "same_password" ? "Choose a password different from your previous one and request a new code." : accountEmailError(result.error.status), message: "The code has been used. Request a fresh reset code before trying again.", challenge: null, email };
      }
      const signedOut = await supabase.auth.signOut({ scope: "global" });
      if (signedOut.error) throw new Error("Recovery sign-out unavailable");
    } catch {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      clear();
      return { error: "Password reset could not finish. Try signing in with the new password, or request a new reset code.", message: null, challenge: null, email };
    }
    clear();
    redirect("/login?password_reset=1");
  }
  if (intent !== "request" && intent !== "resend") return fail("Choose an email action and try again.");
  const target = intent === "resend" ? challenge?.email : normalizeOtpEmail(form.get("email"));
  if (!target) return fail("Enter a valid email address.", "email");
  if (accountEmailRetrySeconds(challenge) > 0) return fail("Wait one minute between code requests.");
  const fresh = { email: target, purpose, requestedAt: Date.now(), next: purpose === "signup" ? challenge?.next ?? "/profile" : "/login" };
  const supabase = await createClient(fetchAuthWithDeadline);
  await requestAccountEmail(supabase.auth, purpose, target);
  jar.set(flow.cookie, JSON.stringify(fresh), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: flow.path, maxAge: ACCOUNT_EMAIL_SECONDS });
  return { error: null, message: flow.message, challenge: fresh, email: target };
}
