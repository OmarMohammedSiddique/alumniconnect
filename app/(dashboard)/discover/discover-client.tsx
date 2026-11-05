"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MentorCard, type Mentor } from "./mentor-card";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusMessage } from "@/components/ui/status-message";
import {
  extractAvailableFilters,
  filterMentors,
  getActiveRelationshipStatus,
  type MentorRequestState,
} from "@/lib/discovery-filters";

type Mode = "semantic" | "keyword";

export function DiscoverClient({
  canRequest,
  isMentor,
  initialRequestMap = {},
}: {
  canRequest: boolean;
  isMentor: boolean;
  initialRequestMap?: Record<string, MentorRequestState>;
}) {
  const [mode, setMode] = useState<Mode>("semantic");
  const [query, setQuery] = useState("");
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  // Local overrides layered on top of server-provided initialRequestMap
  const [localRequestOverrides, setLocalRequestOverrides] = useState<
    Record<string, MentorRequestState | null>
  >({});

  const requestMap = useMemo(() => {
    const merged: Record<string, MentorRequestState> = { ...initialRequestMap };
    for (const [id, status] of Object.entries(localRequestOverrides)) {
      if (status === null) {
        delete merged[id];
      } else {
        merged[id] = status;
      }
    }
    return merged;
  }, [initialRequestMap, localRequestOverrides]);

  // Filter state
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedGraduationYear, setSelectedGraduationYear] = useState<string>("all");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [onlyAccepting, setOnlyAccepting] = useState(false);
  const [semanticRetryTick, setSemanticRetryTick] = useState(0);
  const [searchError, setSearchError] = useState(false);
  const searchSeqRef = useRef(0);

  // Semantic mode: ranked matches from /api/match (pgvector cosine).
  useEffect(() => {
    if (mode !== "semantic") return;
    let cancelled = false;
    fetch("/api/match", { method: "POST", body: JSON.stringify({ count: 12 }) })
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setMentors([]);
          setNeedsProfile(res.status === 422);
          setSearchError(res.status !== 422);
          setNotice(res.status === 422 ? null : body.error ?? "Could not load matches.");
        } else {
          setNeedsProfile(false);
          setSearchError(false);
          setMentors(body.matches);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSearchError(true);
          setNotice("Could not load matches.");
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [mode, semanticRetryTick]);

  // Keyword mode: Postgres full-text search over profiles (under RLS).
  async function executeKeywordSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const reqId = ++searchSeqRef.current;
    setLoading(true);
    setSearchError(false);
    setNotice(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("search_mentors", {
      search_query: trimmed,
      match_count: 20,
    });
    // Guard against superseded searches or mode switches
    if (reqId !== searchSeqRef.current) return;
    if (error) {
      setSearchError(true);
      setNotice("Search failed. Try different terms or retry.");
      setMentors([]);
    } else {
      setSearchError(false);
      setMentors(data);
      if (data.length === 0) setNotice("No mentors matched that search.");
    }
    setLoading(false);
  }

  async function runKeywordSearch(e: React.FormEvent) {
    e.preventDefault();
    await executeKeywordSearch(query);
  }

  // Derive unique industries, graduation cohort years, and skills from loaded mentors
  const { industries, graduationYears, skills: availableSkills } = useMemo(() => {
    return extractAvailableFilters(mentors ?? []);
  }, [mentors]);

  // Apply filters
  const filteredMentors = useMemo(() => {
    return filterMentors(mentors ?? [], {
      industry: selectedIndustry,
      graduationYear: selectedGraduationYear,
      skills: selectedSkills,
      matchMode: "any",
      onlyAccepting,
    });
  }, [mentors, selectedIndustry, selectedGraduationYear, selectedSkills, onlyAccepting]);

  const hasActiveFilters =
    selectedIndustry !== "all" ||
    selectedGraduationYear !== "all" ||
    selectedSkills.length > 0 ||
    onlyAccepting;

  function resetFilters() {
    setSelectedIndustry("all");
    setSelectedGraduationYear("all");
    setSelectedSkills([]);
    setOnlyAccepting(false);
  }

  function toggleSkillFilter(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  function handleRequestSent(mentorId: string) {
    setLocalRequestOverrides((prev) => ({
      ...prev,
      [mentorId]: "pending",
    }));
  }

  function handleMentorBlocked(mentorId: string) {
    setMentors((prev) => (prev ? prev.filter((m) => m.id !== mentorId) : prev));
    setLocalRequestOverrides((prev) => ({
      ...prev,
      [mentorId]: null,
    }));
  }

  return (
    <div className="grid gap-6" aria-busy={loading}>
      <div className="grid gap-5 rounded-lg border bg-card p-4 sm:p-5">
        <div
          role="group"
          aria-label="Mentor discovery mode"
          className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg border bg-surface p-1"
        >
          <Button
            type="button"
            size="sm"
            aria-pressed={mode === "semantic"}
            variant={mode === "semantic" ? "default" : "ghost"}
            onClick={() => {
              if (mode === "semantic") return;
              searchSeqRef.current++;
              setLoading(true);
              setSearchError(false);
              setNotice(null);
              setNeedsProfile(false);
              setMode("semantic");
            }}
          >
            Recommended
          </Button>
          <Button
            type="button"
            size="sm"
            aria-pressed={mode === "keyword"}
            variant={mode === "keyword" ? "default" : "ghost"}
            onClick={() => {
              searchSeqRef.current++;
              setLoading(false);
              setSearchError(false);
              setNeedsProfile(false);
              setMode("keyword");
              setMentors([]);
              setNotice("Search mentors by name, skill, or field.");
            }}
          >
            Keyword search
          </Button>
        </div>

        {mode === "keyword" && (
          <form onSubmit={runKeywordSearch} role="search" className="grid gap-2">
            <Label htmlFor="mentor-search">Search by name, skill, or field</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="mentor-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try finance, engineering, or leadership"
                className="max-w-xl"
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Searching…" : "Search"}
              </Button>
            </div>
          </form>
        )}

        {/* Discovery Filter Controls */}
        {!loading && (mentors?.length ?? 0) > 0 && (
          <div className="grid gap-3 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Filter Discovery Results
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-primary underline underline-offset-2 hover:opacity-80"
                >
                  Reset all filters
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Industry Dropdown */}
              {industries.length > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="filter-industry" className="text-xs text-muted-foreground">
                    Industry:
                  </label>
                  <select
                    id="filter-industry"
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All Industries ({industries.length})</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Cohort (Graduation Year) Dropdown (#7, #16) */}
              {graduationYears.length > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="filter-cohort" className="text-xs text-muted-foreground">
                    Cohort:
                  </label>
                  <select
                    id="filter-cohort"
                    value={selectedGraduationYear}
                    onChange={(e) => setSelectedGraduationYear(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All Cohorts ({graduationYears.length})</option>
                    {graduationYears.map((yr) => (
                      <option key={yr} value={String(yr)}>
                        Class of {yr}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Availability Toggle (#16) */}
              <button
                type="button"
                onClick={() => setOnlyAccepting((prev) => !prev)}
                aria-pressed={onlyAccepting}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
                  onlyAccepting
                    ? "border-primary bg-primary text-primary-foreground font-medium"
                    : "border-input bg-background text-muted-foreground hover:bg-surface"
                }`}
              >
                Accepting new requests
                {onlyAccepting && <span aria-hidden="true">✕</span>}
              </button>

              {/* Active Filter Counter */}
              {hasActiveFilters && (
                <span className="text-xs text-muted-foreground">
                  Showing {filteredMentors.length} of {mentors?.length ?? 0} mentors
                </span>
              )}
            </div>

            {/* Skill Filter Chips */}
            {availableSkills.length > 0 && (
              <div className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">Filter by skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {availableSkills.slice(0, 15).map((skill) => {
                    const isSelected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkillFilter(skill)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-medium"
                            : "bg-surface border text-muted-foreground hover:bg-surface-hover"
                        }`}
                        aria-pressed={isSelected}
                      >
                        {skill}
                        {isSelected && <span aria-hidden="true">✕</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && <LoadingState label="Finding relevant Mentors" />}

      {!loading && needsProfile && (
        <EmptyState
          title={isMentor ? "Help Mentees understand your experience" : "Start with your career direction"}
          action={
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
            >
              Set up your profile
            </Link>
          }
        >
          Add a headline and relevant skills, save your profile, and wait for the match-profile update to finish.
          {isMentor
            ? " You can then review incoming introductions on your requests page."
            : " Then return here for recommendations."}{" "}
          You can use keyword search while you get set up.
        </EmptyState>
      )}

      {!loading && notice && (
        <StatusMessage tone={searchError || notice.includes("failed") || notice.includes("Could not") ? "error" : "info"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {notice}{" "}
              {notice.includes("profile") && (
                <Link href="/profile" className="underline underline-offset-4">
                  Edit profile
                </Link>
              )}
            </span>
            {searchError && (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => {
                  if (mode === "semantic") {
                    setLoading(true);
                    setSearchError(false);
                    setNotice(null);
                    setSemanticRetryTick((t) => t + 1);
                  } else {
                    void executeKeywordSearch(query);
                  }
                }}
              >
                Retry
              </Button>
            )}
          </div>
        </StatusMessage>
      )}

      {!loading && mentors && mentors.length === 0 && !notice && !needsProfile && (
        <EmptyState
          title="No Mentors to recommend yet"
          action={
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4"
            >
              Review your profile
            </Link>
          }
        >
          Try keyword search or check back as Mentors join. You can also review your saved interests to keep
          recommendations relevant.
        </EmptyState>
      )}

      {/* When mentors exist but none match the applied filter */}
      {!loading && (mentors?.length ?? 0) > 0 && filteredMentors.length === 0 && (
        <EmptyState
          title="No mentors match your active filters"
          action={
            <Button type="button" size="sm" onClick={resetFilters}>
              Reset all filters
            </Button>
          }
        >
          Try adjusting or clearing your industry and skill filters to see more mentor recommendations.
        </EmptyState>
      )}

      {/* Render Mentor Cards */}
      {!loading && filteredMentors.length > 0 && (
        <StaggerReveal className="grid gap-4 lg:grid-cols-2">
          {filteredMentors.map((m) => (
            <MentorCard
              key={m.id}
              mentor={m}
              mode={mode}
              canRequest={canRequest}
              requestStatus={getActiveRelationshipStatus(m.id, requestMap)}
              onRequestSent={handleRequestSent}
              onBlocked={handleMentorBlocked}
            />
          ))}
        </StaggerReveal>
      )}
    </div>
  );
}
