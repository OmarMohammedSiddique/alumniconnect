"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthWithDeadline } from "@/lib/supabase/auth-fetch";
import { getSafeSignInRedirect } from "@/lib/auth-redirect";
import { demoSwitcherEnabled } from "@/lib/demo-accounts";
import { canUseDemoSwitcher, isDemoRole, isFictionalDemoUser } from "@/lib/demo-switcher";

export interface DemoSwitchState {
  error: string | null;
}

const UNAVAILABLE = "Demo accounts are not available right now.";

/**
 * Signs the presenter in as a fictional demo account (#106). Every rule is
 * checked here on the server: the setting must be on, the visitor must be
 * signed out or already in a demo account, and the target must be a fictional
 * Mentee or Mentor. Real member accounts can never be reached.
 */
export async function switchDemoAccount(
  _prev: DemoSwitchState,
  formData: FormData,
): Promise<DemoSwitchState> {
  if (!demoSwitcherEnabled()) return { error: UNAVAILABLE };

  const targetId = String(formData.get("account_id") ?? "");
  const next = getSafeSignInRedirect(String(formData.get("next") ?? "/requests"));
  if (!targetId) return { error: "Choose a demo account." };

  const supabase = await createClient(fetchAuthWithDeadline);
  const { data: { user: current } } = await supabase.auth.getUser();
  if (!canUseDemoSwitcher(current)) {
    return { error: "Sign out of your own account before using a demo account." };
  }
  if (current?.id === targetId) redirect(next);

  const admin = createAdminClient();
  const { data: target, error: lookupError } = await admin.auth.admin.getUserById(targetId);
  if (lookupError || !isFictionalDemoUser(target.user)) return { error: UNAVAILABLE };

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .single();
  if (!isDemoRole(profile?.role)) return { error: UNAVAILABLE };

  // A one-time sign-in token issued on the server. Nothing is emailed and the
  // token never reaches the browser; it is exchanged for a session right away.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: target.user.email!,
  });
  if (linkError || !link.properties?.hashed_token) return { error: UNAVAILABLE };

  if (current) await supabase.auth.signOut({ scope: "local" });
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) return { error: "The demo sign-in did not complete. Try again." };

  redirect(next);
}
