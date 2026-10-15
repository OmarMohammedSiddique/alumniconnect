"use client";

import { useActionState, useState } from "react";
import { createRequest, type RequestState } from "../requests/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";
import { FieldGuidance } from "@/components/ui/field-guidance";
import { MAX_INTRODUCTION_LENGTH } from "@/lib/form-limits";

const initialState: RequestState = { error: null, ok: false };

export function RequestButton({ mentorId }: { mentorId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, formAction, pending] = useActionState(
    createRequest,
    initialState,
  );

  if (state.ok) {
    return (
      <StatusMessage tone="success">Request sent. Track the response on your requests page.</StatusMessage>
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
    <form action={formAction} aria-busy={pending} className="grid w-full gap-3">
      <input type="hidden" name="mentor_id" value={mentorId} />
      <Label htmlFor={`message-${mentorId}`}>Introduction <span className="font-normal text-muted-foreground">(optional)</span></Label>
      <Input
        id={`message-${mentorId}`}
        name="message"
        maxLength={MAX_INTRODUCTION_LENGTH}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        aria-describedby={`message-${mentorId}-help message-${mentorId}-count`}
        placeholder="Add a short note (optional)"
        autoFocus
      />
      <FieldGuidance id={`message-${mentorId}`} label="Introduction" value={message} maxLength={MAX_INTRODUCTION_LENGTH}>
        Mention your goal and why you would value guidance from this Mentor. You can also send without a note.
      </FieldGuidance>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => { setOpen(false); setMessage(""); }}
        >
          Cancel
        </Button>
      </div>
      {state.error && (
        <StatusMessage tone="error">{state.error}</StatusMessage>
      )}
    </form>
  );
}
