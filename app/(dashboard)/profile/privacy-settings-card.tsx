"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, ShieldAlert, ShieldCheck, UserX } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  unblockMemberAction,
  updateProfileVisibilityAction,
} from "@/app/(dashboard)/actions/safety";

export interface BlockedMember {
  blocked_id: string;
  full_name: string | null;
  role: string | null;
  blocked_at: string;
}

interface PrivacySettingsCardProps {
  memberVisible: boolean;
  staffHidden: boolean;
  isVisible: boolean;
  blockedMembers: BlockedMember[];
}

export function PrivacySettingsCard({
  memberVisible: initialMemberVisible,
  staffHidden,
  blockedMembers: initialBlockedMembers,
}: PrivacySettingsCardProps) {
  const [memberVisible, setMemberVisible] = useState(initialMemberVisible);
  const [blockedList, setBlockedList] = useState<BlockedMember[]>(initialBlockedMembers);
  const [visibilityMessage, setVisibilityMessage] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [unblockError, setUnblockError] = useState<string | null>(null);
  const [isPendingVisibility, startVisibilityTransition] = useTransition();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const effectiveVisible = memberVisible && !staffHidden;

  const handleToggleVisibility = (newValue: boolean) => {
    setVisibilityMessage(null);
    setVisibilityError(null);
    setMemberVisible(newValue);

    startVisibilityTransition(async () => {
      const res = await updateProfileVisibilityAction(newValue);
      if (res.ok) {
        setVisibilityMessage(res.message || "Visibility updated.");
      } else {
        setVisibilityError(res.error || "Failed to update visibility.");
        setMemberVisible(!newValue); // revert
      }
    });
  };

  const handleUnblock = async (blockedId: string) => {
    setUnblockingId(blockedId);
    setUnblockError(null);
    try {
      const res = await unblockMemberAction(blockedId);
      if (res.ok) {
        setBlockedList((prev) => prev.filter((m) => m.blocked_id !== blockedId));
      } else {
        setUnblockError(res.error || "Could not unblock this member.");
      }
    } catch {
      setUnblockError("Could not unblock this member. Please try again.");
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="grid gap-6 mt-8">
      {/* Visibility preference */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {effectiveVisible ? (
              <Eye className="size-5 text-primary" aria-hidden="true" />
            ) : (
              <EyeOff className="size-5 text-muted-foreground" aria-hidden="true" />
            )}
            <CardTitle>Discovery & Profile Visibility</CardTitle>
          </div>
          <CardDescription>
            Control whether your profile appears in alumni recommendations, search results, and mentor listings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {staffHidden ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200 text-sm">
              <ShieldAlert className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <p className="font-semibold">Profile restricted by staff moderation</p>
                <p className="text-xs leading-relaxed opacity-90">
                  Your profile has been placed on private status by our moderation team and cannot be discovered by the community. Member visibility preferences cannot override a staff moderation restriction.
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 bg-surface">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Public discovery preference</span>
                <Badge tone={memberVisible && !staffHidden ? "accent" : "neutral"}>
                  {staffHidden
                    ? "Hidden by Staff"
                    : memberVisible
                    ? "Visible"
                    : "Hidden"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {memberVisible
                  ? "Your profile is discoverable by members in search and AI recommendations."
                  : "Your profile is hidden from search and recommendations. Existing connections can still view your details."}
              </p>
            </div>

            <Button
              type="button"
              variant={memberVisible ? "outline" : "default"}
              size="sm"
              disabled={staffHidden || isPendingVisibility}
              onClick={() => handleToggleVisibility(!memberVisible)}
            >
              {isPendingVisibility
                ? "Updating..."
                : memberVisible
                ? "Hide profile"
                : "Make visible"}
            </Button>
          </div>

          {visibilityMessage && (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <ShieldCheck className="size-4" />
              <span>{visibilityMessage}</span>
            </div>
          )}

          {visibilityError && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <ShieldAlert className="size-4" />
              <span>{visibilityError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="size-5 text-muted-foreground" aria-hidden="true" />
              <CardTitle>Blocked Members</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              {blockedList.length} / 100 blocked
            </span>
          </div>
          <CardDescription>
            Members you block cannot see your profile, match with you, or send mentorship requests. Blocked members are not notified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unblockError && (
            <div className="mb-3 flex items-center gap-2 text-xs text-destructive" role="alert">
              <ShieldAlert className="size-4" />
              <span>{unblockError}</span>
            </div>
          )}
          {blockedList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              You haven’t blocked any members.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {blockedList.map((member) => (
                <div
                  key={member.blocked_id}
                  className="flex items-center justify-between p-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {member.full_name || "Alumni Member"}
                      </span>
                      {member.role && (
                        <Badge tone="neutral" className="capitalize text-[10px] py-0">
                          {member.role}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Blocked on {new Date(member.blocked_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={unblockingId === member.blocked_id}
                    onClick={() => handleUnblock(member.blocked_id)}
                  >
                    {unblockingId === member.blocked_id ? "Unblocking..." : "Unblock"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
