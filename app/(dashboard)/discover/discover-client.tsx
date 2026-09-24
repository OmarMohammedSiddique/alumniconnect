"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MentorCard, type Mentor } from "./mentor-card";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border p-0.5">
          <Button
            type="button"
            size="sm"
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
          <form onSubmit={runKeywordSearch} className="flex flex-1 gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. machine learning, finance, negotiation"
              className="max-w-sm"
            />
            <Button type="submit" disabled={loading}>
              Search
            </Button>
          </form>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && notice && (
        <p className="text-sm text-muted-foreground">
          {notice}{" "}
          {notice.includes("profile") && (
            <Link href="/profile" className="underline underline-offset-4">
              Edit profile
            </Link>
          )}
        </p>
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
