"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { updateProfile, type ProfileState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";
import { FieldGuidance } from "@/components/ui/field-guidance";
import { MAX_BIO_LENGTH, MAX_HEADLINE_LENGTH } from "@/lib/form-limits";
import { getSkillsLimitError, MAX_PROFILE_SKILLS, normalizeSkills } from "@/lib/profile-skills";
import { createProfileMatchUpdater, type MatchUpdateStatus } from "@/lib/profile-match-update";
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
  const [savedDraft, setSavedDraft] = useState(draft);
  const hasUnsavedChanges = PROFILE_FIELDS.some(({ name }) => draft[name] !== savedDraft[name]);
  const skills = normalizeSkills(draft.skills);
  const skillsError = getSkillsLimitError(skills.length);
  const missing = PROFILE_FIELDS.filter(({ name }) => {
    const value = draft[name].trim();
    if (name === "skills") return skills.length === 0 || Boolean(skillsError);
    if (name === "graduation_year") {
      const year = Number(value);
      return !value || !Number.isInteger(year) || year < 1950 || year > new Date().getFullYear();
    }
    if (name === "headline") return !value || value.length > MAX_HEADLINE_LENGTH;
    if (name === "bio") return !value || value.length > MAX_BIO_LENGTH;
    return !value;
  });
  const completed = PROFILE_FIELDS.length - missing.length;
  const percent = Math.round((completed / PROFILE_FIELDS.length) * 100);
  const updateDraft = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  };
  const [state, formAction, pending] = useActionState(
    async (previous: ProfileState, formData: FormData) => {
      // Capture this submission so edits made while saving remain unsaved.
      const submitted = Object.fromEntries(
        PROFILE_FIELDS.map(({ name }) => [name, String(formData.get(name) ?? "")]),
      ) as typeof draft;
      const result = await updateProfile(previous, formData);
      if (result.saved) {
        setSavedDraft({ ...submitted, full_name: result.fullName });
        // Only replace the submitted name, preserving newer edits in this form.
        setDraft((current) => current.full_name === submitted.full_name
          ? { ...current, full_name: result.fullName }
          : current);
      }
      return result;
    },
    initialState,
  );
  const [embedStatus, setEmbedStatus] = useState<MatchUpdateStatus>("idle");
  const updateMatchProfile = useMemo(() => createProfileMatchUpdater(setEmbedStatus), []);
  const matchUpdateNeedsAttention = embedStatus === "failed" || embedStatus === "retrying";
  const lastRun = useRef<ProfileState | null>(null);

  // On successful save, regenerate the profile embedding via the server-side
  // pipeline (build instructions: /api/embed is triggered on profile save).
  useEffect(() => {
    if (!state.saved || state === lastRun.current) return;
    lastRun.current = state;
    void updateMatchProfile();
  }, [state, updateMatchProfile]);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle><h2>Professional details</h2></CardTitle>
        <CardDescription>
          Share your experience and interests to give your community a clear starting point.
        </CardDescription>
        <section aria-labelledby="profile-completeness" className="mt-5 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="profile-completeness" className="text-sm font-medium">Profile completeness</h3>
            <span className="text-sm font-semibold tabular-nums">{percent}%</span>
          </div>
          <progress
            aria-label="Profile completeness"
            value={completed}
            max={PROFILE_FIELDS.length}
            className="profile-progress mt-3 h-2 w-full overflow-hidden rounded-sm"
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
      <form action={formAction} aria-busy={pending} onSubmit={(event) => {
        if (skillsError) {
          event.preventDefault();
          event.currentTarget.querySelector<HTMLInputElement>("#skills")?.focus();
        }
      }}>
        <CardContent className="grid gap-6">
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
              maxLength={MAX_HEADLINE_LENGTH}
              aria-describedby="headline-help headline-count"
              placeholder="e.g. Data engineer at a fintech"
            />
            <FieldGuidance id="headline" label="Headline" value={draft.headline} maxLength={MAX_HEADLINE_LENGTH}>
              Sum up your current role or career direction in one line.
            </FieldGuidance>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              name="bio"
              value={draft.bio}
              onChange={updateDraft}
              maxLength={MAX_BIO_LENGTH}
              aria-describedby="bio-help bio-count"
              rows={5}
              placeholder="Your background, interests, and what you're looking for in mentorship"
              className="form-control resize-y"
            />
            <FieldGuidance id="bio" label="Bio" value={draft.bio} maxLength={MAX_BIO_LENGTH}>
              Share your background, interests, and the guidance you can offer or hope to find.
            </FieldGuidance>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skills">Skills</Label>
            <Input
              id="skills"
              name="skills"
              value={draft.skills}
              onChange={updateDraft}
              onBlur={() => setDraft((current) => ({
                ...current,
                skills: normalizeSkills(current.skills).join(", "),
              }))}
              aria-invalid={Boolean(skillsError)}
              aria-describedby={`skills-help skills-count${skillsError ? " skills-error" : ""}`}
              placeholder="Comma-separated, e.g. Python, SQL, Public Speaking"
            />
            <p id="skills-help" className="text-sm text-muted-foreground">
              Separate skills with commas. Duplicates are removed automatically; your spelling is kept.
            </p>
            <p id="skills-count" aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
              {skills.length} of {MAX_PROFILE_SKILLS} unique skills
            </p>
            {skillsError && <p id="skills-error" role="alert" className="text-sm text-destructive">{skillsError}</p>}
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
                aria-describedby="graduation-year-help"
              />
              <p id="graduation-year-help" className="text-sm text-muted-foreground">
                Optional. Enter a year from 1950 to {new Date().getFullYear()}.
              </p>
            </div>
          </div>
          {state.error && (
            <StatusMessage tone="error">{state.error}</StatusMessage>
          )}
          {hasUnsavedChanges && !pending && (
            <StatusMessage>Unsaved changes. Save your profile to keep them.</StatusMessage>
          )}
          {state.saved && !state.error && !hasUnsavedChanges && !pending && !matchUpdateNeedsAttention && (
            <StatusMessage tone="success">
              Profile saved.
              {embedStatus === "running" && " Updating your match profile…"}
              {embedStatus === "done" && " Match profile updated."}
            </StatusMessage>
          )}
          {matchUpdateNeedsAttention && !pending && (
            <StatusMessage aria-busy={embedStatus === "retrying"}>
              <p>
                {state.saved && !hasUnsavedChanges && "Profile saved. "}
                {embedStatus === "failed"
                  ? "Match profile update failed."
                  : "Retrying the match profile update…"}
              </p>
              <p className="mt-1">This update uses your last saved profile. Any unsaved edits stay in this form.</p>
              <Button type="button" variant="outline" className="mt-3"
                disabled={embedStatus === "retrying"}
                onClick={() => { void updateMatchProfile(true); }}>
                {embedStatus === "retrying" ? "Retrying update…" : "Retry update"}
              </Button>
            </StatusMessage>
          )}
          {embedStatus === "done" && (!state.saved || hasUnsavedChanges) && !pending && (
            <StatusMessage>Match profile updated using your last saved profile.</StatusMessage>
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
