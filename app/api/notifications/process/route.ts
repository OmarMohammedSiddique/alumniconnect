import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { processNotificationEmails } from "@/lib/notification-worker";

export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_WORKER_SECRET;
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(provided) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await processNotificationEmails(createAdminClient(), process.env.SITE_URL ?? "", { scheduleReminders: true });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Email processing unavailable. Retry later." }, { status: 503 });
  }
}
