import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { MatchUpdateStatus } from "@/lib/profile-match-update";

export function ProfileSetup({ isMentor, status, saving, unsaved }: {
  isMentor: boolean;
  status: MatchUpdateStatus;
  saving: boolean;
  unsaved: boolean;
}) {
  const updating = saving || status === "running" || status === "retrying";
  const ready = status === "done" && !updating;
  const steps = [
    "Account created",
    "Save your professional details",
    isMentor ? "Review introductions" : "Discover Mentors",
  ];

  return (
    <section id="profile-setup" aria-labelledby="profile-setup-title" className="border bg-card p-5 sm:p-6">
      <h2 id="profile-setup-title" className="text-lg font-semibold tracking-tight">
        {ready ? "Your match profile is ready" : isMentor ? "Build your Mentor profile" : "Find your first Mentor"}
      </h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
        {ready
          ? unsaved ? "Your last saved profile is ready. Save any newer edits to include them in matching." : "Your saved experience and interests can now inform recommendations."
          : "Start with a headline and relevant skills. You can add the other professional details later."}
      </p>
      <ol className="mt-5 grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => {
          const complete = index === 0 || (index === 1 && ready);
          const current = index === (ready ? 2 : 1);
          return (
            <li key={step} aria-current={current ? "step" : undefined} className={`border-t pt-3 text-sm ${current ? "font-semibold" : "text-muted-foreground"}`}>
              <span className="mb-2 flex items-center gap-2 text-xs tabular-nums">
                Step {index + 1}
                {complete && <><Check className="size-4 text-success-foreground" aria-hidden="true" /><span className="sr-only">Complete.</span></>}
              </span>
              {step}
            </li>
          );
        })}
      </ol>
      {updating ? (
        <p className="mt-4 text-sm">{saving ? "Saving your details…" : "Preparing your match profile…"}</p>
      ) : status === "failed" ? (
        <div className="mt-4 text-sm">
          <p>Matching setup could not finish. Add career details and save again, or retry below if your details are already saved.</p>
          <a href="#match-update" className="mt-2 inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">
            Retry the match-profile update below
          </a>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={isMentor ? "/requests" : "/discover"} className={buttonVariants({ variant: ready ? "default" : "outline" })}>
            {ready ? isMentor ? "View requests" : "Discover Mentors" : "Explore first"}
          </Link>
          {!ready && <p className="text-xs text-muted-foreground">You can return to profile setup at any time.</p>}
        </div>
      )}
    </section>
  );
}
