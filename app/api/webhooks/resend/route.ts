import { createAdminClient } from "@/lib/supabase/admin";
import { emailHash } from "@/lib/notification-email";
import { NextResponse } from "next/server";
import { verifyResendWebhook, handleResendWebhookEvent } from "@/lib/email-webhook";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret is not configured" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  const verification = verifyResendWebhook({
    rawBody,
    headers: { id, timestamp, signature },
    secret,
  });

  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.reason },
      { status: verification.status }
    );
  }

  // Persist suppression before acknowledging, so retries and other instances
  // retain it. Verified bounce/complaint events are monotonic and idempotent.
  if (["email.bounced", "email.complained"].includes(verification.event.type)) {
    const recipients = verification.event.data.to;
    if (!Array.isArray(recipients) || !recipients.every(to => typeof to === "string")) {
      return NextResponse.json({ error: "Invalid recipients" }, { status: 400 });
    }
    try {
      const hashes = [...new Set(recipients.map(emailHash))];
      if (hashes.length) {
        const { error } = await createAdminClient().from("email_suppressions")
          .upsert(hashes.map(email_hash => ({ email_hash })), { onConflict: "email_hash", ignoreDuplicates: true });
        if (error) throw error;
      }
    } catch {
      return NextResponse.json({ error: "Suppression persistence unavailable" }, { status: 503 });
    }
  }

  const result = handleResendWebhookEvent(id!, verification.event);

  return NextResponse.json({
    received: true,
    eventType: result.event,
    emailId: result.emailId,
    duplicate: result.duplicate,
  });
}
