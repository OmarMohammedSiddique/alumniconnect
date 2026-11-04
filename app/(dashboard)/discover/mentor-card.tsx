"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestButton } from "./request-button";
import { Badge } from "@/components/ui/badge";

export interface Mentor {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  skills: string[];
  industry: string;
  graduation_year: number | null;
  similarity?: number;
  shared_skills?: string[];
}

export function MentorCard({
  mentor,
  mode,
  canRequest = false,
  requestStatus = null,
  onRequestSent,
}: {
  mentor: Mentor;
  mode: "semantic" | "keyword";
  canRequest?: boolean;
  requestStatus?: "pending" | "connected" | null;
  onRequestSent?: (mentorId: string) => void;
}) {
  const [showFullBio, setShowFullBio] = useState(false);
  const shared = new Set(
    (mentor.shared_skills ?? []).map((s) => s.toLowerCase()),
  );

  const isLongBio = (mentor.bio ?? "").length > 180;

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-lg border bg-surface font-semibold"
              aria-hidden="true"
            >
              {mentor.full_name.trim().slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <CardTitle>
                <h2 className="break-words">{mentor.full_name}</h2>
              </CardTitle>
              <CardDescription className="mt-1">{mentor.headline}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {requestStatus === "pending" && (
              <Badge tone="accent">Pending request</Badge>
            )}
            {requestStatus === "connected" && (
              <Badge tone="success">Connected</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {mentor.bio && (
          <div>
            <p
              className={`text-sm leading-relaxed text-muted-foreground ${
                !showFullBio && isLongBio ? "line-clamp-3" : ""
              }`}
            >
              {mentor.bio}
            </p>
            {isLongBio && (
              <button
                type="button"
                onClick={() => setShowFullBio((prev) => !prev)}
                className="mt-1 text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80"
              >
                {showFullBio ? "Show less" : "Read full background"}
              </button>
            )}
          </div>
        )}
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {mentor.skills.map((skill) => (
            <Badge
              key={skill}
              className="max-w-full [overflow-wrap:anywhere]"
              tone={shared.has(skill.toLowerCase()) ? "accent" : "neutral"}
            >
              {skill}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {[
            mentor.industry,
            mentor.graduation_year ? `Class of ${mentor.graduation_year}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {mode === "semantic" ? (
          <div className="grid min-w-0 gap-1 text-sm">
            <p className="[overflow-wrap:anywhere]">
              {(mentor.shared_skills?.length ?? 0) > 0 ? (
                <>Shared skills: {mentor.shared_skills!.join(", ")}</>
              ) : (
                <>No exact shared skills identified. Review this mentor’s profile for relevant experience.</>
              )}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Recommendations use profile text similarity. Similarity does not guarantee mentorship suitability or success.
            </p>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Found through your keyword search. Review this mentor’s profile to assess their experience.
          </p>
        )}
      </CardContent>
      {canRequest && (
        <CardFooter className="mt-auto pt-3">
          {requestStatus === "connected" ? (
            <div className="flex w-full items-center justify-between text-xs">
              <span className="font-medium text-success">✓ Mentorship active</span>
              <Link
                href="/requests"
                className="font-medium text-primary underline underline-offset-4 hover:opacity-85"
              >
                View conversation next steps →
              </Link>
            </div>
          ) : requestStatus === "pending" ? (
            <div className="flex w-full items-center justify-between text-xs">
              <span className="text-muted-foreground">Request in review</span>
              <Link
                href="/requests"
                className="font-medium text-primary underline underline-offset-4 hover:opacity-85"
              >
                Track on requests page →
              </Link>
            </div>
          ) : (
            <RequestButton
              mentorId={mentor.id}
              onRequestSent={() => onRequestSent?.(mentor.id)}
            />
          )}
        </CardFooter>
      )}
    </Card>
  );
}
