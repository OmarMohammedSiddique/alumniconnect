// Rules for the presenter's demo account switcher (#106). Kept free of server
// imports so the decisions can be unit tested; the server action enforces them.

export interface DemoAuthUser {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
}

export interface DemoAccount {
  id: string;
  fullName: string;
  role: "mentee" | "mentor";
  headline: string;
}

const DEMO_ROLES = new Set(["mentee", "mentor"]);

/** The switcher only exists when the server explicitly turns it on. */
export function isDemoSwitcherEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Only accounts created as fictional fixtures can be reached. The marker lives
 * in app_metadata, which members cannot edit themselves.
 */
export function isFictionalDemoUser(user: DemoAuthUser | null | undefined): boolean {
  return Boolean(user?.email) && user?.app_metadata?.fictional === true;
}

/**
 * A visitor who is signed out, or already inside a demo account, may switch.
 * A real member is never signed out of their own account by the switcher.
 */
export function canUseDemoSwitcher(current: DemoAuthUser | null | undefined): boolean {
  return !current || isFictionalDemoUser(current);
}

export function isDemoRole(role: unknown): role is DemoAccount["role"] {
  return typeof role === "string" && DEMO_ROLES.has(role);
}

/** Mentees first (the usual starting point of a demo), then Mentors by name. */
export function sortDemoAccounts(accounts: DemoAccount[]): DemoAccount[] {
  return [...accounts].sort((a, b) =>
    a.role === b.role ? a.fullName.localeCompare(b.fullName) : a.role === "mentee" ? -1 : 1,
  );
}

/** Hosted fixtures carry a "Demo Mentor: " style prefix; show the person's name. */
export function demoDisplayName(fullName: string): string {
  return fullName.replace(/^Demo (Mentor|Mentee)\s*[—:-]\s*/i, "").trim() || fullName;
}
