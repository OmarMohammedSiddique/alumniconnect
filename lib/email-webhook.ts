// Resend webhook signature verification and delivery event processor (#34).
// Implements standard Svix HMAC-SHA256 signature verification, replay protection,
// event deduplication, and suppression handling for bounce/complaint events.

import crypto from "node:crypto";

export type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.complained"
  | "email.bounced"
  | "email.opened"
  | "email.clicked";

export interface ResendWebhookEvent {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    subject?: string;
    created_at?: string;
    bounce?: {
      type?: "hard" | "soft" | string;
      message?: string;
    };
  };
}

export interface WebhookVerificationHeaders {
  id?: string | null;
  timestamp?: string | null;
  signature?: string | null;
}

export type WebhookVerificationResult =
  | { valid: true; event: ResendWebhookEvent }
  | { valid: false; reason: string; status: 400 | 401 };

export const MAX_WEBHOOK_AGE_SECONDS = 300; // 5 minutes tolerance against replay attacks

// Bounded in-memory store for recently processed webhook event IDs to prevent duplicate processing
const processedEventIds = new Map<string, number>();
const MAX_PROCESSED_EVENTS = 1000;
const EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory bounce/suppression tracking
const suppressedRecipients = new Set<string>();

export function getSuppressedRecipients(): ReadonlySet<string> {
  return new Set(suppressedRecipients);
}

export function isRecipientSuppressed(email: string): boolean {
  return suppressedRecipients.has(email.trim().toLowerCase());
}

export function clearSuppressedRecipients(): void {
  suppressedRecipients.clear();
}

export function clearProcessedEventIds(): void {
  processedEventIds.clear();
}

/**
 * Normalizes the webhook secret.
 * Svix/Resend secrets typically have a "whsec_" prefix followed by base64-encoded secret key.
 */
export function parseWebhookSecret(rawSecret: string): Buffer {
  const secret = rawSecret.trim();
  if (secret.startsWith("whsec_")) {
    return Buffer.from(secret.slice(6), "base64");
  }
  return Buffer.from(secret, "utf-8");
}

/**
 * Verifies the incoming Resend/Svix webhook request headers and raw payload.
 */
export function verifyResendWebhook({
  rawBody,
  headers,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = MAX_WEBHOOK_AGE_SECONDS,
}: {
  rawBody: string;
  headers: WebhookVerificationHeaders;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): WebhookVerificationResult {
  const { id, timestamp, signature } = headers;

  if (!id || typeof id !== "string") {
    return { valid: false, reason: "Missing or invalid svix-id header", status: 400 };
  }
  if (!timestamp || typeof timestamp !== "string") {
    return { valid: false, reason: "Missing or invalid svix-timestamp header", status: 400 };
  }
  if (!signature || typeof signature !== "string") {
    return { valid: false, reason: "Missing or invalid svix-signature header", status: 401 };
  }

  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return { valid: false, reason: "svix-timestamp is not a valid number", status: 400 };
  }

  // Reject replay attacks and expired timestamps
  if (Math.abs(nowSeconds - timestampNum) > toleranceSeconds) {
    return { valid: false, reason: "Webhook timestamp expired or in the future", status: 401 };
  }

  let secretKey: Buffer;
  try {
    secretKey = parseWebhookSecret(secret);
  } catch {
    return { valid: false, reason: "Invalid webhook secret configuration", status: 401 };
  }

  // Content to sign: ${id}.${timestamp}.${rawBody}
  const toSign = `${id}.${timestamp}.${rawBody}`;
  const computedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(toSign)
    .digest("base64");

  // svix-signature may contain multiple space-separated versions: "v1,signature1 v1,signature2"
  const providedSignatures = signature
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3));

  if (providedSignatures.length === 0) {
    return { valid: false, reason: "No v1 signature scheme found in svix-signature", status: 401 };
  }

  const computedBuffer = Buffer.from(computedSignature, "utf-8");
  let matches = false;

  for (const provided of providedSignatures) {
    const providedBuffer = Buffer.from(provided, "utf-8");
    if (
      computedBuffer.length === providedBuffer.length &&
      crypto.timingSafeEqual(computedBuffer, providedBuffer)
    ) {
      matches = true;
      break;
    }
  }

  if (!matches) {
    return { valid: false, reason: "Webhook signature mismatch", status: 401 };
  }

  // Parse JSON event payload
  try {
    const event = JSON.parse(rawBody) as ResendWebhookEvent;
    if (!event || typeof event.type !== "string" || !event.data) {
      return { valid: false, reason: "Invalid webhook JSON structure", status: 400 };
    }
    return { valid: true, event };
  } catch {
    return { valid: false, reason: "Malformed JSON payload", status: 400 };
  }
}

/**
 * Handles a verified Resend webhook event:
 * - Checks for deduplication
 * - Handles bounces and spam complaints (marking suppression)
 * - Returns handling summary
 */
export function handleResendWebhookEvent(
  id: string,
  event: ResendWebhookEvent
): {
  processed: boolean;
  duplicate: boolean;
  event: ResendEventType;
  emailId: string;
  suppressed?: boolean;
} {
  const now = Date.now();

  // Deduplication check
  if (processedEventIds.has(id)) {
    return {
      processed: true,
      duplicate: true,
      event: event.type,
      emailId: event.data.email_id,
    };
  }

  // Cleanup old processed events if map grows large
  if (processedEventIds.size >= MAX_PROCESSED_EVENTS) {
    for (const [key, time] of processedEventIds.entries()) {
      if (now - time > EVENT_TTL_MS) {
        processedEventIds.delete(key);
      }
    }
  }

  processedEventIds.set(id, now);

  let suppressed = false;

  // Handle bounce or complaint suppression
  if (event.type === "email.bounced" || event.type === "email.complained") {
    const recipients = event.data.to ?? [];
    for (const recipient of recipients) {
      const normalized = recipient.trim().toLowerCase();
      if (normalized) {
        suppressedRecipients.add(normalized);
        suppressed = true;
      }
    }
  }

  return {
    processed: true,
    duplicate: false,
    event: event.type,
    emailId: event.data.email_id,
    suppressed,
  };
}
