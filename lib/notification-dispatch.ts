import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processNotificationEmails } from "@/lib/notification-worker";

// Opportunistic immediate delivery after successful mutations. The durable
// queue and authenticated worker endpoint recover failures independently.
export function dispatchNotificationEmails() {
  after(async () => {
    try {
      await processNotificationEmails(createAdminClient(), process.env.SITE_URL ?? "");
    } catch {
      console.error("Notification dispatch deferred; worker retry required.");
    }
  });
}
