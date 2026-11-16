"use client";

import { useActionState, useId } from "react";
import { CalendarCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";
import { CONTACT_MAX, contactHref } from "@/lib/connection-journey";
import {
  removeConnectionContact,
  setFirstConversation,
  shareConnectionContact,
  type JourneyActionState,
} from "./actions";

const INITIAL: JourneyActionState = { error: null, ok: false };

/** Shows the other person's shared contact, if any. */
export function PartnerContact({ name, contact }: { name: string; contact: string | null }) {
  if (!contact) {
    return <p className="text-xs text-muted-foreground">{name} has not shared a contact detail yet.</p>;
  }
  const href = contactHref(contact);
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{name} shared: </span>
      {href ? (
        <a href={href} target={href.startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline break-all">
          {contact}
          {href.startsWith("https:") && <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />}
        </a>
      ) : (
        <span className="font-medium break-all">{contact}</span>
      )}
    </p>
  );
}

/** Lets this member share, change or remove the contact detail the other person sees. */
export function ContactShareForm({ connectionId, partnerName, myContact }: { connectionId: string; partnerName: string; myContact: string | null }) {
  const [saveState, save, saving] = useActionState(shareConnectionContact, INITIAL);
  const [removeState, remove, removing] = useActionState(removeConnectionContact, INITIAL);
  const inputId = useId();
  const error = (!saving && saveState.error) || (!removing && removeState.error) || null;

  return (
    <div className="grid gap-2">
      <form action={save} className="grid gap-1.5">
        <input type="hidden" name="connection_id" value={connectionId} />
        <Label htmlFor={inputId} className="text-xs font-medium">
          {myContact ? `Your contact, visible to ${partnerName}` : `Share a contact detail with ${partnerName}`}
        </Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id={inputId}
            name="contact"
            defaultValue={myContact ?? ""}
            key={myContact ?? ""}
            maxLength={CONTACT_MAX}
            placeholder="Email address, phone number or meeting link"
            className="h-9 min-w-0 flex-1 basis-56 text-sm"
          />
          <Button type="submit" size="sm" disabled={saving || removing}>
            {saving ? "Saving..." : myContact ? "Update" : "Share"}
          </Button>
        </div>
      </form>
      {myContact && (
        <form action={remove}>
          <input type="hidden" name="connection_id" value={connectionId} />
          <Button type="submit" variant="ghost" size="xs" disabled={saving || removing}>
            {removing ? "Removing..." : "Stop sharing"}
          </Button>
        </form>
      )}
      <p className="text-[11px] text-muted-foreground">
        Only you and {partnerName} can see this. Your account email stays private unless you enter it here.
      </p>
      <span role="status" className="sr-only">{saving ? "Saving contact detail." : removing ? "Removing contact detail." : ""}</span>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
    </div>
  );
}

/** Records, or undoes, that the first conversation has happened. */
export function FirstConversationToggle({ connectionId, heldAt }: { connectionId: string; heldAt: string | null }) {
  const [state, action, pending] = useActionState(setFirstConversation, INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="connection_id" value={connectionId} />
      <input type="hidden" name="held" value={heldAt ? "false" : "true"} />
      {heldAt ? (
        <>
          <p className="flex items-center gap-1.5 text-sm">
            <CalendarCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            First conversation held on{" "}
            {new Date(heldAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <Button type="submit" variant="ghost" size="xs" disabled={pending}>{pending ? "Updating..." : "Undo"}</Button>
        </>
      ) : (
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <CalendarCheck aria-hidden="true" />
          {pending ? "Saving..." : "Mark first conversation as held"}
        </Button>
      )}
      {state.error && !pending && <StatusMessage tone="error">{state.error}</StatusMessage>}
    </form>
  );
}
