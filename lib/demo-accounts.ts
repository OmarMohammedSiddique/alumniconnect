import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type DemoAccount,
  isDemoRole,
  isDemoSwitcherEnabled,
  isFictionalDemoUser,
  sortDemoAccounts,
} from "@/lib/demo-switcher";

export function demoSwitcherEnabled(): boolean {
  return isDemoSwitcherEnabled(process.env.DEMO_SWITCHER_ENABLED);
}

/**
 * Lists the fictional demo accounts a presenter can switch into. Returns an
 * empty list when the switcher is off, so callers can render nothing.
 */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  if (!demoSwitcherEnabled()) return [];
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
