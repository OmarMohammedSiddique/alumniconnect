import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILE_ROLES = ["mentee", "mentor", "moderator", "admin"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export interface AdminActionState {
  ok: boolean;
  error: string | null;
  message: string | null;
}

export const INITIAL_ADMIN_ACTION_STATE: AdminActionState = {
  ok: false,
  error: null,
  message: null,
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Messages raised by public.protect_profile_columns() when the caller lacks
// the privilege for a column change. They are mapped to a safe denial rather
// than shown verbatim.
const PERMISSION_MESSAGES = new Set([
  "only admins can change roles",
  "only moderators or admins can change visibility",
  "moderators may only change visibility on other profiles",
]);

function fail(error: string): AdminActionState {
  return { ok: false, error, message: null };
}

function isPermissionError(error: { code?: string; message?: string }) {
  if (error.code === "42501") return true;
  return error.code === "P0001" && PERMISSION_MESSAGES.has(error.message ?? "");
}

const DENIED = "You don't have permission to make this change. Refresh the page to confirm your current access.";
const STALE = "This profile no longer exists or is no longer available to you. Refresh the page to see the current list.";
const SIGNED_OUT = "Please sign in again before changing this profile.";

type GetClient = () => Promise<SupabaseClient>;

/**
 * Changes a profile role as the signed-in caller. RLS and the
 * protect_profile_columns trigger remain the authority; this function only
 * validates input, maps outcomes to safe feedback and confirms that a permitted
 * row actually changed.
 */
export async function changeProfileRole(
  getClient: GetClient,
  rawUserId: unknown,
  rawRole: unknown,
): Promise<AdminActionState> {
  const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";
  const role = typeof rawRole === "string" ? rawRole : "";
  if (!UUID_PATTERN.test(userId)) return fail("This profile reference is invalid. Refresh the page and try again.");
  if (!(PROFILE_ROLES as readonly string[]).includes(role)) {
    return fail("Choose mentee, mentor, moderator or admin.");
  }

  const failed = fail("We couldn't change this role. Please try again.");
  try {
    const supabase = await getClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return fail(SIGNED_OUT);
    if (user.id === userId) return fail("You can't change your own role from this page.");

    const { data, error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId)
      .select("id, role")
      .maybeSingle();
    if (error) return isPermissionError(error) ? fail(DENIED) : failed;
    if (!data) return fail(STALE);
    if (data.role !== role) return failed;

    return { ok: true, error: null, message: `Role changed to ${role}.` };
  } catch {
    return failed;
  }
}

/** Shows or hides a profile as the signed-in caller (moderators and admins). */
export async function changeProfileVisibility(
  getClient: GetClient,
  rawUserId: unknown,
  rawVisible: unknown,
): Promise<AdminActionState> {
  const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";
  if (!UUID_PATTERN.test(userId)) return fail("This profile reference is invalid. Refresh the page and try again.");
  if (rawVisible !== "true" && rawVisible !== "false") {
    return fail("Choose whether the profile should be visible or hidden.");
  }
  const visible = rawVisible === "true";

  const failed = fail(`We couldn't ${visible ? "show" : "hide"} this profile. Please try again.`);
  try {
    const supabase = await getClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return fail(SIGNED_OUT);

    const { data, error } = await supabase
      .from("profiles")
      .update({ is_visible: visible })
      .eq("id", userId)
      .select("id, is_visible")
      .maybeSingle();
    if (error) return isPermissionError(error) ? fail(DENIED) : failed;
    if (!data) return fail(STALE);
    if (data.is_visible !== visible) return failed;

    return {
      ok: true,
      error: null,
      message: visible ? "Profile is now visible in Discover." : "Profile is now hidden from Discover.",
    };
  } catch {
    return failed;
  }
}
