"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OTP_REQUEST_MESSAGE, otpRetrySeconds, type OtpChallenge } from "@/lib/email-otp";
import { emailOtpAction } from "./actions";
import { CaptchaTokenInput, TurnstileWidget } from "@/components/turnstile-widget";

export function CodeForm({ initialChallenge, next }: { initialChallenge: OtpChallenge | null; next: string }) {
  const [state, action, pending] = useActionState(emailOtpAction, { error: null, challenge: initialChallenge, message: initialChallenge ? OTP_REQUEST_MESSAGE : null });
  const [seconds, setSeconds] = useState(0);
  const [captchaToken, setCaptchaToken] = useState("");
  const tokenRef = useRef<HTMLInputElement>(null);
  const challenge = state.challenge;
  useEffect(() => {
    if (!challenge) return;
    const update = () => setSeconds(otpRetrySeconds(challenge));
    update();
    const timer = setInterval(update, 1000);
    tokenRef.current?.focus();
    if (tokenRef.current) tokenRef.current.value = "";
    return () => clearInterval(timer);
  }, [challenge]);

  return <Card className="mx-auto w-full max-w-lg">
    <CardHeader>
      <CardTitle><h1 className="text-2xl font-semibold tracking-tight">Sign in with an email code</h1></CardTitle>
      <CardDescription>Use the email you registered with. New here? <Link href="/signup" className="underline underline-offset-4">Create an account first.</Link></CardDescription>
    </CardHeader>
    <CardContent className="grid gap-5">
      {state.message && <StatusMessage>{state.message}</StatusMessage>}
      {state.error && <StatusMessage tone="error">{state.error}</StatusMessage>}
      {challenge ? <>
        <p className="break-words text-sm">Email: <strong>{challenge.email}</strong></p>
        <form action={action} aria-busy={pending} className="grid gap-4">
          <input type="hidden" name="intent" value="verify" />
          <CaptchaTokenInput token={captchaToken} />
          <input type="hidden" name="email" value={challenge.email} />
          <input type="hidden" name="requestedAt" value={challenge.requestedAt} />
          <div className="grid gap-2">
            <Label htmlFor="otp-code">Sign-in code</Label>
            <Input ref={tokenRef} id="otp-code" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required aria-describedby="otp-help" readOnly={pending} />
            <p id="otp-help" className="text-sm text-muted-foreground">Paste the code from your most recent email. Codes are single-use. If yours expires, request another.</p>
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Please wait…" : "Verify and sign in"}</Button>
        </form>
        <div className="flex flex-wrap gap-3">
          <form action={action}>
            <input type="hidden" name="intent" value="resend" />
            <CaptchaTokenInput token={captchaToken} />
            <Button type="submit" variant="outline" disabled={pending || seconds > 0}>{seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}</Button>
          </form>
          <form action={action}>
            <input type="hidden" name="intent" value="edit" />
            <Button type="submit" variant="ghost" disabled={pending}>Change email</Button>
          </form>
        </div>
      </> : <form action={action} aria-busy={pending} className="grid gap-4">
        <input type="hidden" name="intent" value="request" />
        <CaptchaTokenInput token={captchaToken} />
        <input type="hidden" name="next" value={next} />
        <div className="grid gap-2">
          <Label htmlFor="otp-email">Registered email</Label>
          <Input id="otp-email" name="email" type="email" autoComplete="email" maxLength={254} required readOnly={pending} />
        </div>
        <Button type="submit" disabled={pending}>{pending ? "Requesting code…" : "Send sign-in code"}</Button>
      </form>}
      <TurnstileWidget action="email-code" onToken={setCaptchaToken} resetKey={state} />
      <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Use password or Google instead</Link>
    </CardContent>
  </Card>;
}
