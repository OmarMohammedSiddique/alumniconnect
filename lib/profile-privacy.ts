import type { SupabaseClient } from "@supabase/supabase-js";

export const REPORT_REASONS = [
  "harassment",
  "inappropriate_content",
  "impersonation",
  "spam",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Harassment or bullying",
  inappropriate_content: "Inappropriate content",
  impersonation: "Impersonation or fake profile",
  spam: "Spam or promotional content",
  other: "Other safety or policy concern",
};

export const MAX_REPORT_DETAILS_LENGTH = 1000;
export const MAX_BLOCKS_PER_USER = 100;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(val: unknown): val is string {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}

export type ValidatedReport =
  | {
      valid: true;
      reason: ReportReason;
      details: string;
      reporterId: string;
      reportedId: string;
    }
  | {
      valid: false;
      error: string;
    };

export function validateReportInput(input: {
  reporterId?: unknown;
  reportedId?: unknown;
  reason?: unknown;
  details?: unknown;
}): ValidatedReport {
  const reporterId = typeof input.reporterId === "string" ? input.reporterId.trim() : "";
  const reportedId = typeof input.reportedId === "string" ? input.reportedId.trim() : "";

  if (!isValidUuid(reporterId)) {
    return { valid: false, error: "Invalid reporter account." };
  }
  if (!isValidUuid(reportedId)) {
    return { valid: false, error: "Invalid member profile specified." };
  }
  if (reporterId === reportedId) {
    return { valid: false, error: "You cannot report your own account." };
  }

  const reasonStr = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!REPORT_REASONS.includes(reasonStr as ReportReason)) {
    return {
      valid: false,
      error: "Please select a valid report category from the options provided.",
    };
  }

  const detailsRaw = typeof input.details === "string" ? input.details.trim() : "";
  if (detailsRaw.length > MAX_REPORT_DETAILS_LENGTH) {
    return {
      valid: false,
      error: `Additional context must be ${MAX_REPORT_DETAILS_LENGTH} characters or fewer.`,
    };
  }

  return {
    valid: true,
    reason: reasonStr as ReportReason,
    details: detailsRaw,
    reporterId,
    reportedId,
  };
}

export type ValidatedBlock =
  | {
      valid: true;
      blockerId: string;
      blockedId: string;
    }
  | {
      valid: false;
      error: string;
    };

export function validateBlockInput(input: {
  blockerId?: unknown;
  blockedId?: unknown;
}): ValidatedBlock {
  const blockerId = typeof input.blockerId === "string" ? input.blockerId.trim() : "";
  const blockedId = typeof input.blockedId === "string" ? input.blockedId.trim() : "";

  if (!isValidUuid(blockerId)) {
    return { valid: false, error: "Invalid user account." };
  }
  if (!isValidUuid(blockedId)) {
    return { valid: false, error: "Invalid member profile specified." };
  }
  if (blockerId === blockedId) {
    return { valid: false, error: "You cannot block yourself." };
  }

  return {
    valid: true,
    blockerId,
    blockedId,
  };
}

export interface SafetyActionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericClient = SupabaseClient<any, any, any> | any;

export async function executeBlockMember(
  supabase: GenericClient,
  targetId: unknown,
): Promise<SafetyActionResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to block a member." };
  }

  const validation = validateBlockInput({
    blockerId: user.id,
    blockedId: targetId,
  });
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const { error } = await supabase.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: validation.blockedId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true, message: "Member is already blocked." };
    }
    if (error.code === "42501" || error.message?.includes("100")) {
      return {
        ok: false,
        error: "Unable to block member. You may have reached the 100 block limit.",
      };
    }
    return { ok: false, error: "Failed to block member. Please try again." };
  }

  return { ok: true, message: "Member blocked successfully." };
}

export async function executeUnblockMember(
  supabase: GenericClient,
  targetId: unknown,
): Promise<SafetyActionResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to unblock a member." };
  }

  if (!isValidUuid(targetId)) {
    return { ok: false, error: "Invalid member account specified." };
  }

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetId);

  if (error) {
    return { ok: false, error: "Failed to unblock member. Please try again." };
  }

  return { ok: true, message: "Member unblocked successfully." };
}

export async function executeReportMember(
  supabase: GenericClient,
  input: {
    reportedId: unknown;
    reason: unknown;
    details: unknown;
  },
): Promise<SafetyActionResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to report a member." };
  }

  const validation = validateReportInput({
    reporterId: user.id,
    reportedId: input.reportedId,
    reason: input.reason,
    details: input.details,
  });

  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_id: validation.reportedId,
    reason: validation.reason,
    details: validation.details,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error:
          "You have already submitted a pending report for this member. Our staff will review it.",
      };
    }
    return { ok: false, error: "Failed to submit report. Please try again." };
  }

  return {
    ok: true,
    message:
      "Thank you for keeping our community safe. Your report has been submitted to staff.",
  };
}

export async function executeUpdateVisibility(
  supabase: GenericClient,
  memberVisible: boolean,
): Promise<{ ok: boolean; message?: string; error?: string; staffHidden?: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ member_visible: memberVisible })
    .eq("id", user.id)
    .select("is_visible, member_visible, staff_hidden")
    .single();

  if (error) {
    return { ok: false, error: "Failed to update profile visibility." };
  }

  if (data?.staff_hidden) {
    return {
      ok: true,
      staffHidden: true,
      message:
        "Visibility preference saved. However, your profile has been restricted by staff moderation and remains hidden from discovery.",
    };
  }

  return {
    ok: true,
    staffHidden: false,
    message: memberVisible
      ? "Your profile is now visible to the AlumniKonneQt community."
      : "Your profile is now hidden from discovery and recommendations.",
  };
}

/**
 * Updates the signed-in Mentor's availability for NEW mentorship requests.
 * Existing pending requests and connections are unaffected. The
 * protect_profile_availability trigger and the request INSERT policy remain
 * the authority; this only validates input and reports the persisted value.
 */
export async function executeUpdateAvailability(
  supabase: GenericClient,
  acceptingRequests: unknown,
): Promise<{ ok: boolean; message?: string; error?: string; acceptingRequests?: boolean }> {
  if (typeof acceptingRequests !== "boolean") {
    return { ok: false, error: "Invalid availability value." };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ accepting_requests: acceptingRequests })
    .eq("id", user.id)
    .eq("role", "mentor")
    .select("accepting_requests")
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Failed to update availability. Please try again." };
  }
  if (!data || data.accepting_requests !== acceptingRequests) {
    return { ok: false, error: "Only Mentors can change availability." };
  }

  return {
    ok: true,
    acceptingRequests,
    message: acceptingRequests
      ? "You are now accepting new mentorship requests."
      : "New mentorship requests are paused. Existing requests and connections are unchanged.",
  };
}
