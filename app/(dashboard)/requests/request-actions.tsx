"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { cancelRequest, respondRequest, type RequestState } from "./actions";

const INITIAL_STATE: RequestState = { error: null, ok: false };

function SubmitActions({ isMentor }: { isMentor: boolean }) {
  const { pending, data } = useFormStatus();
  const accepting = data?.get("accept") === "true";

  return (
    <div className="flex flex-wrap gap-2">
      {isMentor ? (
        <>
          <Button type="submit" size="sm" name="accept" value="true" disabled={pending}>
            {pending && accepting ? "Accepting..." : "Accept"}
          </Button>
          <Button type="submit" size="sm" variant="outline" name="accept" value="false" disabled={pending}>
            {pending && !accepting ? "Declining..." : "Decline"}
          </Button>
        </>
      ) : (
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Cancelling..." : "Cancel request"}
        </Button>
      )}
    </div>
  );
}

export function RequestActions({ requestId, isMentor }: { requestId: string; isMentor: boolean }) {
  const [state, action, pending] = useActionState(isMentor ? respondRequest : cancelRequest, INITIAL_STATE);
  const feedbackId = useId();

  if (state.ok) {
    return <StatusMessage tone="success">Request updated.</StatusMessage>;
  }

  return (
    <form action={action} aria-busy={pending} aria-describedby={state.error && !pending ? feedbackId : undefined} className="grid gap-3">
      <input type="hidden" name="request_id" value={requestId} />
      <SubmitActions isMentor={isMentor} />
      <span role="status" className="sr-only">{pending ? "Updating request. Please wait." : ""}</span>
      {state.error && !pending && <StatusMessage id={feedbackId} tone="error">{state.error}</StatusMessage>}
    </form>
  );
}
