"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { StatusMessage } from "@/components/ui/status-message";
import { MentorCard } from "./mentor-card";
import { getActiveRelationshipStatus, type MentorRequestState } from "@/lib/discovery-filters";
import type { ModelComparisonResponse } from "@/lib/model-comparison";

export function ModelComparison({ canRequest, requestMap, onRequestSent, onBlocked }: {
  canRequest: boolean;
  requestMap: Record<string, MentorRequestState>;
  onRequestSent: (id: string) => void;
  onBlocked: (id: string) => void;
}) {
  const [result, setResult] = useState<ModelComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/match/compare", { method: "POST", signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setNeedsProfile(response.status === 422);
          setError(body.error ?? "Could not compare models. Please retry.");
        } else setResult(body);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Could not compare models. Please retry.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  function refresh() {
    setResult(null);
    setError(null);
    setNeedsProfile(false);
    setLoading(true);
    setRevision((value) => value + 1);
  }

  function removeBlocked(id: string) {
    setResult((previous) => previous ? { ...previous, models: previous.models.map((model) => ({
      ...model, matches: model.matches.filter((mentor) => mentor.id !== id),
    })) } : previous);
    onBlocked(id);
  }

  return (
    <section className="grid min-w-0 gap-5" aria-label="Live model comparison" aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-xl font-semibold">Two models, one mentor pool</h2>
          <p className="text-sm text-muted-foreground">
            Both models rank mentors using your saved headline, bio, skills, and industry.
            Your trained model is an experimental pilot trained on unreviewed synthetic labels.
          </p>
          <p className="text-sm text-muted-foreground">
            Scores show similarity within each model, not accuracy or a probability of mentorship success.
            Compare the rankings rather than score sizes between models.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={refresh} disabled={loading}>
          {loading ? "Comparing…" : "Run comparison again"}
        </Button>
      </div>
      {loading && <LoadingState label="Running both models on your saved profile" />}
      {error && <StatusMessage tone="error">
        {error}{needsProfile && <> <Link href="/profile" className="underline">Edit your profile</Link></>}
      </StatusMessage>}
      {result && <>
        <p className="text-sm text-muted-foreground" role="status">
          {result.candidateCount === 0 ? "No visible mentors are available to compare yet." :
            `Showing up to five results per model from the same ${result.candidateCount} mentors.`}
          {result.truncated && " This preview uses the first 50 visible mentors ordered by ID, not the entire community."}
          {" "}Timings include inference and any model startup for this request; they are not accuracy measurements.
        </p>
        <div className="grid min-w-0 gap-8 xl:grid-cols-2">
          {result.models.map((model) => <section key={model.id} aria-label={`${model.name} results`} className="min-w-0 space-y-4">
            <header className="space-y-1 border-b pb-3">
              <h3 className="text-lg font-semibold">{model.name}{model.dimensions === 64 ? " · Experimental" : " · Pretrained"}</h3>
              <p className="text-xs text-muted-foreground">{model.dimensions} dimensions · {model.elapsedMs.toLocaleString()} ms</p>
              <p className="break-all text-xs text-muted-foreground">Version: {model.id}</p>
            </header>
            {model.error ? <StatusMessage tone="error">{model.error}</StatusMessage> :
              <ol className="space-y-4">
                {model.matches.map((mentor, index) => <li key={mentor.id} className="space-y-2">
                  <p className="text-sm font-medium">Rank {index + 1} <span className="text-muted-foreground">· Similarity {mentor.similarity.toFixed(3)}</span></p>
                  <MentorCard mentor={mentor} mode="semantic" canRequest={canRequest}
                    requestStatus={getActiveRelationshipStatus(mentor.id, requestMap)}
                    onRequestSent={onRequestSent} onBlocked={removeBlocked} />
                </li>)}
              </ol>}
          </section>)}
        </div>
      </>}
    </section>
  );
}
