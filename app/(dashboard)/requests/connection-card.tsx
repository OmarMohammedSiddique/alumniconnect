"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildKickstarterMessage } from "@/lib/connection-kickstarter";

interface ConnectionCardProps {
  connectionId: string;
  isMentor: boolean;
  connectedSince: string;
  partner: {
    fullName: string;
    role: string;
    headline: string;
    industry: string;
  };
}

export function ConnectionCard({
  isMentor,
  connectedSince,
  partner,
}: ConnectionCardProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const starterMessage = buildKickstarterMessage({
    isMentor,
    partnerName: partner.fullName,
    partnerIndustry: partner.industry,
  });

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(starterMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback if clipboard permission is denied
    }
  };

  return (
    <Card className="transition-shadow hover:shadow-xs">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="break-words text-base">
              <h3>{partner.fullName || "Unnamed member"}</h3>
            </CardTitle>
            {partner.headline && (
              <p className="mt-1 text-sm text-muted-foreground">{partner.headline}</p>
            )}
            <CardDescription className="mt-1">
              Connected since{" "}
              {new Date(connectedSince).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {partner.industry && (
              <Badge tone="neutral" className="capitalize">
                {partner.industry}
              </Badge>
            )}
            <Badge tone="success">Connected</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 border-t pt-4">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium">Next step: Arrange your first conversation</h4>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
            >
              {open ? "Hide starter template" : "View starter template"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isMentor
              ? "Introduce yourself, share your preferred meeting format (e.g. video call or email), and offer initial availability."
              : "Share your top mentorship goals and suggest 2–3 suitable times for a brief introductory call."}
          </p>
        </div>

        {open && (
          <div className="grid gap-3 rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">Suggested introduction note</span>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={handleCopy}
                className="gap-1.5"
                aria-label="Copy starter note to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-success-foreground" aria-hidden="true" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" aria-hidden="true" />
                    <span>Copy template</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded border bg-background p-2.5 font-sans text-xs text-muted-foreground">
              {starterMessage}
            </pre>
            <span role="status" className="sr-only">
              {copied ? "Starter template copied to clipboard." : ""}
            </span>
            <p className="text-[11px] text-muted-foreground">
              Privacy note: Direct contact details are shared only when you both choose to communicate. Account email addresses remain unlisted to protect member privacy.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
