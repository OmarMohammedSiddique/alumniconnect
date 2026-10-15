"use client";

import { useActionState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: AuthState = { error: null };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle><h1 className="text-2xl font-semibold tracking-tight">Create your account</h1></CardTitle>
        <CardDescription>
          Join the professional community as a Mentor or Mentee.
        </CardDescription>
      </CardHeader>
      <form action={formAction} aria-busy={pending}>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" required autoComplete="name" />
          </div>
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
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">I&apos;m joining as</Label>
            <Select name="role" defaultValue="mentee">
              <SelectTrigger id="role">
                <SelectValue>{(value: string) => value === "mentor" ? "Mentor: offering guidance" : "Mentee: seeking guidance"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mentee">
                  Mentee: seeking guidance
                </SelectItem>
                <SelectItem value="mentor">
                  Mentor: offering guidance
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
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
