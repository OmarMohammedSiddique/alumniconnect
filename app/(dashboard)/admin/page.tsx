import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleForm, VisibilityForm, ReportReviewForm } from "./admin-controls";
import { REPORT_REASON_LABELS } from "@/lib/profile-privacy";

export const metadata = { title: "Admin - AlumniKonneQt" };

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

interface ReportRow {
  id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_id: string;
  reporter: { full_name: string } | null;
  reported: {
    full_name: string;
    role: string;
    is_visible: boolean;
    staff_hidden: boolean;
  } | null;
}

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

  const { data: reports } = await supabase
    .from("reports")
    .select(
      `id, reason, details, status, created_at, reporter_id, reported_id,
       reporter:profiles!reports_reporter_id_fkey(full_name),
       reported:profiles!reports_reported_id_fkey(full_name, role, is_visible, staff_hidden)`
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .returns<ReportRow[]>();

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
              <tr className="border-b bg-muted text-left">
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
                      <RoleForm userId={p.id} name={p.full_name || "this user"} role={p.role} />
                    ) : (
                      <span className="capitalize">{p.role}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <VisibilityForm userId={p.id} name={p.full_name || "this user"} visible={p.is_visible} />
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
        <h2 className="mb-1 text-xl font-semibold">Safety & Member Reports</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Pending member reports requiring moderation review.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted text-left">
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Reported Member</th>
                <th className="px-3 py-2 font-medium">Reporter</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium">Context</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports?.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground text-xs">
                    {new Date(r.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">
                      {r.reported?.full_name || "Unknown"}
                    </span>
                    {r.reported?.role && (
                      <span className="ml-1.5 text-xs text-muted-foreground capitalize">
                        ({r.reported.role})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.reporter?.full_name || "Confidential Member"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                      {REPORT_REASON_LABELS[
                        r.reason as keyof typeof REPORT_REASON_LABELS
                      ] || r.reason}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs break-words">
                    {r.details || "(No additional notes provided)"}
                  </td>
                  <td className="px-3 py-2">
                    <ReportReviewForm
                      reportId={r.id}
                      reportedName={r.reported?.full_name || "this member"}
                    />
                  </td>
                </tr>
              ))}
              {!reports?.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-muted-foreground">
                    No pending safety reports. Community queue is clean.
                  </td>
                </tr>
              )}
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
              <tr className="border-b bg-muted text-left">
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
