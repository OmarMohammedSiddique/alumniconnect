// The mentorship journey both people see on a request or connection (#107).
// Pure functions so the stage rules and guidance are unit tested.

export type JourneyStageKey = "requested" | "accepted" | "contact" | "conversation" | "ongoing";
export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled";
export type JourneyViewer = "mentee" | "mentor";

export const JOURNEY_STAGES: { key: JourneyStageKey; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "accepted", label: "Accepted" },
  { key: "contact", label: "Contact shared" },
  { key: "conversation", label: "First conversation" },
  { key: "ongoing", label: "Ongoing mentorship" },
];

export interface JourneyInput {
  requestStatus: RequestStatus;
  myContact?: string | null;
  partnerContact?: string | null;
  firstConversationAt?: string | null;
}

export interface JourneyProgress {
  /** The stage that needs attention now, or null when the request ended. */
  current: JourneyStageKey | null;
  completed: JourneyStageKey[];
  ended: "declined" | "cancelled" | null;
}

export function getJourneyProgress(input: JourneyInput): JourneyProgress {
  if (input.requestStatus === "declined" || input.requestStatus === "cancelled") {
    return { current: null, completed: ["requested"], ended: input.requestStatus };
  }
  if (input.requestStatus === "pending") {
    return { current: "requested", completed: [], ended: null };
  }
  const completed: JourneyStageKey[] = ["requested", "accepted"];
  const contactShared = Boolean(input.myContact || input.partnerContact);
  if (input.firstConversationAt) {
    // Holding the first conversation implies the two people found a way to talk.
    completed.push("contact", "conversation");
    return { current: "ongoing", completed, ended: null };
  }
  if (contactShared) {
    completed.push("contact");
    return { current: "conversation", completed, ended: null };
  }
  return { current: "contact", completed, ended: null };
}

export interface NextStep {
  title: string;
  body: string;
}

interface NextStepInput extends JourneyInput {
  viewer: JourneyViewer;
  partnerName: string;
}

export function getNextStep(input: NextStepInput): NextStep {
  const name = input.partnerName.trim() || (input.viewer === "mentee" ? "your Mentor" : "your Mentee");
  const { current, ended } = getJourneyProgress(input);

  if (ended === "declined") {
    return input.viewer === "mentee"
      ? { title: "Not this time", body: `${name} is not able to take on this request. Their decision is final for this request, so try another Mentor from Discover.` }
      : { title: "You declined this request", body: `${name} has been told, so they can approach another Mentor.` };
  }
  if (ended === "cancelled") {
    return input.viewer === "mentee"
      ? { title: "You withdrew this request", body: `${name} will not see it any more. You can send a new request later if you change your mind.` }
      : { title: "Request withdrawn", body: `${name} withdrew this request. No action is needed.` };
  }

  switch (current) {
    case "requested":
      return input.viewer === "mentee"
        ? { title: `Waiting for ${name} to respond`, body: `${name} can accept or decline your introduction. If they accept, a connection appears below for both of you with the next steps. You can cancel while the request is pending.` }
        : { title: "Your response is needed", body: `Accept to start a connection with ${name}. You will both then be able to share contact details and arrange a first conversation. If you decline, ${name} is told so they can approach someone else.` };
    case "contact":
      return { title: "Share how to reach you", body: `Add an email address or a meeting link below. ${name} sees it here, and you will see theirs when they share it. Nothing is shared until you add it.` };
    case "conversation":
      if (input.partnerContact) {
        return input.viewer === "mentee"
          ? { title: "Arrange your first conversation", body: `${name} has shared how to reach them. Get in touch and suggest two or three times for a 20 to 30 minute call. Once it has happened, mark it as held.` }
          : { title: "Arrange your first conversation", body: `${name} has shared how to reach them. Mentees usually make the first move, but you are welcome to reach out and offer some times. Once it has happened, mark it as held.` };
      }
      return { title: `Waiting for ${name}`, body: `You have shared how to reach you, so ${name} can now get in touch to arrange a first conversation. Once it has happened, either of you can mark it as held.` };
    case "ongoing":
      return { title: "Your mentorship is under way", body: "Agree a few goals together and a rhythm that suits you both, such as a monthly call. You can update your contact details here at any time." };
    default:
      return { title: "Connected", body: `You and ${name} are connected.` };
  }
}

export const CONTACT_MIN = 3;
export const CONTACT_MAX = 200;

/** Trims a shared contact and rejects empty, oversized or control-character input. */
export function normaliseContact(value: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < CONTACT_MIN) return { ok: false, error: "Enter an email address, phone number or meeting link." };
  if (text.length > CONTACT_MAX) return { ok: false, error: `Keep the contact detail to ${CONTACT_MAX} characters or fewer.` };
  if (/[\u0000-\u001f\u007f]/.test(text)) return { ok: false, error: "Remove line breaks or hidden characters from the contact detail." };
  return { ok: true, value: text };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A safe link for a shared contact: mailto for emails, https links as given, otherwise none. */
export function contactHref(contact: string | null | undefined): string | null {
  const text = contact?.trim();
  if (!text) return null;
  if (EMAIL.test(text)) return `mailto:${text}`;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
