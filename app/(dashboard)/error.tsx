"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

export default function WorkspaceError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto grid max-w-xl gap-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">We couldn’t load this page</h1>
      <StatusMessage tone="error">Please try again. If the issue continues, return to the homepage and sign in again.</StatusMessage>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className="inline-flex min-h-11 items-center px-3 text-sm font-medium underline underline-offset-4">Go to homepage</Link>
      </div>
    </div>
  );
}
