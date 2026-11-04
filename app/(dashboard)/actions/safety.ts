"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  executeBlockMember,
  executeUnblockMember,
  executeReportMember,
  executeUpdateVisibility,
  type SafetyActionResult,
} from "@/lib/profile-privacy";

export type ReportActionState = SafetyActionResult;

export async function blockMemberAction(
  targetUserId: string,
): Promise<SafetyActionResult> {
  const supabase = await createClient();
  const result = await executeBlockMember(supabase, targetUserId);
  if (result.ok) {
    revalidatePath("/discover");
    revalidatePath("/requests");
    revalidatePath("/profile");
  }
  return result;
}

export async function unblockMemberAction(
  targetUserId: string,
): Promise<SafetyActionResult> {
  const supabase = await createClient();
  const result = await executeUnblockMember(supabase, targetUserId);
  if (result.ok) {
    revalidatePath("/discover");
    revalidatePath("/requests");
    revalidatePath("/profile");
  }
  return result;
}

export async function reportMemberAction(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const reportedId = formData.get("reported_id");
  const reason = formData.get("reason");
  const details = formData.get("details");

  const supabase = await createClient();
  const result = await executeReportMember(supabase, {
    reportedId,
    reason,
    details,
  });

  if (result.ok) {
    revalidatePath("/discover");
    revalidatePath("/requests");
  }
  return result;
}

export async function updateProfileVisibilityAction(
  memberVisible: boolean,
): Promise<{ ok: boolean; message?: string; error?: string; staffHidden?: boolean }> {
  const supabase = await createClient();
  const result = await executeUpdateVisibility(supabase, memberVisible);
  if (result.ok) {
    revalidatePath("/profile");
    revalidatePath("/discover");
  }
  return result;
}
