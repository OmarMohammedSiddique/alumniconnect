"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blockMemberAction } from "@/app/(dashboard)/actions/safety";

interface BlockDialogProps {
  targetId: string;
  targetName: string;
  isOpen: boolean;
  onClose: () => void;
  onBlocked?: () => void;
}

export function BlockDialog({
  targetId,
  targetName,
  isOpen,
  onClose,
  onBlocked,
}: BlockDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBlock = () => {
    setError(null);
    startTransition(async () => {
      const res = await blockMemberAction(targetId);
      if (res.ok) {
        onBlocked?.();
        onClose();
      } else {
        setError(res.error || "Failed to block member.");
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
          aria-label="Close dialog"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="grid size-10 place-items-center rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="block-dialog-title" className="text-lg font-semibold">
              Block {targetName}?
            </h2>
            <p className="text-xs text-muted-foreground">
              Prevent future interactions with this member.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3 py-1 text-sm text-muted-foreground">
          <p>When you block {targetName}:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>You will no longer appear in each other’s recommendations or keyword searches.</li>
            <li>Neither party can send new mentorship requests.</li>
            <li>{targetName} will not be notified that they were blocked.</li>
            <li>You can manage or unblock members anytime from your Profile settings.</li>
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleBlock}
            disabled={isPending}
          >
            {isPending ? "Blocking..." : "Block member"}
          </Button>
        </div>
      </div>
    </div>
  );
}
