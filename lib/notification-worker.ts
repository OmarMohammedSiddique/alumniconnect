import type { SupabaseClient } from "@supabase/supabase-js";
import { sendApplicationEmail, type DeliveryOptions } from "./email-delivery";
import { buildNotificationEmail, emailHash, notificationOrigin, type EmailEvent } from "./notification-email";

export async function processNotificationEmails(
  admin: SupabaseClient,
  siteUrl: string,
  options: DeliveryOptions = {},
): Promise<{ processed: number }> {
  const origin = notificationOrigin(siteUrl); // Fail before claiming any events.
  const mode = options.deliveryMode ?? process.env.EMAIL_DELIVERY_MODE ?? "live";
  if (!["live", "mock", "suppress"].includes(mode)) throw new Error("Invalid email delivery mode");
  if (mode === "live" && !(options.apiKey ?? process.env.RESEND_API_KEY)) {
    throw new Error("Application email delivery is not configured");
  }
  // Clean expired/exhausted leases rather than leaving them processing forever.
  const { error: cleanupError } = await admin.from("email_outbox")
    .update({ status: "failed", last_error: "RETRY_WINDOW_EXHAUSTED" })
    .in("status", ["pending", "processing"])
    .lt("available_at", new Date().toISOString())
    .lt("created_at", new Date(Date.now() - 20 * 3600_000).toISOString());
  if (cleanupError) throw new Error("Could not expire email events");
  const { error: exhaustedError } = await admin.from("email_outbox")
    .update({ status: "failed", last_error: "ATTEMPTS_EXHAUSTED" })
    .in("status", ["pending", "processing"]).gte("attempts", 5)
    .lt("available_at", new Date().toISOString());
  if (exhaustedError) throw new Error("Could not expire email attempts");
  const { data, error } = await admin.rpc("claim_email_events");
  if (error) throw new Error("Could not claim email events");
  const events = (data ?? []) as EmailEvent[];
  for (const event of events) {
    let update: Record<string, unknown>;
    try {
      const { data: eligible, error: eligibilityError } = await admin.rpc("email_event_is_eligible", { p_event_id: event.id });
      if (eligibilityError) throw new Error("Eligibility unavailable");
      if (!eligible) {
        update = { status: "skipped", last_error: "INELIGIBLE" };
      } else {
        const { data: { user }, error: userError } = await admin.auth.admin.getUserById(event.recipient_id);
        if (userError) throw new Error("Recipient lookup unavailable");
        if (!user?.email || !user.email_confirmed_at || user.banned_until && Date.parse(user.banned_until) > Date.now()) {
          update = { status: "skipped", last_error: "RECIPIENT_UNAVAILABLE" };
        } else {
          const { data: suppressed, error: suppressionError } = await admin.from("email_suppressions")
            .select("email_hash").eq("email_hash", emailHash(user.email)).maybeSingle();
          if (suppressionError) throw new Error("Suppression lookup unavailable");
          if (suppressed) {
            update = { status: "skipped", last_error: "SUPPRESSED" };
          } else {
            const result = await sendApplicationEmail(buildNotificationEmail(event, user.email, origin), { timeoutMs: 4000, maxRetries: 0, ...options });
            if (result.success) {
              update = { status: result.status === "queued" ? "sent" : "skipped", provider_id: result.messageId, last_error: result.status === "queued" ? null : "MOCKED_OR_SUPPRESSED" };
            } else {
              update = { status: result.retryable && event.attempts < 5 ? "pending" : "failed", last_error: result.code };
            }
          }
        }
      }
    } catch {
      update = { status: event.attempts < 5 ? "pending" : "failed", last_error: "PROCESSING_ERROR" };
    }
    if (update.status === "pending") {
      update.available_at = new Date(Date.now() + Math.min(60 * 2 ** event.attempts, 3600) * 1000).toISOString();
    }
    // Lease token prevents a late worker overwriting a newer claimant's result.
    const { error: saveError } = await admin.from("email_outbox").update(update)
      .eq("id", event.id).eq("status", "processing").eq("attempts", event.attempts);
    if (saveError) throw new Error("Could not record email outcome");
  }
  return { processed: events.length };
}
