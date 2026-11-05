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

  const result = handleResendWebhookEvent(id!, verification.event);

  return NextResponse.json({
    received: true,
    eventType: result.event,
    emailId: result.emailId,
    duplicate: result.duplicate,
  });
}
