"use server";

import { revalidatePath } from "next/cache";
import { dispatchNotificationEmails } from "@/lib/notification-dispatch";
import { createClient } from "@/lib/supabase/server";
import { updateMentorshipRequest, type RequestState } from "@/lib/mentorship-request";
import { MAX_INTRODUCTION_LENGTH } from "@/lib/form-limits";
import { isValidUuid } from "@/lib/profile-privacy";
import { normaliseContact } from "@/lib/connection-journey";

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

export interface JourneyActionState {
  error: string | null;
  ok: boolean;
}

/** Shares or updates the signed-in member's contact detail on a connection (#107). */
export async function shareConnectionContact(
  _prev: JourneyActionState,
  formData: FormData,
): Promise<JourneyActionState> {
  const connectionId = String(formData.get("connection_id") ?? "").trim();
  if (!isValidUuid(connectionId)) return { error: "Choose a valid connection and try again.", ok: false };
  const contact = normaliseContact(formData.get("contact"));
  if (!contact.ok) return { error: contact.error, ok: false };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", ok: false };

  // RLS limits this to the member's own row on a connection they belong to.
  const { error } = await supabase
    .from("connection_contacts")
    .upsert({ connection_id: connectionId, user_id: user.id, contact: contact.value });
  if (error) {
    return {
      error: error.code === "42501"
        ? "This connection is not available for sharing contact details."
        : "We couldn't save your contact detail right now. Please try again.",
      ok: false,
    };
  }
  revalidatePath("/requests");
  return { error: null, ok: true };
}

/** Removes the signed-in member's shared contact detail from a connection. */
export async function removeConnectionContact(
  _prev: JourneyActionState,
  formData: FormData,
): Promise<JourneyActionState> {
  const connectionId = String(formData.get("connection_id") ?? "").trim();
  if (!isValidUuid(connectionId)) return { error: "Choose a valid connection and try again.", ok: false };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", ok: false };

  const { error } = await supabase
    .from("connection_contacts")
    .delete()
    .eq("connection_id", connectionId)
    .eq("user_id", user.id);
  if (error) return { error: "We couldn't remove your contact detail right now. Please try again.", ok: false };
  revalidatePath("/requests");
  return { error: null, ok: true };
}

/** Records (or undoes) that the first conversation has happened. */
export async function setFirstConversation(
  _prev: JourneyActionState,
  formData: FormData,
): Promise<JourneyActionState> {
  const connectionId = String(formData.get("connection_id") ?? "").trim();
  if (!isValidUuid(connectionId)) return { error: "Choose a valid connection and try again.", ok: false };
  const held = formData.get("held") === "true";

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_first_conversation", {
    p_connection_id: connectionId,
    p_held: held,
  });
  if (error) {
    return {
      error: error.code === "42501"
        ? "This connection is not available right now."
        : "We couldn't update the conversation status. Please try again.",
      ok: false,
    };
  }
  revalidatePath("/requests");
  return { error: null, ok: true };
}
