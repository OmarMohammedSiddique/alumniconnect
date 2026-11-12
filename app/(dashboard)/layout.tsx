import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { DashboardNavigation } from "./dashboard-navigation";
import { CookieSettingsTrigger } from "@/components/cookie-settings-trigger";
import { PrototypeNotice } from "@/components/brand";
import { ClockStrip } from "@/components/nairobi-clock";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await getAuthenticatedUser();
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
      <main id="workspace" className="flex min-w-0 flex-1 flex-col">
        <ClockStrip className="bg-card" />
        <div className="flex flex-1 flex-col justify-between px-4 py-7 sm:px-6 sm:py-9 lg:px-10">
        <div className="product-page">{children}</div>
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 pb-2 text-xs text-muted-foreground">
          <nav aria-label="Dashboard footer navigation" className="flex flex-wrap items-center gap-4">
            <Link href="/about-developer" className="underline-offset-4 hover:underline">
              About Developer
            </Link>
            <Link href="/privacy" className="underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            <CookieSettingsTrigger className="underline-offset-4 hover:underline" />
          </nav>
          <PrototypeNotice className="max-w-none basis-full" />
        </footer>
        </div>
      </main>
    </div>
  );
}
