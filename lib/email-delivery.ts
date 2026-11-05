// Server-side application email delivery boundary for AlumniKonneQt.
// Provides safe template rendering, destination isolation, idempotency,
// bounded timeouts, and error handling for transactional application emails (#34, #33).

export interface ApplicationEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  idempotencyKey?: string;
  tags?: Array<{ name: string; value: string }>;
}

export type DeliveryResult =
  | { success: true; messageId: string; status: "queued" | "mocked" }
  | {
      success: false;
      error: string;
      code: "INVALID_RECIPIENT" | "DESTINATION_BLOCKED" | "RATE_LIMITED" | "TIMEOUT" | "PROVIDER_ERROR";
      retryable: boolean;
    };

export interface DeliveryOptions {
  apiKey?: string;
  endpoint?: string;
  deliveryMode?: "live" | "mock" | "suppress";
  allowedDomains?: string[];
  allowedRecipients?: string[];
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
}

export const DEFAULT_FROM_ADDRESS = "AlumniKonneQt <notifications@auth.alumnikonneqt.com>";
export const DEFAULT_TIMEOUT_MS = 8000;
export const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

// In-memory mock delivery sink for testing and local development
const mockSentEmails: Array<ApplicationEmailPayload & { timestamp: number; messageId: string }> = [];

export function getMockSentEmails(): ReadonlyArray<ApplicationEmailPayload & { timestamp: number; messageId: string }> {
  return [...mockSentEmails];
}

export function clearMockSentEmails(): void {
  mockSentEmails.length = 0;
}

/**
 * Escapes characters with special meaning in HTML to prevent XSS / markup injection.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Normalizes and validates an email address.
 */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/**
 * Checks if a recipient is permitted to receive mail given the current environment controls.
 * In non-production environments, prevents accidental sends to real members.
 */
export function isRecipientPermitted(
  email: string,
  options: {
    deliveryMode?: "live" | "mock" | "suppress";
    allowedDomains?: string[];
    allowedRecipients?: string[];
    isProduction?: boolean;
  } = {}
): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const isProd = options.isProduction ?? (process.env.NODE_ENV === "production" &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production"));

  // In production, all syntactically valid emails are permitted
  if (isProd) return true;

  // In test / non-production, check destination controls
  const allowedRecipients = options.allowedRecipients ??
    (process.env.EMAIL_ALLOWED_RECIPIENTS ? process.env.EMAIL_ALLOWED_RECIPIENTS.split(",").map(s => s.trim().toLowerCase()) : []);
  
  if (allowedRecipients.length > 0 && allowedRecipients.includes(normalized)) {
    return true;
  }

  const allowedDomains = options.allowedDomains ??
    (process.env.EMAIL_ALLOWED_DOMAINS ? process.env.EMAIL_ALLOWED_DOMAINS.split(",").map(s => s.trim().toLowerCase()) : ["example.com", "example.test", "test.local", "auth.alumnikonneqt.com"]);

  const domain = normalized.split("@")[1];
  return allowedDomains.includes(domain);
}

/**
 * Renders a standard application email with branded layout and accessibility.
 */
export function renderEmailLayout({
  title,
  preheader,
  bodyHtml,
  bodyText,
  actionText,
  actionUrl,
  footerText = "You are receiving this message regarding your AlumniKonneQt account activity.",
}: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  bodyText?: string;
  actionText?: string;
  actionUrl?: string;
  footerText?: string;
}): { html: string; text: string } {
  const safeTitle = escapeHtml(title);
  const safePreheader = preheader ? escapeHtml(preheader) : "";
  const safeFooter = escapeHtml(footerText);

  const actionButtonHtml = actionText && actionUrl
    ? `
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0;">
        <tr>
          <td align="center" style="border-radius: 6px; background-color: #0f172a;">
            <a href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer" style="font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; font-weight: 500;">
              ${escapeHtml(actionText)}
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  ${safePreheader ? `<span style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">${safePreheader}</span>` : ""}
  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 32px; text-align: left;">
          <tr>
            <td style="font-size: 20px; font-weight: 600; color: #0f172a; padding-bottom: 16px;">
              ${safeTitle}
            </td>
          </tr>
          <tr>
            <td style="font-size: 15px; color: #334155; padding-bottom: 16px;">
              ${bodyHtml}
            </td>
          </tr>
          ${actionButtonHtml ? `<tr><td>${actionButtonHtml}</td></tr>` : ""}
          <tr>
            <td style="border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.4;">
              ${safeFooter}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Generate plain text equivalent
  let text = `${title}\n\n`;
  if (preheader) text += `${preheader}\n\n`;
  // Plain text is supplied explicitly; HTML stripping is not sanitization.
  text += `${bodyText ?? "Sign in to view your account activity."}\n\n`;
  if (actionText && actionUrl) text += `${actionText}: ${actionUrl}\n\n`;
  text += `---\n${footerText}\n`;

  return { html, text };
}

