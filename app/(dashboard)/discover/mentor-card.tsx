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
}: {
  mentor: Mentor;
  mode: "semantic" | "keyword";
  canRequest?: boolean;
}) {
  const shared = new Set(
    (mentor.shared_skills ?? []).map((s) => s.toLowerCase()),
  );

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border bg-surface font-semibold" aria-hidden="true">{mentor.full_name.trim().slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0"><CardTitle><h2 className="break-words">{mentor.full_name}</h2></CardTitle><CardDescription className="mt-1">{mentor.headline}</CardDescription></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {mentor.bio && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {mentor.bio}
          </p>
        )}
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {mentor.skills.map((skill) => (
            <Badge key={skill} className="max-w-full [overflow-wrap:anywhere]" tone={shared.has(skill.toLowerCase()) ? "accent" : "neutral"}>
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
        <CardFooter className="mt-auto">
          <RequestButton mentorId={mentor.id} />
        </CardFooter>
      )}
    </Card>
  );
}
