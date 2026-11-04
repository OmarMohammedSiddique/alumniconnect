"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import {
  INITIAL_ADMIN_ACTION_STATE,
  PROFILE_ROLES,
  type AdminActionState,
} from "@/lib/admin-profile-action";
import { setUserRole, setUserVisibility, reviewReportAction } from "./actions";

// Disabled buttons drop keyboard focus in some browsers. When an action
// settles and focus has fallen back to the page, return it to the control the
// user was operating so they can read the result and continue or retry.
function useRestoreFocus(state: AdminActionState, pending: boolean) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (pending || (!state.ok && !state.error)) return;
    const active = document.activeElement;
    if (!active || active === document.body) ref.current?.focus();
  }, [state, pending]);
  return ref;
}

function Feedback({ id, state, pending }: { id: string; state: AdminActionState; pending: boolean }) {
  if (pending) return null;
  if (state.error) {
    return <StatusMessage id={id} tone="error" className="gap-2 p-2 text-xs">{state.error}</StatusMessage>;
  }
  if (state.ok && state.message) {
    return <StatusMessage id={id} tone="success" className="gap-2 p-2 text-xs">{state.message}</StatusMessage>;
  }
  return null;
}

export function RoleForm({ userId, name, role }: { userId: string; name: string; role: string }) {
  const [state, action, pending] = useActionState(setUserRole, INITIAL_ADMIN_ACTION_STATE);
  // Controlled so a failed attempt keeps the chosen value for a safe retry
  // instead of the form resetting to the persisted role.
  const [selected, setSelected] = useState(role);
  const [persisted, setPersisted] = useState(role);
  if (role !== persisted) {
    // A successful change (or another staff member's) arrived from the server.
    setPersisted(role);
    setSelected(role);
  }
  const buttonRef = useRestoreFocus(state, pending);
  const feedbackId = useId();
  const showFeedback = !pending && (state.error || state.message);

  return (
    <form action={action} aria-busy={pending} className="grid gap-1.5">
      <div className="flex items-center gap-1.5">
        <input type="hidden" name="user_id" value={userId} />
        <select
          name="role"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          disabled={pending}
          aria-label={`Role for ${name}`}
          aria-describedby={showFeedback ? feedbackId : undefined}
          className="h-7 rounded-md border bg-transparent px-1.5 text-sm"
        >
          {PROFILE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <Button
          ref={buttonRef}
          type="submit"
          size="xs"
          variant="outline"
          disabled={pending || selected === role}
          focusableWhenDisabled
          aria-label={`Set role for ${name}`}
        >
          {pending ? "Saving..." : "Set"}
        </Button>
      </div>
      <span role="status" className="sr-only">{pending ? `Saving role for ${name}. Please wait.` : ""}</span>
      <Feedback id={feedbackId} state={state} pending={pending} />
    </form>
  );
}

export function ReportReviewForm({
  reportId,
  reportedName,
}: {
  reportId: string;
  reportedName: string;
}) {
  const [state, action, pending] = useActionState(
    reviewReportAction,
    INITIAL_ADMIN_ACTION_STATE,
  );
  const feedbackId = useId();

  return (
    <form action={action} aria-busy={pending} className="grid gap-2">
      <input type="hidden" name="report_id" value={reportId} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          name="action"
          value="hide_profile"
          size="xs"
          variant="destructive"
          disabled={pending}
          aria-label={`Hide profile for ${reportedName}`}
        >
          {pending ? "Reviewing..." : "Hide profile & action"}
        </Button>
        <Button
          type="submit"
          name="action"
          value="dismiss"
          size="xs"
          variant="outline"
          disabled={pending}
          aria-label={`Dismiss report for ${reportedName}`}
        >
          {pending ? "Reviewing..." : "Dismiss"}
        </Button>
      </div>
      <Feedback id={feedbackId} state={state} pending={pending} />
    </form>
  );
}

export function VisibilityForm({ userId, name, visible }: { userId: string; name: string; visible: boolean }) {
  const [state, action, pending] = useActionState(setUserVisibility, INITIAL_ADMIN_ACTION_STATE);
  const buttonRef = useRestoreFocus(state, pending);
  const feedbackId = useId();
  const showFeedback = !pending && (state.error || state.message);

  return (
    <form action={action} aria-busy={pending} className="grid gap-1.5">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="visible" value={visible ? "false" : "true"} />
      <Button
        ref={buttonRef}
        type="submit"
        size="xs"
        variant="outline"
        disabled={pending}
        focusableWhenDisabled
        aria-label={`${visible ? "Hide" : "Show"} ${name}'s profile`}
        aria-describedby={showFeedback ? feedbackId : undefined}
        className="justify-self-start"
      >
        {pending ? (visible ? "Hiding..." : "Showing...") : visible ? "Visible - hide" : "Hidden - show"}
      </Button>
      <span role="status" className="sr-only">
        {pending ? `${visible ? "Hiding" : "Showing"} ${name}'s profile. Please wait.` : ""}
      </span>
      <Feedback id={feedbackId} state={state} pending={pending} />
    </form>
  );
}
