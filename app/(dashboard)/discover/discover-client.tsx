"use client";

import { useEffect, useState } from "react";
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

type Mode = "semantic" | "keyword";

export function DiscoverClient({ canRequest }: { canRequest: boolean }) {
  const [mode, setMode] = useState<Mode>("semantic");
  const [query, setQuery] = useState("");
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

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
          setNotice(body.error ?? "Could not load matches.");
        } else {
          setMentors(body.matches);
        }
      })
      .catch(() => !cancelled && setNotice("Could not load matches."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Keyword mode: Postgres full-text search over profiles (under RLS).
  async function runKeywordSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setNotice(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("search_mentors", {
      search_query: query,
      match_count: 20,
    });
    if (error) {
      setNotice("Search failed. Try different terms.");
      setMentors([]);
    } else {
      setMentors(data);
      if (data.length === 0) setNotice("No mentors matched that search.");
    }
    setLoading(false);
  }

  return (
    <div className="grid gap-6" aria-busy={loading}>
      <div className="grid gap-5 rounded-lg border bg-card p-4 sm:p-5">
        <div role="group" aria-label="Mentor discovery mode" className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg border bg-surface p-1">
          <Button
            type="button"
            size="sm"
            aria-pressed={mode === "semantic"}
            variant={mode === "semantic" ? "secondary" : "ghost"}
            onClick={() => {
              if (mode === "semantic") return;
              setLoading(true);
              setNotice(null);
              setMode("semantic");
            }}
          >
            Recommended
          </Button>
          <Button
            type="button"
            size="sm"
            aria-pressed={mode === "keyword"}
            variant={mode === "keyword" ? "secondary" : "ghost"}
            onClick={() => {
              setLoading(false);
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
      </div>

      {loading && <LoadingState label="Finding relevant Mentors" />}

      {!loading && notice && (
        <StatusMessage tone={notice.includes("failed") || notice.includes("Could not") ? "error" : "info"}>
          {notice}{" "}
          {notice.includes("profile") && (
            <Link href="/profile" className="underline underline-offset-4">
              Edit profile
            </Link>
          )}
        </StatusMessage>
      )}

      {!loading && mentors && mentors.length === 0 && !notice && (
        <EmptyState title="No recommendations yet" action={<Link href="/profile" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Complete your profile</Link>}>
          Add your skills and interests to help us find relevant Mentors. You can also switch to keyword search.
        </EmptyState>
      )}

      {!loading && mentors && mentors.length > 0 && (
        <StaggerReveal className="grid gap-4 lg:grid-cols-2">
          {mentors.map((m) => (
            <MentorCard key={m.id} mentor={m} canRequest={canRequest} />
          ))}
        </StaggerReveal>
      )}
    </div>
  );
}
