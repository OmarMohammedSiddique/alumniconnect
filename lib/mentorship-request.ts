import type { SupabaseClient } from "@supabase/supabase-js";

export interface RequestState {
  error: string | null;
  ok: boolean;
}

type Decision = "cancel" | "accept" | "decline";

export async function updateMentorshipRequest(
  getClient: () => Promise<SupabaseClient>,
  requestId: string,
  decision: Decision | null,
): Promise<RequestState> {
  if (!requestId || !decision) {
    return { error: "Choose a valid request action and try again.", ok: false };
  }

  const failed = {
    error: `We couldn't ${decision} this request. Please try again.`,
    ok: false,
  };
  const unavailable = {
    error: "This request is no longer pending or available to you. Refresh the page to see its latest status.",
    ok: false,
  };

  try {
    const supabase = await getClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: "Please sign in again before updating this request.", ok: false };
    }

    if (decision === "cancel") {
      // Keep RLS in force and detect a stale or inaccessible request, including
      // updates that succeed at the HTTP level but affect no rows.
      const { data, error } = await supabase
        .from("mentorship_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId)
        .eq("mentee_id", user.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (error) return failed;
      if (!data) return unavailable;
    } else {
      // The existing RPC checks the recipient and pending status, and creates
      // the connection atomically when accepting.
      const { error } = await supabase.rpc("respond_to_request", {
        p_request_id: requestId,
        p_accept: decision === "accept",
      });
      if (error) {
        if (error.code === "P0001" && [
          "request not found",
          "request is not pending",
          "only the recipient mentor can respond",
        ].includes(error.message)) return unavailable;
        return failed;
      }
    }

    return { error: null, ok: true };
  } catch {
    return failed;
  }
}
