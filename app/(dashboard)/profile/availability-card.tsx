"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, CalendarOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusMessage } from "@/components/ui/status-message";
import { updateAvailabilityAction } from "@/app/(dashboard)/actions/safety";

// Availability means "open to NEW mentorship requests". Pending requests and
// existing connections are unaffected; the database rejects new requests
// while availability is paused.
export function AvailabilityCard({ acceptingRequests }: { acceptingRequests: boolean }) {
  const [accepting, setAccepting] = useState(acceptingRequests);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !accepting;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await updateAvailabilityAction(next);
      if (res.ok) {
        setAccepting(next);
        setMessage(res.message ?? null);
      } else {
        setError(res.error ?? "Failed to update availability.");
      }
    });
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          {accepting ? (
            <CalendarCheck className="size-5 text-primary" aria-hidden="true" />
          ) : (
            <CalendarOff className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
          <CardTitle>
            <h2>Mentoring availability</h2>
          </CardTitle>
        </div>
        <CardDescription>
          Choose whether Mentees can send you new mentorship requests. Pausing does not affect pending requests or your existing connections, and you stay visible in Discover.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col justify-between gap-4 rounded-lg border bg-surface p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">New requests</span>
            <Badge tone={accepting ? "success" : "neutral"}>
              {accepting ? "Accepting" : "Paused"}
            </Badge>
          </div>
          <Button
            type="button"
            size="sm"
            variant={accepting ? "outline" : "default"}
            disabled={pending}
            aria-pressed={accepting}
            onClick={toggle}
          >
            {pending ? "Saving…" : accepting ? "Pause new requests" : "Accept new requests"}
          </Button>
        </div>
        {message && <StatusMessage tone="success">{message}</StatusMessage>}
        {error && <StatusMessage tone="error">{error}</StatusMessage>}
      </CardContent>
    </Card>
  );
}
