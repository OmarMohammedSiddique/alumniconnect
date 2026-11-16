"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, Presentation } from "lucide-react";
import { switchDemoAccount, type DemoSwitchState } from "@/app/(auth)/demo-actions";
import { Button } from "@/components/ui/button";
import { type DemoAccount, demoDisplayName } from "@/lib/demo-switcher";

interface DemoSwitcherProps {
  accounts: DemoAccount[];
  currentId?: string;
  /** "bar" sits at the top of the workspace; "panel" sits under the sign-in form. */
  variant: "bar" | "panel";
}

const initial: DemoSwitchState = { error: null };

export function DemoSwitcher({ accounts, currentId, variant }: DemoSwitcherProps) {
  const pathname = usePathname();
  const [state, action, pending] = useActionState(switchDemoAccount, initial);
  if (!accounts.length) return null;

  const current = accounts.find((account) => account.id === currentId);
  const others = accounts.filter((account) => account.id !== currentId);
  const next = variant === "bar" ? pathname : "/requests";

  return (
    <section
      aria-label="Demo accounts"
      className={variant === "bar"
        ? "mb-6 rounded-lg border border-dashed bg-muted/40 p-3 text-sm"
        : "mx-auto mt-6 w-full max-w-2xl rounded-lg border border-dashed bg-muted/40 p-4 text-sm"}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Presentation className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-medium">Demo mode</h2>
        <p className="text-muted-foreground">
          {current
            ? <>Signed in as <strong className="font-medium text-foreground">{demoDisplayName(current.fullName)}</strong> ({current.role === "mentor" ? "Mentor" : "Mentee"}). Switch to see the other side:</>
            : "Presenting the prototype? Sign in as a fictional demo account in one click."}
        </p>
      </div>
      <form action={action} className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="next" value={next} />
        {others.map((account) => (
          <Button
            key={account.id}
            type="submit"
            name="account_id"
            value={account.id}
            variant="outline"
            size="sm"
            disabled={pending}
            title={account.headline || undefined}
          >
            <ArrowRightLeft aria-hidden="true" />
            {demoDisplayName(account.fullName)}
            <span className="text-muted-foreground">{account.role === "mentor" ? "Mentor" : "Mentee"}</span>
          </Button>
        ))}
      </form>
      <p className="mt-2 text-xs text-muted-foreground" role="status">
        {pending ? "Switching account…" : state.error ?? "Demo accounts are fictional people for demonstrations only."}
      </p>
    </section>
  );
}
