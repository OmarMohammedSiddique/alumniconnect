import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "./dashboard-navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <DashboardNavigation name={profile?.full_name ?? "Your account"} role={profile?.role ?? ""} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}
