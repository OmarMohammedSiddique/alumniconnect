"use client";

import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildKickstarterMailto,
  buildKickstarterMessage,
} from "@/lib/connection-kickstarter";
import { SafetyActionsMenu } from "@/components/safety/safety-actions-menu";
import { JourneyTracker } from "./journey-tracker";
import { ContactShareForm, FirstConversationToggle, PartnerContact } from "./journey-controls";

interface ConnectionCardProps {
  connectionId: string;
  isMentor: boolean;
  connectedSince: string;
  myContact: string | null;
  partnerContact: string | null;
  firstConversationAt: string | null;
  partner: {
    id?: string;
    fullName: string;
    role: string;
    headline: string;
    industry: string;
    available?: boolean;
  };
}

export function ConnectionCard({
  connectionId,
  isMentor,
  connectedSince,
  myContact,
  partnerContact,
  firstConversationAt,
  partner,
}: ConnectionCardProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const isAvailable = partner.available !== false;

  if (isBlocked) return null;

  const starterMessage = buildKickstarterMessage({
    isMentor,
    partnerName: partner.fullName,
    partnerIndustry: partner.industry,
    preferredContact: myContact ?? "",
  });

  const mailtoHref = buildKickstarterMailto({
    isMentor,
    partnerName: partner.fullName,
    partnerIndustry: partner.industry,
    preferredContact: myContact ?? "",
    recipient: partnerContact,
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
            {partner.industry && isAvailable && (
              <Badge tone="neutral" className="capitalize">
                {partner.industry}
              </Badge>
            )}
            <Badge tone={isAvailable ? "success" : "neutral"}>
              {isAvailable ? "Connected" : "Profile unavailable"}
            </Badge>
            {partner.id && (
              <SafetyActionsMenu
                targetId={partner.id}
                targetName={partner.fullName}
                onBlocked={() => setIsBlocked(true)}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 border-t pt-4">
        {!isAvailable ? (
          <p className="text-xs text-muted-foreground" role="status">
            This member’s profile is currently unavailable. First-conversation actions and contact sharing are paused while the profile is unavailable.
          </p>
        ) : (
          <>
            <JourneyTracker
              requestStatus="accepted"
              viewer={isMentor ? "mentor" : "mentee"}
              partnerName={partner.fullName}
              myContact={myContact}
              partnerContact={partnerContact}
              firstConversationAt={firstConversationAt}
            />
            <div className="grid gap-3 rounded-md border p-3">
              <PartnerContact name={partner.fullName} contact={partnerContact} />
              <ContactShareForm connectionId={connectionId} partnerName={partner.fullName} myContact={myContact} />
            </div>
            <FirstConversationToggle connectionId={connectionId} heldAt={firstConversationAt} />
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium">Need help with a first message?</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setOpen((prev) => !prev)}
                  aria-expanded={open}
                >
                  {open ? "Hide starter template" : "Prepare first conversation"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isMentor
                  ? "A short template to introduce yourself and offer initial availability."
                  : "A short template to share your top goals and suggest two or three suitable times."}
              </p>
            </div>

            {open && (
              <div className="grid gap-3 rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
                <p className="text-[11px] text-muted-foreground">
                  {myContact ? "Includes the contact detail you shared above." : "Share a contact detail above and it is added to this note."}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">Suggested introduction note</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={mailtoHref}
                      className={buttonVariants({ variant: "outline", size: "xs" }) + " gap-1.5"}
                    >
                      <Mail className="size-3.5" aria-hidden="true" />
                      <span>Open in email app</span>
                    </a>
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
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded border bg-background p-2.5 font-sans text-xs text-muted-foreground">
                  {starterMessage}
                </pre>
                <span role="status" className="sr-only">
                  {copied ? "Starter template copied to clipboard." : ""}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Privacy note: Direct contact details are shared only when you explicitly include them. Account email addresses remain unlisted to protect member privacy; automated notification delivery is tracked separately.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
