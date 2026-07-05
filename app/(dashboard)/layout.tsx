import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/profile", label: "Profile" },
  { href: "/requests", label: "Requests" },
];

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

  const isStaff = profile?.role === "admin" || profile?.role === "moderator";

  return (
    <div className="flex min-h-svh">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-background p-4">
        <Link href="/discover" className="mb-8 px-2 text-lg font-semibold">
          AlumniConnect
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {isStaff && (
            <Link
              href="/admin"
              className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="flex flex-col gap-2 border-t pt-4">
          <div className="px-2">
            <p className="truncate text-sm font-medium">{profile?.full_name}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {profile?.role}
            </p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
