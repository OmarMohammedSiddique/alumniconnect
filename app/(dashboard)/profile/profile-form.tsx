"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateProfile, type ProfileState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProfileFormProps {
  profile: {
    full_name: string;
    headline: string;
    bio: string;
    skills: string[];
    industry: string;
    graduation_year: number | null;
  };
}

const initialState: ProfileState = { error: null, saved: false };

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );
  const [embedStatus, setEmbedStatus] = useState<
    "idle" | "running" | "done" | "failed"
  >("idle");
  const lastRun = useRef<ProfileState | null>(null);

  // On successful save, regenerate the profile embedding via the server-side
  // pipeline (build instructions: /api/embed is triggered on profile save).
  useEffect(() => {
    if (!state.saved || state === lastRun.current) return;
    lastRun.current = state;
    setEmbedStatus("running");
    fetch("/api/embed", { method: "POST" })
      .then((res) => setEmbedStatus(res.ok ? "done" : "failed"))
      .catch(() => setEmbedStatus("failed"));
  }, [state]);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
        <CardDescription>
          This information powers your mentorship matches — the richer it is,
          the better they get.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              name="headline"
              defaultValue={profile.headline}
              maxLength={120}
              placeholder="e.g. Data engineer at a fintech"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={profile.bio}
              maxLength={2000}
              rows={5}
              placeholder="Your background, interests, and what you're looking for in mentorship"
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skills">Skills</Label>
            <Input
              id="skills"
              name="skills"
              defaultValue={profile.skills.join(", ")}
              placeholder="Comma-separated, e.g. Python, SQL, Public Speaking"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                defaultValue={profile.industry}
                placeholder="e.g. Technology"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="graduation_year">Graduation year</Label>
              <Input
                id="graduation_year"
                name="graduation_year"
                type="number"
                defaultValue={profile.graduation_year ?? ""}
                min={1950}
                max={new Date().getFullYear()}
              />
            </div>
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.saved && !state.error && (
            <p role="status" className="text-sm text-muted-foreground">
              Profile saved.
              {embedStatus === "running" && " Updating your match profile…"}
              {embedStatus === "done" && " Match profile updated."}
              {embedStatus === "failed" &&
                " Match profile update failed — it will retry on your next save."}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
