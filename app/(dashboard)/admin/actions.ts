"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  changeProfileRole,
  changeProfileVisibility,
  type AdminActionState,
} from "@/lib/admin-profile-action";
import { isValidUuid } from "@/lib/profile-privacy";
import { MAX_REVIEW_NOTE_LENGTH } from "@/lib/form-limits";

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
  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/discover");
  }
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
  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/discover");
  }
  return result;
}

export async function reviewReportAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const reportId = String(formData.get("report_id") ?? "").trim();
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!reportId || !isValidUuid(reportId)) {
    return { ok: false, error: "Invalid report reference.", message: null };
  }
  if (action !== "hide_profile" && action !== "dismiss") {
    return { ok: false, error: "Invalid review action.", message: null };
  }
  if (note.length > MAX_REVIEW_NOTE_LENGTH) {
    return {
      ok: false,
      error: `Review note must be ${MAX_REVIEW_NOTE_LENGTH} characters or fewer.`,
      message: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_report", {
    p_report_id: reportId,
    p_action: action,
    p_note: note,
  });

  if (error) {
    if (error.code === "P0001") {
      if (error.message === "pending report not found") {
        return {
          ok: false,
          error: "This report has already been reviewed. Refresh the page to see the current queue.",
          message: null,
        };
      }
      if (error.message === "only moderators or admins can review reports") {
        return {
          ok: false,
          error: "You don't have permission to review reports.",
          message: null,
        };
      }
    }
    return {
      ok: false,
      error: "We couldn't complete this report review right now. Please try again.",
      message: null,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/discover");
  return {
    ok: true,
    error: null,
    message:
      action === "hide_profile"
        ? "Report actioned: member profile hidden."
        : "Report dismissed.",
  };
}
