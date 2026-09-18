"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Menu } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/profile", label: "Profile" },
  { href: "/requests", label: "Requests" },
];

export function DashboardNavigation({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const items = role === "admin" || role === "moderator"
    ? [...NAV, { href: "/admin", label: "Admin" }]
    : NAV;

  const closeMenu = () => {
    if (menu.current) menu.current.open = false;
  };

  const links = (
    <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1">
      {items.map(({ href, label }) => (
        <Link key={href} href={href} onClick={closeMenu}
          aria-current={pathname === href ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${pathname === href ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="mt-4 flex flex-col gap-2 border-t pt-4">
      <div className="min-w-0 px-3">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs capitalize text-muted-foreground">{role}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" className="min-h-11 w-full justify-start px-3">Sign out</Button>
      </form>
    </div>
  );

  return (
    <>
      <header className="border-b bg-background p-4 md:hidden">
        <Link href="/discover" className="inline-flex min-h-11 items-center text-lg font-semibold" onClick={closeMenu}>AlumniConnect</Link>
        <details ref={menu} className="group" onKeyDown={(event) => {
          if (event.key === "Escape" && menu.current?.open) {
            closeMenu();
            menu.current.querySelector("summary")?.focus();
          }
        }}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden="true" className="size-5" />
            <span className="group-open:hidden">Open navigation</span>
            <span className="hidden group-open:inline">Close navigation</span>
          </summary>
          <div className="pt-2">{links}{account}</div>
        </details>
      </header>
      <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col overflow-y-auto border-r bg-background p-4 md:flex">
        <Link href="/discover" className="mb-8 px-3 text-lg font-semibold">AlumniConnect</Link>
        {links}{account}
      </aside>
    </>
  );
}
