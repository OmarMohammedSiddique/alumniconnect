"use client";

import Link from "next/link";
import { useActionState } from "react";
import { lockDemoMode, unlockDemoMode, type DemoSwitchState } from "../demo-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";

const initial: DemoSwitchState = { error: null };

export function PresenterKeyForm({ unlocked }: { unlocked: boolean }) {
  const [state, action, pending] = useActionState(unlockDemoMode, initial);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle><h1 className="text-xl">Demo mode</h1></CardTitle>
        <CardDescription>
          For presenters. Unlock one-click switching between the fictional demo Mentee and Mentors in this browser for 12 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {unlocked ? (
          <>
            <StatusMessage tone="success">Demo mode is unlocked in this browser.</StatusMessage>
            <div className="flex flex-wrap gap-2">
              <Link href="/login" className={buttonVariants()}>Choose a demo account</Link>
              <form action={lockDemoMode}><Button type="submit" variant="outline">End demo mode</Button></form>
            </div>
          </>
        ) : (
          <form action={action} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="presenter_key">Presenter key</Label>
              <PasswordInput id="presenter_key" name="presenter_key" autoComplete="off" required />
            </div>
            <Button type="submit" disabled={pending}>{pending ? "Checking…" : "Unlock demo mode"}</Button>
            {state.error && !pending && <StatusMessage tone="error">{state.error}</StatusMessage>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
