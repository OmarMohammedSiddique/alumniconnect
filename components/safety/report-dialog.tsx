"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { AlertCircle, CheckCircle2, Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  MAX_REPORT_DETAILS_LENGTH,
  type ReportReason,
} from "@/lib/profile-privacy";
import {
  reportMemberAction,
  type ReportActionState,
} from "@/app/(dashboard)/actions/safety";

interface ReportDialogProps {
  reportedId: string;
  reportedName: string;
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted?: () => void;
}

const initialState: ReportActionState = { ok: false };

export function ReportDialog({
  reportedId,
  reportedName,
  isOpen,
  onClose,
  onReportSubmitted,
}: ReportDialogProps) {
  const reasonSelectId = useId();
  const detailsInputId = useId();
  const [details, setDetails] = useState("");
  const [selectedReason, setSelectedReason] = useState<ReportReason>(REPORT_REASONS[0]);

  const [state, formAction, isPending] = useActionState(
    reportMemberAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      onReportSubmitted?.();
    }
  }, [state.ok, onReportSubmitted]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl sm:p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
          aria-label="Close report dialog"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="grid size-10 place-items-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
            <Flag className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="report-dialog-title" className="text-lg font-semibold">
              Report {reportedName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Help us keep the AlumniKonneQt community safe and respectful.
            </p>
          </div>
        </div>

        {state.ok ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-700 dark:text-green-300">
              <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Report submitted</p>
                <p className="mt-1 text-xs text-green-700/80 dark:text-green-300/80">
                  {state.message ||
                    "Thank you for helping keep our community safe. Our moderation team will review this report."}
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="reported_id" value={reportedId} />

            {state.error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={reasonSelectId}>Reason for report</Label>
              <select
                id={reasonSelectId}
                name="reason"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value as ReportReason)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                required
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {REPORT_REASON_LABELS[reason]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={detailsInputId}>
                  Additional details <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {details.length} / {MAX_REPORT_DETAILS_LENGTH}
                </span>
              </div>
              <textarea
                id={detailsInputId}
                name="details"
                rows={4}
                value={details}
                maxLength={MAX_REPORT_DETAILS_LENGTH}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide any relevant context to assist our moderators..."
                className="w-full rounded-md border bg-background p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Reports are strictly confidential and reviewed only by staff. {reportedName} will not see this report or know who submitted it.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending}
              >
                {isPending ? "Submitting..." : "Submit report"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
