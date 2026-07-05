import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setUserRole, setUserVisibility } from "./actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Admin — AlumniConnect" };

interface ProfileRow {
  id: string;
  full_name: string;
  role: string;
  is_visible: boolean;
  created_at: string;
}

interface AuditRow {
  id: number;
  action: string;
  target_table: string;
  detail: Record<string, unknown>;
  created_at: string;
}

const ROLES = ["mentee", "mentor", "moderator", "admin"] as const;

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = me?.role === "admin";
  const isStaff = isAdmin || me?.role === "moderator";
  if (!isStaff) redirect("/discover");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_visible, created_at")
    .order("created_at", { ascending: false })
    .returns<ProfileRow[]>();

  const { data: audit } = await supabase
    .from("audit_logs")
    .select("id, action, target_table, detail, created_at")
    .order("id", { ascending: false })
    .limit(50)
    .returns<AuditRow[]>();

  return (
    <div className="grid max-w-4xl gap-10">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">User management</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {isAdmin
            ? "Assign roles and moderate profile visibility."
            : "Moderate profile visibility. Role changes require an admin."}
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Visibility</th>
                <th className="px-3 py-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    {p.full_name || "(no name)"}
                    {p.id === user.id && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isAdmin && p.id !== user.id ? (
                      <form action={setUserRole} className="flex items-center gap-1.5">
                        <input type="hidden" name="user_id" value={p.id} />
                        <select
                          name="role"
                          defaultValue={p.role}
                          className="h-7 rounded-md border bg-transparent px-1.5 text-sm"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="xs" variant="outline">
                          Set
                        </Button>
                      </form>
                    ) : (
                      <span className="capitalize">{p.role}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <form action={setUserVisibility}>
                      <input type="hidden" name="user_id" value={p.id} />
                      <input
                        type="hidden"
                        name="visible"
                        value={p.is_visible ? "false" : "true"}
                      />
                      <Button type="submit" size="xs" variant="outline">
                        {p.is_visible ? "Visible — hide" : "Hidden — show"}
                      </Button>
                    </form>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Audit log</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Most recent 50 platform events, written by database triggers.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {audit?.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-3 py-2">{a.action}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {JSON.stringify(a.detail)}
                  </td>
                </tr>
              ))}
              {!audit?.length && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-muted-foreground">
                    No events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
