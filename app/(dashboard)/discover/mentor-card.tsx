import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestButton } from "./request-button";

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
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{mentor.full_name}</CardTitle>
            <CardDescription>{mentor.headline}</CardDescription>
          </div>
          {typeof mentor.similarity === "number" && (
            <span
              className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              title="Semantic match score"
            >
              {Math.round(mentor.similarity * 100)}% match
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {mentor.bio && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {mentor.bio}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {mentor.skills.map((skill) => (
            <span
              key={skill}
              className={
                shared.has(skill.toLowerCase())
                  ? "rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                  : "rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              }
            >
              {skill}
            </span>
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
        <CardFooter className="mt-2">
          <RequestButton mentorId={mentor.id} />
        </CardFooter>
      )}
    </Card>
  );
}
