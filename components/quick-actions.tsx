import Link from "next/link";
import { Compass, ContactRound, Inbox, UserRound } from "lucide-react";

const ACTIONS = [
  { href: "/discover", label: "Discover Mentors", icon: Compass },
  { href: "/profile", label: "Your profile", icon: UserRound },
  { href: "/requests", label: "Requests", icon: Inbox },
  { href: "/requests#connections", label: "Connections", icon: ContactRound },
];

export function QuickActions() {
  return (
    <nav aria-label="Workspace shortcuts" className="workspace-shortcuts">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link key={label} href={href} className="workspace-shortcut">
          <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 break-words">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
