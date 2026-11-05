"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Compass, House, Inbox, LogOut, Menu, ShieldCheck, UserRound } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { clearAllProfileDrafts } from "@/lib/profile-draft";
import { Button } from "@/components/ui/button";
import { Brand, PrototypeNotice } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/discover", label: "Discover Mentors", icon: Compass },
  { href: "/profile", label: "Your profile", icon: UserRound },
  { href: "/requests", label: "Requests & connections", icon: Inbox },
];

export function DashboardNavigation({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const items = role === "admin" || role === "moderator"
    ? [...NAV, { href: "/admin", label: "Administration", icon: ShieldCheck }]
    : NAV;

  const closeMenu = () => {
    if (menu.current) menu.current.open = false;
  };

  const links = (
    <nav aria-label="Workspace" className="flex flex-1 flex-col gap-1.5">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={closeMenu}
          aria-current={pathname === href ? "page" : undefined}
          className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-(--motion-fast) ease-(--ease-out) ${pathname === href ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="mt-6 grid gap-3 border-t pt-5">
      <div className="flex min-w-0 items-center gap-3 px-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-background text-sm font-semibold" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><p className="truncate text-sm font-medium">{name}</p><p className="text-xs capitalize text-muted-foreground">{role}</p></div>
      </div>
      <form
        action={signOut}
        onSubmit={() => {
          if (typeof window !== "undefined") {
            clearAllProfileDrafts(window.sessionStorage);
          }
        }}
      >
        <Button type="submit" variant="ghost" className="w-full justify-start px-3"><LogOut aria-hidden="true" />Sign out</Button>
      </form>
      <Link href="/" onClick={closeMenu} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><House className="size-4" aria-hidden="true" />Public homepage</Link>
      <PrototypeNotice className="px-3" />
      <div className="border-t pt-3 mt-1 px-3">
        <ThemeToggle variant="segmented" showLabel />
      </div>
    </div>
  );

  return (
    <>
      <header className="workspace-navigation sticky top-0 z-(--z-navigation) max-h-svh overflow-y-auto border-b px-4 py-3 md:hidden">
        <Link href="/" aria-label="AlumniKonneQt home" className="inline-flex min-h-11 items-center" onClick={closeMenu}><Brand tone="dark" imageClassName="h-10" /></Link>
        <details ref={menu} className="group mt-2" onKeyDown={(event) => {
          if (event.key === "Escape" && menu.current?.open) {
            event.preventDefault();
            event.stopPropagation();
            closeMenu();
            menu.current.querySelector("summary")?.focus();
          }
        }}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden="true" className="size-5" />
            <span className="group-open:hidden">Open navigation</span>
            <span className="hidden group-open:inline">Close navigation</span>
          </summary>
          <div className="pb-3 pt-4">{links}{account}</div>
        </details>
      </header>
      <aside className="workspace-navigation sticky top-0 hidden h-svh w-64 shrink-0 flex-col overflow-y-auto border-r bg-card px-4 py-6 md:flex">
        <Link href="/" aria-label="AlumniKonneQt home" className="mb-8 inline-flex min-h-11 items-center px-2"><Brand tone="dark" imageClassName="h-11" /></Link>
        <p className="mb-3 px-3 text-xs font-medium text-muted-foreground">Your workspace</p>
        {links}{account}
      </aside>
    </>
  );
}
