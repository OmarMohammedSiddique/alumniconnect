"use server";

import { revalidatePath } from "next/cache";
import { dispatchNotificationEmails } from "@/lib/notification-dispatch";
import { createClient } from "@/lib/supabase/server";
import { updateMentorshipRequest, type RequestState } from "@/lib/mentorship-request";
import { MAX_INTRODUCTION_LENGTH } from "@/lib/form-limits";
import { isValidUuid } from "@/lib/profile-privacy";

export type { RequestState } from "@/lib/mentorship-request";

export async function createRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const mentorId = String(formData.get("mentor_id") ?? "").trim();
  const message = String(formData.get("message") ?? "")
    .trim()
    .slice(0, MAX_INTRODUCTION_LENGTH);
  if (!mentorId || !isValidUuid(mentorId)) {
    return { error: "Missing or invalid mentor reference.", ok: false };
  }

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
      return {
        error:
          "This request could not be sent. Only mentees can send requests, and the Mentor must be visible and accepting new requests.",
        ok: false,
      };
    }
    return { error: "We couldn't send this request right now. Please try again.", ok: false };
  }

  dispatchNotificationEmails();
  revalidatePath("/requests");
  revalidatePath("/discover");
  return { error: null, ok: true };
}

export async function cancelRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const id = String(formData.get("request_id") ?? "").trim();
  if (!isValidUuid(id)) {
    return { error: "Choose a valid request action and try again.", ok: false };
  }
  const result = await updateMentorshipRequest(createClient, id, "cancel");
  if (result.ok) {
    revalidatePath("/requests");
    revalidatePath("/discover");
  }
  return result;
}

export async function respondRequest(
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const id = String(formData.get("request_id") ?? "").trim();
  if (!isValidUuid(id)) {
    return { error: "Choose a valid request action and try again.", ok: false };
  }
  const accept = formData.get("accept");
  const decision = accept === "true" ? "accept" : accept === "false" ? "decline" : null;
  const result = await updateMentorshipRequest(createClient, id, decision);
  if (result.ok) {
    dispatchNotificationEmails();
    revalidatePath("/requests");
    revalidatePath("/discover");
  }
  return result;
}
