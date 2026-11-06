import { createHash } from "node:crypto";
import { escapeHtml, renderEmailLayout, type ApplicationEmailPayload } from "./email-delivery";

export type NotificationKind = "request_received" | "connection_accepted" | "request_declined" | "matches_ready" | "request_reminder";
export interface EmailEvent {
  id: string;
  event_key: string;
  kind: NotificationKind;
  recipient_id: string;
  attempts: number;
  created_at: string;
}

export function emailHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function notificationOrigin(value: string | undefined): string {
  const url = new URL(value ?? "");
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("Invalid notification site origin");
  }
  return url.origin;
}

const COPY = {
  request_received: ["You have a new mentorship request", "A member has requested your guidance. Sign in to review their introduction and respond.", "/requests", "Review request"],
  connection_accepted: ["Your mentorship connection is ready", "A mentorship request has been accepted. Sign in to view your connection and plan your first conversation.", "/requests#connections", "View connection"],
  request_declined: ["Your mentorship request has an update", "Your mentorship request was declined. You can explore other Mentors when you are ready.", "/requests", "View requests"],
  matches_ready: ["Your mentor recommendations are ready", "Your updated profile has mentor recommendations to explore. Recommendations are suggestions; a connection starts only when a Mentor accepts your request.", "/discover", "Explore recommendations"],
  request_reminder: ["A mentorship request is waiting for your response", "You opted in to pending-request reminders. A mentorship request is still awaiting your response. Sign in to review it when you are ready. You receive at most one reminder per week.", "/requests", "Review pending requests"],
} as const;

export function buildNotificationEmail(event: EmailEvent, to: string, siteOrigin: string): ApplicationEmailPayload {
  const origin = notificationOrigin(siteOrigin);
  const [title, body, path, actionText] = COPY[event.kind];
  const settings = `${origin}/profile/email-preferences`;
  const rendered = renderEmailLayout({
    title,
    bodyText: body,
    bodyHtml: `<p>${escapeHtml(body)}</p><p><a href="${escapeHtml(settings)}">Manage email preferences or unsubscribe</a></p>`,
    actionText,
    actionUrl: `${origin}${path}`,
    footerText: "Optional AlumniKonneQt activity email. Account security emails are managed separately.",
  });
  return {
    to, subject: title, ...rendered,
    // Include the URL explicitly: the shared HTML-to-text converter strips hrefs.
    text: `${title}\n\n${body}\n\n${actionText}: ${origin}${path}\n\nManage email preferences or unsubscribe: ${settings}\n\nAccount security emails are managed separately.`,
    idempotencyKey: `notification/${event.id}`,
    tags: [{ name: "category", value: event.kind }],
  };
}
