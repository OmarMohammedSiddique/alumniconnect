"use client";

import { useId, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "@/components/ui/status-message";
import type { CvSuggestions } from "@/lib/cv-extract";
import { type CvApplyPlan, type CvOffer, type ProfileDraftFields, planCvApply } from "@/lib/cv-apply";

interface CvImportProps {
  draft: ProfileDraftFields;
  onApply: (patch: Partial<ProfileDraftFields>) => void;
}

type Status = { kind: "idle" } | { kind: "reading" } | { kind: "error"; message: string } | { kind: "done"; plan: CvApplyPlan };

/**
 * Optional "fill from CV" step on the profile form (#108). The file is read on
 * our server and discarded; suggestions only change the form, never the saved
 * profile, until the member presses Save.
 */
export function CvImport({ draft, onApply }: CvImportProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  async function readCv() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ kind: "error", message: "Choose a PDF or Word (.docx) file first." });
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
        setStatus({ kind: "error", message: result.error ?? "This CV could not be read. Try again." });
        return;
      }
      const plan = planCvApply(draft, result.suggestions);
      if (Object.keys(plan.fill).length) onApply(plan.fill);
      setStatus({ kind: "done", plan });
    } catch {
      setStatus({ kind: "error", message: "The CV could not be uploaded. Check your connection and try again." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function accept(offer: CvOffer) {
    onApply({ [offer.field]: offer.value });
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
            Up to 5 MB and 10 pages. Your CV is read on our server only to make these suggestions. It is not stored and is not shared with anyone.
          </p>
        </div>

        <div role="status" aria-live="polite" className="grid gap-3">
          {status.kind === "reading" && <p className="text-sm text-muted-foreground">Reading your CV…</p>}
          {status.kind === "error" && <StatusMessage tone="error">{status.message}</StatusMessage>}
          {status.kind === "done" && (
            <>
              {status.plan.filledLabels.length > 0 ? (
                <StatusMessage tone="success">
                  Filled from your CV: {status.plan.filledLabels.join(", ")}. Check them below, then save your profile.
                </StatusMessage>
              ) : status.plan.offers.length === 0 ? (
                <StatusMessage>Your CV did not add anything new to your current details.</StatusMessage>
              ) : null}
              {status.plan.offers.length > 0 && (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Suggestions for fields you have already filled in</p>
                  <ul className="grid gap-2">
                    {status.plan.offers.map((offer) => (
                      <li key={offer.field} className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm">
                        <div className="min-w-0 flex-1 basis-56">
                          <p className="font-medium">{offer.label}</p>
                          <p className="mt-0.5 line-clamp-3 break-words text-muted-foreground">{offer.description}</p>
                        </div>
                        {accepted.has(offer.field) ? (
                          <span className="text-xs text-muted-foreground">Applied</span>
                        ) : (
                          <Button type="button" size="xs" variant="outline" onClick={() => accept(offer)}>
                            {offer.field === "skills" ? "Add skills" : "Use this"}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {status.plan.missingLabels.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Not found in your CV: {status.plan.missingLabels.join(", ")}. Add these yourself if you like.
                </p>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
