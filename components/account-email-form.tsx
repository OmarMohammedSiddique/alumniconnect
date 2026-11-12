"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { accountEmailAction } from "@/app/(auth)/account-email-actions";
import { ACCOUNT_EMAIL_FLOW, accountEmailRetrySeconds, type AccountEmailChallenge, type AccountEmailPurpose } from "@/lib/account-email";
import { getPasswordError, PASSWORD_RULES } from "@/lib/signup-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { StatusMessage } from "@/components/ui/status-message";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CaptchaTokenInput, TurnstileWidget } from "@/components/turnstile-widget";

export function AccountEmailForm({ purpose, initialChallenge }: { purpose: AccountEmailPurpose; initialChallenge: AccountEmailChallenge | null }) {
  const flow = ACCOUNT_EMAIL_FLOW[purpose];
  const [state, action, pending] = useActionState(accountEmailAction.bind(null, purpose), { error: null, message: initialChallenge ? flow.message : null, challenge: initialChallenge, email: initialChallenge?.email ?? "" });
  const [seconds, setSeconds] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const [clientError, setClientError] = useState<{ message: string; field: "password" | "confirm_password" } | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const challenge = state.challenge;
  const message = clientError?.message || state.error;
  const errorField = clientError?.field ?? (state.error ? state.field : undefined);
  useEffect(() => {
    if (!challenge) return;
    const update = () => setSeconds(accountEmailRetrySeconds(challenge));
    update(); const timer = setInterval(update, 1000); codeRef.current?.focus();
    return () => clearInterval(timer);
  }, [challenge]);
  useEffect(() => { if (state.error && state.field) document.getElementById(`${purpose}-${state.field}`)?.focus(); }, [state, purpose]);

  return <Card className="mx-auto w-full max-w-lg">
    <CardHeader><CardTitle><h1 className="text-2xl font-semibold tracking-tight">{flow.title}</h1></CardTitle><CardDescription>{purpose === "signup" ? "Enter the code from your registration email. This verifies your mailbox, not your alumni affiliation." : "Request a code at your registered email, then enter it with a new password."}</CardDescription></CardHeader>
    <CardContent className="grid gap-5">
      {state.message && <StatusMessage>{state.message}</StatusMessage>}
      {message && <StatusMessage id={`${purpose}-error`} tone="error">{message}</StatusMessage>}
      {challenge ? <>
        <p className="break-words text-sm">Email: <strong>{challenge.email}</strong></p>
        <form action={action} aria-busy={pending} className="grid gap-4" onInput={() => setClientError(null)} onSubmit={event => {
          setClientError(null);
          if (purpose !== "recovery") return;
          const data = new FormData(event.currentTarget);
          const error = getPasswordError(String(data.get("password") ?? ""), String(data.get("confirm_password") ?? ""));
          if (error) { event.preventDefault(); const field = error === "Passwords do not match." ? "confirm_password" : "password"; setClientError({ message: error, field }); document.getElementById(`${purpose}-${field}`)?.focus(); }
        }}>
          <input type="hidden" name="intent" value="verify" /><CaptchaTokenInput token={captchaToken} /><input type="hidden" name="email" value={challenge.email} /><input type="hidden" name="requestedAt" value={challenge.requestedAt} />
          <div className="grid gap-2"><Label htmlFor={`${purpose}-token`}>{purpose === "signup" ? "Confirmation code" : "Reset code"}</Label><Input ref={codeRef} id={`${purpose}-token`} name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required readOnly={pending} aria-invalid={errorField === "token" && Boolean(message)} aria-describedby={`${purpose}-help${errorField === "token" && message ? ` ${purpose}-error` : ""}`} /><p id={`${purpose}-help`} className="text-sm text-muted-foreground">Use the latest email. Codes expire after 10 minutes and can be used once.</p></div>
          {purpose === "recovery" && <>
            <div className="grid gap-2"><Label htmlFor="recovery-password">New password</Label><PasswordInput id="recovery-password" name="password" required minLength={8} autoComplete="new-password" disabled={pending} aria-invalid={errorField === "password" && Boolean(message)} aria-describedby={`recovery-password-help${errorField === "password" && message ? " recovery-error" : ""}`} /><ul id="recovery-password-help" className="text-xs text-muted-foreground">{PASSWORD_RULES.map(rule => <li key={rule.label}>{rule.label}</li>)}</ul></div>
            <div className="grid gap-2"><Label htmlFor="recovery-confirm_password">Confirm new password</Label><PasswordInput id="recovery-confirm_password" name="confirm_password" required autoComplete="new-password" disabled={pending} aria-invalid={errorField === "confirm_password" && Boolean(message)} aria-describedby={errorField === "confirm_password" && message ? "recovery-error" : undefined} /></div>
          </>}
          <Button type="submit" disabled={pending}>{pending ? "Please wait…" : purpose === "signup" ? "Confirm email" : "Set new password"}</Button>
        </form>
        <div className="flex flex-wrap gap-3"><form action={action}><input type="hidden" name="intent" value="resend" /><CaptchaTokenInput token={captchaToken} /><Button type="submit" variant="outline" disabled={pending || seconds > 0}>{seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}</Button></form><form action={action}><input type="hidden" name="intent" value="edit" /><Button type="submit" variant="ghost" disabled={pending}>Change email</Button></form></div>
      </> : <form action={action} aria-busy={pending} className="grid gap-4"><input type="hidden" name="intent" value="request" /><CaptchaTokenInput token={captchaToken} /><div className="grid gap-2"><Label htmlFor={`${purpose}-email`}>{purpose === "signup" ? "Registration email" : "Registered email"}</Label><Input id={`${purpose}-email`} name="email" type="email" autoComplete="email" defaultValue={state.email} maxLength={254} required readOnly={pending} aria-invalid={state.field === "email" && Boolean(state.error)} /></div><Button type="submit" disabled={pending}>{pending ? "Requesting code…" : purpose === "signup" ? "Send confirmation code" : "Send reset code"}</Button></form>}
      <TurnstileWidget action={purpose === "signup" ? "confirm-email" : "reset-password"} onToken={setCaptchaToken} resetKey={state} />
      {purpose === "signup" && <Link href="/signup" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Need a different registration address? Return to sign up.</Link>}
      <Link href="/login" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Return to sign in</Link>
    </CardContent>
  </Card>;
}
