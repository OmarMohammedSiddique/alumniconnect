"use client";

import { useId, useState } from "react";
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
import { SafetyActionsMenu } from "@/components/safety/safety-actions-menu";
import { mentorExplanation, sharedSkillLabels } from "@/lib/mentor-explanation";

export interface Mentor {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  skills: string[];
  industry: string;
  graduation_year: number | null;
  accepting_requests?: boolean;
  similarity?: number;
  shared_skills?: string[];
}

export function MentorCard({
  mentor,
  mode,
  canRequest = false,
  requestStatus = null,
  onRequestSent,
  onBlocked,
}: {
  mentor: Mentor;
  mode: "semantic" | "keyword";
  canRequest?: boolean;
  requestStatus?: "pending" | "connected" | null;
  onRequestSent?: (mentorId: string) => void;
  onBlocked?: (mentorId: string) => void;
}) {
  const titleId = useId();
  const bioId = useId();
  const explanation = mentorExplanation(mode, mentor.shared_skills);
  const [showFullBio, setShowFullBio] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const shared = new Set(
    sharedSkillLabels(mentor.shared_skills).map((s) => s.toLowerCase()),
  );

  const isLongBio = (mentor.bio ?? "").length > 180;
  // Availability is maintained by the Mentor and enforced again by RLS on insert.
  const isAccepting = mentor.accepting_requests !== false;

  if (isBlocked) return null;

  return (
    <Card role="article" aria-labelledby={titleId} className="h-full min-w-0 [overflow-wrap:anywhere]">
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
                <h2 id={titleId}>{mentor.full_name}</h2>
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
            {!isAccepting && requestStatus !== "connected" && (
              <Badge tone="neutral">Not accepting requests</Badge>
            )}
            <SafetyActionsMenu
              targetId={mentor.id}
              targetName={mentor.full_name}
              onBlocked={() => {
                setIsBlocked(true);
                onBlocked?.(mentor.id);
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {mentor.bio && (
          <div>
            <p
              id={bioId}
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
                aria-expanded={showFullBio}
                aria-controls={bioId}
                className="mt-1 inline-flex min-h-11 items-center text-xs font-medium text-foreground underline underline-offset-2 hover:opacity-80"
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
              className={`max-w-full [overflow-wrap:anywhere] ${shared.has(skill.trim().toLowerCase()) ? "font-semibold" : ""}`}
              tone={shared.has(skill.trim().toLowerCase()) ? "info" : "neutral"}
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
        <div className="grid min-w-0 gap-1 text-sm" role="group" aria-label="Why this profile appears">
          <p>{explanation.summary}</p>
          {explanation.limitation && (
            <p className="text-xs leading-relaxed text-muted-foreground">{explanation.limitation}</p>
          )}
        </div>
      </CardContent>
      {canRequest && (
        <CardFooter className="mt-auto pt-3">
          {requestStatus === "connected" ? (
            <div className="flex w-full items-center justify-between text-xs">
              <span className="font-medium text-foreground">✓ Mentorship active</span>
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
          ) : !isAccepting ? (
            <p className="text-xs text-muted-foreground" role="status">
              {mentor.full_name} is not accepting new mentorship requests right now. Check back later.
            </p>
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
