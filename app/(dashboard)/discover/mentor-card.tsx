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
  canRequest = false,
}: {
  mentor: Mentor;
  canRequest?: boolean;
}) {
  const shared = new Set(
    (mentor.shared_skills ?? []).map((s) => s.toLowerCase()),
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border bg-surface font-semibold" aria-hidden="true">{mentor.full_name.trim().slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0"><CardTitle><h2 className="break-words">{mentor.full_name}</h2></CardTitle><CardDescription className="mt-1">{mentor.headline}</CardDescription></div>
          </div>
          {typeof mentor.similarity === "number" && (
            <Badge tone="accent" title="Profile similarity score, not a guarantee of mentorship fit">
              {Math.round(mentor.similarity * 100)}% match
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {mentor.bio && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {mentor.bio}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {mentor.skills.map((skill) => (
            <Badge key={skill} tone={shared.has(skill.toLowerCase()) ? "accent" : "neutral"}>
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
        {(mentor.shared_skills?.length ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground">
            Matched on shared skills:{" "}
            <span className="text-foreground">
              {mentor.shared_skills!.join(", ")}
            </span>
          </p>
        )}
      </CardContent>
      {canRequest && (
        <CardFooter className="mt-auto">
          <RequestButton mentorId={mentor.id} />
        </CardFooter>
      )}
    </Card>
  );
}
