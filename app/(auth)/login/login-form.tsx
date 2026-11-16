"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GoogleSignIn } from "./google-sign-in";
import { signIn, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";
import { CaptchaTokenInput, TurnstileWidget } from "@/components/turnstile-widget";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthState = { error: null };

export function LoginForm({ emailOtpEnabled = false, accountEmailEnabled = false }: { emailOtpEnabled?: boolean; accountEmailEnabled?: boolean }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [captchaToken, setCaptchaToken] = useState("");
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const passwordReset = params.get("password_reset") === "1";

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle><h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1></CardTitle>
        <CardDescription>Sign in to your mentorship workspace.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">{passwordReset && <StatusMessage tone="success">Password updated. Sign in with your new password.</StatusMessage>}<GoogleSignIn next={next} /></CardContent>
      <form action={formAction} aria-busy={pending}>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="next" value={next} />
          <CaptchaTokenInput token={captchaToken} />
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="sm:col-span-2"><TurnstileWidget action="login" onToken={setCaptchaToken} resetKey={state} /></div>
          {state.error && (
            <div className="sm:col-span-2"><StatusMessage tone="error">{state.error}</StatusMessage></div>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          {emailOtpEnabled && <Link href={next ? `/login/code?next=${encodeURIComponent(next)}` : "/login/code"} className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4">Sign in with an email code</Link>}
          {accountEmailEnabled && <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4">Forgot password?</Link>}
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
