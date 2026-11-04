export interface KickstarterOptions {
  isMentor: boolean;
  partnerName: string;
  partnerIndustry?: string;
  preferredContact?: string;
}

/**
 * Generates an actionable, professional introductory message template
 * tailored to the participant's mentorship role, connection context,
 * and explicit opt-in contact details.
 */
export function buildKickstarterMessage({
  isMentor,
  partnerName,
  partnerIndustry,
  preferredContact,
}: KickstarterOptions): string {
  const name = partnerName?.trim() || "there";
  const industryContext = partnerIndustry?.trim()
    ? ` your journey in ${partnerIndustry.trim()}`
    : " your career and professional goals";
  const contactLine = preferredContact?.trim()
    ? `\n\nYou can reach me directly at: ${preferredContact.trim()}`
    : "";

  if (isMentor) {
    return (
      `Hi ${name},\n\n` +
      `It's great to connect with you on AlumniKonneQt! I'm looking forward to supporting${industryContext}.\n\n` +
      `Let me know what you'd most like to focus on and what times typically work best for a 20–30 minute introductory call.` +
      contactLine
    );
  }

  return (
    `Hi ${name},\n\n` +
    `Thank you for connecting with me on AlumniKonneQt! I'm really looking forward to learning from your experience in${industryContext}.\n\n` +
    `Would you be open to a brief 20–30 minute introductory conversation in the coming week or two? I can be flexible around your schedule.` +
    contactLine
  );
}

/**
 * Builds a safe mailto: URI with pre-filled subject and starter body so the user
 * can launch their email client directly when arranging their first conversation.
 */
export function buildKickstarterMailto(options: KickstarterOptions): string {
  const partner = options.partnerName?.trim() || "Mentorship Connection";
  const subject = `AlumniKonneQt Mentorship Introduction — ${partner}`;
  const body = buildKickstarterMessage(options);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
