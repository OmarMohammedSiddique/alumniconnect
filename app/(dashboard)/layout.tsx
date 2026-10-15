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
    <div className="flex min-h-svh flex-col bg-surface md:flex-row">
      <a href="#workspace" className="product-skip">Skip to workspace</a>
      <DashboardNavigation name={profile?.full_name ?? "Your account"} role={profile?.role ?? ""} />
      <main id="workspace" className="min-w-0 flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-10"><div className="product-page">{children}</div></main>
    </div>
  );
}
