"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CV_MAX_BYTES, type CvSuggestions } from "@/lib/cv-extract";
import { applyCvFill, applyCvOffer, type CvApplyPlan, type CvOffer, type ProfileDraftFields, planCvApply } from "@/lib/cv-apply";

interface CvImportProps {
  draft: ProfileDraftFields;
  /** Receives an update that is applied to the form's state at that moment. */
  onApply: (update: (current: ProfileDraftFields) => ProfileDraftFields) => void;
}

type Status = { kind: "idle" } | { kind: "reading" } | { kind: "error"; message: string } | { kind: "done"; plan: CvApplyPlan };

/**
 * Optional "fill from CV" step on the profile form (#108). The file is read on
 * our server and discarded; suggestions only change the form, never the saved
 * profile, until the member presses Save.
 */
function summary(status: Status): string {
  if (status.kind === "reading") return "Reading your CV.";
  if (status.kind === "error") return status.message;
  if (status.kind !== "done") return "";
  const filled = status.plan.filledLabels.length ? `Filled ${status.plan.filledLabels.join(", ")}.` : "";
  const offers = status.plan.offers.length ? ` ${status.plan.offers.length} suggestion${status.plan.offers.length === 1 ? "" : "s"} to review.` : "";
  return (filled + offers).trim() || "Your CV did not add anything new.";
}

export function CvImport({ draft, onApply }: CvImportProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  // The latest form values, so results are planned against what the member sees when they arrive.
  const latestDraft = useRef(draft);
  useEffect(() => {
    latestDraft.current = draft;
  }, [draft]);

  async function readCv() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ kind: "error", message: "Choose a PDF or Word (.docx) file first." });
      return;
    }
    if (file.size > CV_MAX_BYTES) {
      setStatus({ kind: "error", message: "Choose a CV smaller than 4 MB." });
      return;
    }
    setStatus({ kind: "reading" });
    setAccepted(new Set());
    try {
      const body = new FormData();
      body.append("cv", file);
      const response = await fetch("/api/cv/extract", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { suggestions?: CvSuggestions; error?: string };
      if (!response.ok || !result.suggestions) {
        const fallback = response.status === 413 ? "Choose a CV smaller than 4 MB." : "This CV could not be read. Try again.";
        setStatus({ kind: "error", message: result.error ?? fallback });
        return;
      }
      const plan = planCvApply(latestDraft.current, result.suggestions);
      // Fill against the form as it is now, so anything typed during the upload is kept.
      if (Object.keys(plan.fill).length) onApply((current) => applyCvFill(current, plan.fill));
      setStatus({ kind: "done", plan });
    } catch {
      setStatus({ kind: "error", message: "The CV could not be uploaded. Check your connection and try again." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function accept(offer: CvOffer) {
    if (accepted.has(offer.field)) return;
    onApply((current) => applyCvOffer(current, offer));
    setAccepted((current) => new Set(current).add(offer.field));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle><h2 className="flex items-center gap-2"><FileText className="size-4" aria-hidden="true" />Fill from your CV</h2></CardTitle>
        <CardDescription>
          Optional. Upload a PDF or Word (.docx) CV and we will suggest a headline, bio, skills, industry and graduation year.
          Nothing is saved until you review the form and press Save profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor={inputId}>CV file</Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-describedby={`${inputId}-help`}
              className="form-control min-w-0 flex-1 basis-64 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm"
            />
            <Button type="button" variant="outline" onClick={readCv} disabled={status.kind === "reading"}>
              {status.kind === "reading" ? "Reading CV…" : "Read CV"}
            </Button>
          </div>
          <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
            Up to 4 MB and 10 pages. Your CV is read on our server only to make these suggestions. It is not stored and is not shared with anyone.
          </p>
        </div>

        <p role="status" aria-live="polite" className="sr-only">{summary(status)}</p>
        {status.kind === "reading" && <p className="text-sm text-muted-foreground">Reading your CV…</p>}
        {status.kind === "error" && <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{status.message}</p>}
        {status.kind === "done" && (
          <div className="grid gap-3">
            {status.plan.filledLabels.length > 0 ? (
              <p className="rounded-md bg-muted/50 p-3 text-sm">
                Filled from your CV: {status.plan.filledLabels.join(", ")}. Check them below, then save your profile.
              </p>
            ) : status.plan.offers.length === 0 ? (
              <p className="rounded-md bg-muted/50 p-3 text-sm">Your CV did not add anything new to your current details.</p>
            ) : null}
            {status.plan.offers.length > 0 && (
              <div className="grid gap-2">
                <p className="text-sm font-medium">Suggestions for fields you have already filled in</p>
                <ul className="grid gap-2">
                  {status.plan.offers.map((offer) => {
                    const done = accepted.has(offer.field);
                    return (
                      <li key={offer.field} className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm">
                        <div className="min-w-0 flex-1 basis-56">
                          <p className="font-medium">{offer.label}</p>
                          <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">{offer.description}</p>
                        </div>
                        {/* The button stays in place after use so keyboard focus is not lost. */}
                        <Button type="button" size="xs" variant="outline" aria-disabled={done} onClick={() => accept(offer)}
                          className={done ? "opacity-60" : undefined}>
                          {done ? "Applied" : offer.field === "skills" ? "Add skills" : "Use this"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {status.plan.missingLabels.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Not found in your CV: {status.plan.missingLabels.join(", ")}. Add these yourself if you like.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
