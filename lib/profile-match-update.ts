export type MatchUpdateStatus = "idle" | "running" | "retrying" | "done" | "failed";

export function createProfileMatchUpdater(
  onStatus: (status: MatchUpdateStatus) => void,
  request: typeof fetch = fetch,
) {
  let pending: Promise<void> | null = null;
  let latestRun = 0;

  return (retry = false): Promise<void> => {
    if (retry && pending) return pending;

    const run = ++latestRun;
    onStatus(retry ? "retrying" : "running");
    // Finish the previous request before refreshing a newly saved profile.
    const next = (pending ?? Promise.resolve()).then(async () => {
      let status: MatchUpdateStatus;
      try {
        const response = await request("/api/embed", { method: "POST" });
        status = response.ok ? "done" : "failed";
      } catch {
        status = "failed";
      }
      if (run === latestRun) onStatus(status);
    });

    pending = next;
    void next.finally(() => {
      if (pending === next) pending = null;
    });
    return next;
  };
}
