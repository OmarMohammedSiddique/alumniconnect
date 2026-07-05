"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface RequestState {
  error: string | null;
  ok: boolean;
}

export async function createRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const mentorId = String(formData.get("mentor_id") ?? "");
  const message = String(formData.get("message") ?? "")
    .trim()
    .slice(0, 500);
  if (!mentorId) return { error: "Missing mentor.", ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", ok: false };

  // RLS enforces: caller is a mentee, target is a visible mentor, no
  // duplicate pending request (partial unique index).
  const { error } = await supabase.from("mentorship_requests").insert({
    mentee_id: user.id,
    mentor_id: mentorId,
    message,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You already have a pending request to this mentor.", ok: false };
    }
    if (error.code === "42501") {
      return { error: "Only mentees can send mentorship requests.", ok: false };
    }
    return { error: error.message, ok: false };
  }

  revalidatePath("/requests");
  return { error: null, ok: true };
}

export async function cancelRequest(formData: FormData) {
  const id = String(formData.get("request_id") ?? "");
  const supabase = await createClient();
  // RLS: only the requesting mentee may set their pending request cancelled.
  await supabase
    .from("mentorship_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  revalidatePath("/requests");
}

export async function respondRequest(formData: FormData) {
  const id = String(formData.get("request_id") ?? "");
  const accept = formData.get("accept") === "true";
  const supabase = await createClient();
  // respond_to_request validates the caller is the recipient mentor and the
  // request is pending; accepting creates the connection atomically.
  await supabase.rpc("respond_to_request", {
    p_request_id: id,
    p_accept: accept,
  });
  revalidatePath("/requests");
}
