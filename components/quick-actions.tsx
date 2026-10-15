import Link from "next/link";
import { ArrowUpRight, Compass, ContactRound, Inbox, UserRound } from "lucide-react";

const ACTIONS = [
  { href: "/discover", label: "Discover Mentors", icon: Compass },
  { href: "/profile", label: "Complete Profile", icon: UserRound },
  { href: "/requests", label: "View Requests", icon: Inbox },
  { href: "/requests#connections", label: "Manage Connections", icon: ContactRound },
];

export function QuickActions() {
  return (
    <nav aria-label="Workspace shortcuts" className="mb-8 grid grid-cols-1 divide-y rounded-lg border bg-card min-[360px]:grid-cols-2 xl:grid-cols-4 xl:divide-y-0">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link key={label} href={href} className="group flex min-h-20 min-w-0 items-center gap-3 px-4 py-4 text-sm font-medium transition-colors duration-(--motion-fast) ease-(--ease-out) hover:bg-surface xl:border-r xl:last:border-r-0">
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 break-words">{label}</span>
          <ArrowUpRight className="ml-auto hidden size-4 shrink-0 text-muted-foreground xl:block" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
