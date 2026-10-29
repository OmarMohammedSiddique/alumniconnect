"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
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
      <form action={formAction} aria-busy={pending}>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" required autoComplete="name" />
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
            />
            <p id="password-help" className="text-sm text-muted-foreground">Use at least 8 characters.</p>
          </div>
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
          {state.error && (
            <StatusMessage tone="error">{state.error}</StatusMessage>
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
