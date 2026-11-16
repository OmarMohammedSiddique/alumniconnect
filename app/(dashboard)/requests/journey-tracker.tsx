import { Check, CircleDot, Circle, CircleSlash } from "lucide-react";
import {
  getJourneyProgress,
  getNextStep,
  JOURNEY_STAGES,
  type JourneyInput,
  type JourneyViewer,
} from "@/lib/connection-journey";

interface JourneyTrackerProps extends JourneyInput {
  viewer: JourneyViewer;
  partnerName: string;
}

/** Stage-by-stage view of a mentorship request, with the next step for this person. */
export function JourneyTracker(props: JourneyTrackerProps) {
  const progress = getJourneyProgress(props);
  const step = getNextStep(props);

  return (
    <div className="grid gap-3">
      <ol aria-label="Mentorship journey" className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {JOURNEY_STAGES.map((stage, index) => {
          const done = progress.completed.includes(stage.key);
          const current = progress.current === stage.key;
          const endedHere = progress.ended && index === 1;
          const Icon = done ? Check : current ? CircleDot : endedHere ? CircleSlash : Circle;
          const label = endedHere ? (progress.ended === "declined" ? "Declined" : "Withdrawn") : stage.label;
          return (
            <li
              key={stage.key}
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-1.5 ${done || current || endedHere ? "text-foreground" : "text-muted-foreground"} ${current ? "font-semibold" : ""}`}
            >
              <Icon className={`size-3.5 shrink-0 ${current ? "text-primary" : ""}`} aria-hidden="true" />
              <span>{label}</span>
              <span className="sr-only">{done ? "(done)" : current ? "(current step)" : endedHere ? "" : "(not yet)"}</span>
            </li>
          );
        }).slice(0, progress.ended ? 2 : undefined)}
      </ol>
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-sm font-medium">{step.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
      </div>
    </div>
  );
}
