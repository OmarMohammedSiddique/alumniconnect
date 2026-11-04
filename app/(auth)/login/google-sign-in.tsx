"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { signInWithGoogle, type AuthState } from "../actions";
import { getGoogleAuthMessage } from "@/lib/google-auth";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

export function GoogleSignIn({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInWithGoogle, { error: null } as AuthState);
  const callbackMessage = getGoogleAuthMessage(useSearchParams().get("oauth_error"));
  return <div className="grid gap-3">
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="next" value={next} />
      <Button type="submit" variant="outline" className="w-full border-[#747775] bg-white text-[#1f1f1f] hover:bg-neutral-100" disabled={pending}>
        <Image src="/google-g.png" alt="" width={20} height={20} unoptimized />
        {pending ? "Connecting to Google…" : "Sign in with Google"}
      </Button>
    </form>
    {(state.error || callbackMessage) && <StatusMessage tone="error">{state.error || callbackMessage}</StatusMessage>}
    <p className="text-xs leading-relaxed text-muted-foreground">Register first, then use Google with the same email address. Existing accounts keep their mentorship role. Google sign-in does not verify alumni affiliation.</p>
    <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or sign in with email<span className="h-px flex-1 bg-border" /></div>
  </div>;
}
