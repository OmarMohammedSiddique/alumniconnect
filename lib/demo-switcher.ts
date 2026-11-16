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
  return fullName.replace(/^Demo (Mentor|Mentee)\s*[\u2014:-]\s*/i, "").trim() || fullName;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEMO_PRESENTER_COOKIE = "ak-demo-presenter";
export const DEMO_PRESENTER_SECONDS = 12 * 60 * 60;
export const DEMO_KEY_MIN_LENGTH = 16;

/** A usable presenter key is required; a short or missing key keeps the switcher off. */
export function isUsableDemoKey(key: string | undefined): key is string {
  return typeof key === "string" && key.trim().length >= DEMO_KEY_MIN_LENGTH;
}

export const DEMO_UNAVAILABLE = "Demo accounts are not available right now.";

export interface DemoSwitchDeps {
  enabled: boolean;
  presenter: boolean;
  getCurrentUser: () => Promise<DemoAuthUser | null>;
  getUserById: (id: string) => Promise<DemoAuthUser | null>;
  getProfileRole: (id: string) => Promise<unknown>;
  /** Issues a one-time sign-in token on the server. Must only run for allowed targets. */
  issueSignInToken: (email: string) => Promise<string | null>;
  /** Exchanges the token for a session on the presenter's cookies. */
  exchangeSignInToken: (token: string) => Promise<boolean>;
}

export type DemoSwitchResult = { ok: true; alreadyCurrent: boolean } | { ok: false; error: string };

/**
 * The full server-side decision for a demo switch (#106). Every check runs
 * before a sign-in token is issued; tests assert the order.
 */
export async function runDemoSwitch(deps: DemoSwitchDeps, targetId: string): Promise<DemoSwitchResult> {
  if (!deps.enabled || !deps.presenter) return { ok: false, error: DEMO_UNAVAILABLE };
  if (!UUID_PATTERN.test(targetId)) return { ok: false, error: "Choose a demo account." };

  const current = await deps.getCurrentUser();
  if (!canUseDemoSwitcher(current)) {
    return { ok: false, error: "Sign out of your own account before using a demo account." };
  }
  if (current?.id === targetId) return { ok: true, alreadyCurrent: true };

  const target = await deps.getUserById(targetId);
  if (!target || !isFictionalDemoUser(target)) return { ok: false, error: DEMO_UNAVAILABLE };
  if (!isDemoRole(await deps.getProfileRole(targetId))) return { ok: false, error: DEMO_UNAVAILABLE };

  const token = await deps.issueSignInToken(target.email!);
  if (!token) return { ok: false, error: DEMO_UNAVAILABLE };
  // The exchange replaces the current session cookies only when it succeeds,
  // so a failed switch leaves the presenter in their current demo account.
  if (!(await deps.exchangeSignInToken(token))) {
    return { ok: false, error: "The demo sign-in did not complete. Try again." };
  }
  return { ok: true, alreadyCurrent: false };
}
