import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type DemoAccount,
  DEMO_PRESENTER_COOKIE,
  isDemoRole,
  isDemoSwitcherEnabled,
  isFictionalDemoUser,
  isUsableDemoKey,
  sortDemoAccounts,
} from "@/lib/demo-switcher";

/** On only when the setting is true and a long enough presenter key is configured. */
export function demoSwitcherEnabled(): boolean {
  return isDemoSwitcherEnabled(process.env.DEMO_SWITCHER_ENABLED)
    && isUsableDemoKey(process.env.DEMO_SWITCHER_KEY);
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** The value stored in the presenter cookie: a digest, never the key itself. */
export function presenterCookieValue(): string | null {
  const key = process.env.DEMO_SWITCHER_KEY;
  return isUsableDemoKey(key) ? digest(`presenter:${key}`).toString("hex") : null;
}

/** Constant-time comparison of a submitted presenter key with the configured one. */
export function matchesPresenterKey(submitted: string): boolean {
  const key = process.env.DEMO_SWITCHER_KEY;
  if (!isUsableDemoKey(key)) return false;
  return timingSafeEqual(digest(submitted), digest(key));
}

/** True when this browser has unlocked demo mode with the presenter key. */
export async function isDemoPresenter(): Promise<boolean> {
  if (!demoSwitcherEnabled()) return false;
  const expected = presenterCookieValue();
  const actual = (await cookies()).get(DEMO_PRESENTER_COOKIE)?.value;
  if (!expected || !actual || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

/**
 * Lists the fictional demo accounts a presenter can switch into. Returns an
 * empty list unless the switcher is on and this browser holds the presenter
 * cookie. Always evaluated per request, never at build time.
 */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  await connection();
  if (!(await isDemoPresenter())) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return [];
  const ids = data.users.filter(isFictionalDemoUser).map((user) => user.id);
  if (!ids.length) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role, headline")
    .in("id", ids);

  const accounts: DemoAccount[] = [];
  for (const profile of profiles ?? []) {
    if (!isDemoRole(profile.role)) continue;
    accounts.push({
      id: profile.id,
      fullName: profile.full_name ?? "Demo account",
      role: profile.role,
      headline: profile.headline ?? "",
    });
  }
  return sortDemoAccounts(accounts);
}
