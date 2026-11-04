"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  changeProfileRole,
  changeProfileVisibility,
  type AdminActionState,
} from "@/lib/admin-profile-action";

// Both actions run as the caller: RLS plus the protect_profile_columns
// trigger enforce that only admins change roles and only staff change
// visibility. The UI guard is convenience, not security.

export async function setUserRole(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const result = await changeProfileRole(
    createClient,
    formData.get("user_id"),
    formData.get("role"),
  );
  if (result.ok) revalidatePath("/admin");
  return result;
}

export async function setUserVisibility(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const result = await changeProfileVisibility(
    createClient,
    formData.get("user_id"),
    formData.get("visible"),
  );
  if (result.ok) revalidatePath("/admin");
  return result;
}

export async function reviewReportAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const reportId = String(formData.get("report_id") ?? "");
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!reportId) return { ok: false, error: "Report ID required.", message: null };
  if (action !== "hide_profile" && action !== "dismiss") {
    return { ok: false, error: "Invalid review action.", message: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_report", {
    p_report_id: reportId,
    p_action: action,
    p_note: note,
  });

  if (error) {
    return { ok: false, error: error.message, message: null };
  }

  revalidatePath("/admin");
  return {
    ok: true,
    error: null,
    message:
      action === "hide_profile"
        ? "Report actioned: member profile hidden."
        : "Report dismissed.",
  };
}
