"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthWithDeadline } from "@/lib/supabase/auth-fetch";
import { getSafeSignInRedirect } from "@/lib/auth-redirect";
import {
  demoSwitcherEnabled,
  isDemoPresenter,
  matchesPresenterKey,
  presenterCookieValue,
} from "@/lib/demo-accounts";
import {
  DEMO_PRESENTER_COOKIE,
  DEMO_PRESENTER_SECONDS,
  DEMO_UNAVAILABLE,
  runDemoSwitch,
} from "@/lib/demo-switcher";

export interface DemoSwitchState {
  error: string | null;
}

/** Unlocks demo mode in this browser for a presenter who knows the key (#106). */
export async function unlockDemoMode(
  _prev: DemoSwitchState,
  formData: FormData,
): Promise<DemoSwitchState> {
  if (!demoSwitcherEnabled()) return { error: DEMO_UNAVAILABLE };
  const submitted = String(formData.get("presenter_key") ?? "");
  const value = presenterCookieValue();
  if (!value || !matchesPresenterKey(submitted)) {
    return { error: "That presenter key is not correct." };
  }
  (await cookies()).set(DEMO_PRESENTER_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_PRESENTER_SECONDS,
  });
  const supabase = await createClient(fetchAuthWithDeadline);
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/requests" : "/login");
}

/** Ends demo mode in this browser. Existing sessions are revoked separately. */
export async function lockDemoMode(): Promise<void> {
  (await cookies()).delete(DEMO_PRESENTER_COOKIE);
  redirect("/demo");
}

/**
 * Signs the presenter in as a fictional demo account. The decision lives in
 * runDemoSwitch (unit tested); this action only supplies the real services.
 */
export async function switchDemoAccount(
  _prev: DemoSwitchState,
  formData: FormData,
): Promise<DemoSwitchState> {
  const targetId = String(formData.get("account_id") ?? "");
  const next = getSafeSignInRedirect(String(formData.get("next") ?? "/requests"));
  const supabase = await createClient(fetchAuthWithDeadline);
  const admin = createAdminClient();

  const result = await runDemoSwitch({
    enabled: demoSwitcherEnabled(),
    presenter: await isDemoPresenter(),
    getCurrentUser: async () => (await supabase.auth.getUser()).data.user,
    getUserById: async (id) => (await admin.auth.admin.getUserById(id)).data.user ?? null,
    getProfileRole: async (id) =>
      (await admin.from("profiles").select("role").eq("id", id).single()).data?.role,
    // A one-time token issued on the server. Nothing is emailed and the token
    // never reaches the browser.
    issueSignInToken: async (email) => {
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      return error ? null : data.properties?.hashed_token ?? null;
    },
    exchangeSignInToken: async (token) =>
      !(await supabase.auth.verifyOtp({ type: "magiclink", token_hash: token })).error,
  }, targetId);

  if (!result.ok) return { error: result.error };
  redirect(next);
}
