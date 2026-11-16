// Signs every fictional demo account out on all devices after a presentation (#106).
// Real member accounts are never touched: only users with app_metadata.fictional = true.
//
// Dry run (lists the accounts):  node --env-file=.env.local scripts/end-demo-sessions.mjs
// Revoke their sessions:         node --env-file=.env.local scripts/end-demo-sessions.mjs --apply
//
// Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY for the target project. Nothing is printed except
// account names and counts.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const apply = process.argv.includes("--apply");
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, options);

const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) throw new Error(`Could not list users (${error.status ?? "provider error"})`);
const demoUsers = data.users.filter((user) => user.app_metadata?.fictional === true && user.email);
console.log(`${demoUsers.length} fictional demo account(s) found${apply ? "" : " (dry run, add --apply to revoke)"}.`);

let revoked = 0;
for (const user of demoUsers) {
  const label = user.user_metadata?.full_name ?? user.id;
  if (!apply) {
    console.log(`would sign out: ${label}`);
    continue;
  }
  // Admin sign-out needs one of the user's own access tokens, so open a
  // short-lived server-side session first, then revoke every session with it.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
  if (linkError) throw new Error(`Could not prepare sign-out for ${label}`);
  const client = createClient(url, anonKey, options);
  const { data: verified, error: verifyError } = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError || !verified.session) throw new Error(`Could not prepare sign-out for ${label}`);
  const { error: signOutError } = await admin.auth.admin.signOut(verified.session.access_token, "global");
  if (signOutError) throw new Error(`Could not sign out ${label}`);
  revoked += 1;
  console.log(`signed out everywhere: ${label}`);
}
if (apply) console.log(`Done. ${revoked} account(s) signed out on all devices.`);
