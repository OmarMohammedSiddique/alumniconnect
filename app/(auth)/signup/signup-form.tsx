"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ProfilePhotoPicker } from "@/components/profile-photo-picker";
import { PASSWORD_RULES, getPasswordError } from "@/lib/signup-validation";
import { signUp, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
const initialState: AuthState = { error: null };
const ROLES = [
  { value: "mentee", label: "Mentee", description: "Find guidance for your career and professional growth." },
  { value: "mentor", label: "Mentor", description: "Share your experience and guide other participants." },
] as const;

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [role, setRole] = useState<"mentee" | "mentor">("mentee");

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [confirmationTouched, setConfirmationTouched] = useState(false);
  const mismatch = confirmationTouched && password !== confirmation;

  if (state.confirmationRequired) return (
    <Card>
      <CardHeader>
        <CardTitle><h1 className="text-2xl font-semibold">Check your email</h1></CardTitle>
        <CardDescription>Follow the confirmation link in your email, then sign in to continue.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p>Your picture has not been uploaded yet. After verifying your email, sign in and choose your picture again.</p>
        <Link href="/login?next=/profile/photo" className="inline-flex min-h-11 items-center font-medium text-primary underline">Continue to sign in</Link>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle><h1 className="text-2xl font-semibold tracking-tight">Create your account</h1></CardTitle>
        <CardDescription>
          For Kenya Airways alumni and eligible participants seeking or sharing professional guidance.
        </CardDescription>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Registration does not verify employment or airline affiliation.
        </p>
      </CardHeader>
      <form action={formAction} aria-busy={pending} onSubmit={(event) => {
        const error = getPasswordError(password, confirmation);
        if (error) {
          event.preventDefault();
          setConfirmationTouched(true);
          const input = event.currentTarget.elements.namedItem(password === confirmation ? "password" : "confirm_password") as HTMLInputElement;
          setClientError(error);
          input.focus();
        }
      }}>
        <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:gap-8">
          <fieldset disabled={pending} className="grid min-w-0 content-start gap-5">
          <legend className="mb-4 text-base font-semibold">Account details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="first_name">First name</Label>
              <Input id="first_name" name="first_name" required maxLength={100} autoComplete="given-name" />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" name="last_name" required maxLength={100} autoComplete="family-name" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" aria-describedby="email-help" />
            <p id="email-help" className="text-sm text-muted-foreground">Use an email you can access. You will use it to sign in.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby="password-help"
              value={password}
              onChange={(event) => { setPassword(event.target.value); setClientError(null); }}
            />
            <ul id="password-help" className="grid gap-1 text-sm text-muted-foreground">
              {PASSWORD_RULES.map((rule) => <li key={rule.label}>{password && rule.test(password) ? "✓" : "•"} {rule.label}</li>)}
            </ul>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm_password">Verify password</Label>
            <PasswordInput id="confirm_password" name="confirm_password" required autoComplete="new-password"
              value={confirmation} aria-invalid={mismatch} aria-describedby="confirmation-help"
              onBlur={() => setConfirmationTouched(true)}
              onChange={(event) => { setConfirmation(event.target.value); setClientError(null); }} />
            <p id="confirmation-help" role="status" className={`text-sm ${mismatch ? "text-destructive" : "text-muted-foreground"}`}>
              {mismatch ? "Passwords do not match." : confirmation && password === confirmation ? "Passwords match." : "Enter your password again to confirm it."}
            </p>
          </div>
          </fieldset>
          <div className="grid min-w-0 content-start gap-6 border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <ProfilePhotoPicker disabled={pending} />
          <fieldset className="min-w-0" aria-describedby="role-help role-next" disabled={pending}>
            <legend className="mb-3 text-sm font-medium">How would you like to take part?</legend>
            <div className="grid gap-2">
              {ROLES.map((option) => (
                <label key={option.value} className={`flex min-h-11 cursor-pointer items-start gap-3 border p-3 ${role === option.value ? "border-primary bg-surface" : "border-border bg-card"}`}>
                  <input type="radio" name="role" value={option.value} checked={role === option.value}
                    onChange={() => setRole(option.value)} className="mt-1 size-4 shrink-0 accent-primary" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <p id="role-help" className="mt-3 text-xs text-muted-foreground">Your account has one mentorship role.</p>
            <p id="role-next" role="status" className="mt-2 text-sm leading-relaxed">
              {role === "mentor"
                ? "Next: build your Mentor profile, then review introductions from Mentees."
                : "Next: add your career goals, then explore Mentors and send an introduction."}
            </p>
          </fieldset>
          </div>
          {(clientError || state.error) && (
            <div className="md:col-span-2"><StatusMessage tone="error">{clientError || state.error}</StatusMessage></div>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Sign up"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