/**
 * Sends an application email through Resend REST API or the local mock sink.
 * Respects destination controls, bounds timeouts, handles retries, and returns structured outcome.
 */
export async function sendApplicationEmail(
  payload: ApplicationEmailPayload,
  options: DeliveryOptions = {}
): Promise<DeliveryResult> {
  const normalizedTo = normalizeEmail(payload.to);
  if (!normalizedTo) {
    return {
      success: false,
      error: "Invalid recipient email address format",
      code: "INVALID_RECIPIENT",
      retryable: false,
    };
  }

  // Determine delivery mode
  const mode = options.deliveryMode ??
    (process.env.EMAIL_DELIVERY_MODE as "live" | "mock" | "suppress") ??
    (process.env.NODE_ENV === "test" ? "mock" : "live");

  // Destination check
  const isPermitted = isRecipientPermitted(normalizedTo, {
    deliveryMode: mode,
    allowedDomains: options.allowedDomains,
    allowedRecipients: options.allowedRecipients,
  });

  if (!isPermitted) {
    return {
      success: false,
      error: `Recipient ${normalizedTo} is not in the allowed destination list for this environment`,
      code: "DESTINATION_BLOCKED",
      retryable: false,
    };
  }

  // If in mock or suppress mode
  if (mode === "suppress") {
    return { success: true, messageId: `suppressed_${Date.now()}`, status: "mocked" };
  }

  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;

  if (mode === "mock" || !apiKey) {
    const mockId = `mock_${Math.random().toString(36).slice(2, 11)}`;
    mockSentEmails.push({
      ...payload,
      to: normalizedTo,
      timestamp: Date.now(),
      messageId: mockId,
    });
    return { success: true, messageId: mockId, status: "mocked" };
  }

  // Live send via Resend API
  const endpoint = options.endpoint ?? RESEND_EMAILS_ENDPOINT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 1;
  const fetcher = options.fetchFn ?? fetch;

  const bodyData: Record<string, unknown> = {
    from: payload.from ?? process.env.EMAIL_FROM ?? DEFAULT_FROM_ADDRESS,
    to: [normalizedTo],
    subject: payload.subject,
    html: payload.html,
  };

  if (payload.text) bodyData.text = payload.text;
  if (payload.replyTo) bodyData.reply_to = payload.replyTo;
  if (payload.tags && payload.tags.length > 0) bodyData.tags = payload.tags;

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (payload.idempotencyKey) {
    headers["Idempotency-Key"] = payload.idempotencyKey;
  }

  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyData),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = (await response.json()) as { id?: string };
        return {
          success: true,
          messageId: data.id ?? `resend_${Date.now()}`,
          status: "queued",
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "Resend email delivery rate limit exceeded",
          code: "RATE_LIMITED",
          retryable: true,
        };
      }

      const errorText = await response.text().catch(() => "Unknown error");
      const is5xx = response.status >= 500 && response.status < 600;

      if (is5xx && attempt <= maxRetries) {
        // Backoff slightly and retry once
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }

      return {
        success: false,
        error: `Provider error (${response.status}): ${errorText.slice(0, 150)}`,
        code: "PROVIDER_ERROR",
        retryable: is5xx,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === "AbortError";

      if (isAbort) {
        return {
          success: false,
          error: `Email delivery request timed out after ${timeoutMs}ms`,
          code: "TIMEOUT",
          retryable: true,
        };
      }

      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }

      return {
        success: false,
        error: err instanceof Error ? err.message : "Transport error contacting email provider",
        code: "PROVIDER_ERROR",
        retryable: true,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    success: false,
    error: "Maximum retries exceeded",
    code: "PROVIDER_ERROR",
    retryable: false,
  };
}
