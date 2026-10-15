"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateMentorshipRequest, type RequestState } from "@/lib/mentorship-request";
import { MAX_INTRODUCTION_LENGTH } from "@/lib/form-limits";

export type { RequestState } from "@/lib/mentorship-request";

export async function createRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const mentorId = String(formData.get("mentor_id") ?? "");
  const message = String(formData.get("message") ?? "")
    .trim()
    .slice(0, MAX_INTRODUCTION_LENGTH);
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

export async function cancelRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const id = String(formData.get("request_id") ?? "");
  const result = await updateMentorshipRequest(createClient, id, "cancel");
  if (result.ok) revalidatePath("/requests");
  return result;
}

export async function respondRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const id = String(formData.get("request_id") ?? "");
  const accept = formData.get("accept");
  const decision = accept === "true" ? "accept" : accept === "false" ? "decline" : null;
  const result = await updateMentorshipRequest(createClient, id, decision);
  if (result.ok) revalidatePath("/requests");
  return result;
}
