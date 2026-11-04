export interface KickstarterOptions {
  isMentor: boolean;
  partnerName: string;
  partnerIndustry?: string;
}

/**
 * Generates an actionable, professional introductory message template
 * tailored to the participant's mentorship role and connection context.
 */
export function buildKickstarterMessage({
  isMentor,
  partnerName,
  partnerIndustry,
}: KickstarterOptions): string {
  const name = partnerName?.trim() || "there";
  const industryContext = partnerIndustry?.trim()
    ? ` your journey in ${partnerIndustry.trim()}`
    : " your career and professional goals";

  if (isMentor) {
    return (
      `Hi ${name},\n\n` +
      `It's great to connect with you on AlumniConnect! I'm looking forward to supporting${industryContext}.\n\n` +
      `Let me know what you'd most like to focus on and what times typically work best for a 20–30 minute introductory call.`
    );
  }

  return (
    `Hi ${name},\n\n` +
    `Thank you for connecting with me on AlumniConnect! I'm really looking forward to learning from your experience in${industryContext}.\n\n` +
    `Would you be open to a brief 20–30 minute introductory conversation in the coming week or two? I can be flexible around your schedule.`
  );
}
