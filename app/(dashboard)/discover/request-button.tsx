"use client";

import { useActionState, useState } from "react";
import { createRequest, type RequestState } from "../requests/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: RequestState = { error: null, ok: false };

export function RequestButton({ mentorId }: { mentorId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createRequest,
    initialState,
  );

  if (state.ok) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Request sent.
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Request mentorship
      </Button>
    );
  }

  return (
    <form action={formAction} className="grid w-full gap-2">
      <input type="hidden" name="mentor_id" value={mentorId} />
      <Input
        name="message"
        maxLength={500}
        placeholder="Add a short note (optional)"
        autoFocus
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
