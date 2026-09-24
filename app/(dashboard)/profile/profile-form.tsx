"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
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

const PROFILE_FIELDS = [
  { name: "full_name", label: "Full name" },
  { name: "headline", label: "Headline" },
  { name: "bio", label: "Bio" },
  { name: "skills", label: "Skills" },
  { name: "industry", label: "Industry" },
  { name: "graduation_year", label: "Graduation year" },
] as const;

export function ProfileForm({ profile }: ProfileFormProps) {
  const [draft, setDraft] = useState({
    full_name: profile.full_name ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    skills: profile.skills.join(", "),
    industry: profile.industry ?? "",
    graduation_year: String(profile.graduation_year ?? ""),
  });
  const missing = PROFILE_FIELDS.filter(({ name }) => {
    const value = draft[name].trim();
    if (name === "skills") return !value.split(",").some((skill) => skill.trim());
    if (name === "graduation_year") {
      const year = Number(value);
      return !value || !Number.isInteger(year) || year < 1950 || year > new Date().getFullYear();
    }
    if (name === "headline") return !value || value.length > 120;
    if (name === "bio") return !value || value.length > 2000;
    return !value;
  });
  const completed = PROFILE_FIELDS.length - missing.length;
  const percent = Math.round((completed / PROFILE_FIELDS.length) * 100);
  const updateDraft = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  };
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
          This information powers your mentorship matches - the richer it is,
          the better they get.
        </CardDescription>
        <section aria-labelledby="profile-completeness" className="mt-4 rounded-lg border bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="profile-completeness" className="text-sm font-medium">Profile completeness</h2>
            <span className="text-sm font-semibold tabular-nums">{percent}%</span>
          </div>
          <progress
            aria-label="Profile completeness"
            value={completed}
            max={PROFILE_FIELDS.length}
            className="mt-3 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
          />
          <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">
            {completed} of {PROFILE_FIELDS.length} fields complete.
            {missing.length === 0 && " Your profile is complete."}
          </p>
          {missing.length > 0 && (
            <div className="mt-3">
              <p className="text-sm">Add or finish:</p>
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {missing.map(({ name, label }) => (
                  <li key={name}>
                    <a href={`#${name}`} onClick={(event) => {
                      event.preventDefault();
                      document.getElementById(name)?.focus();
                    }} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Progress reflects this form. Save your profile to keep your changes.</p>
        </section>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              value={draft.full_name}
              onChange={updateDraft}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              name="headline"
              value={draft.headline}
              onChange={updateDraft}
              maxLength={120}
              placeholder="e.g. Data engineer at a fintech"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              name="bio"
              value={draft.bio}
              onChange={updateDraft}
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
              value={draft.skills}
              onChange={updateDraft}
              placeholder="Comma-separated, e.g. Python, SQL, Public Speaking"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                value={draft.industry}
                onChange={updateDraft}
                placeholder="e.g. Technology"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="graduation_year">Graduation year</Label>
              <Input
                id="graduation_year"
                name="graduation_year"
                type="number"
                value={draft.graduation_year}
                onChange={updateDraft}
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
                " Match profile update failed - it will retry on your next save."}
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
