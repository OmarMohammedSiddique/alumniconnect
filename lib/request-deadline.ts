// Bound the whole operation, including response-body reads. Racing the deadline
// also protects the UI when a dependency fails to honour cancellation.
export async function withRequestDeadline<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parent?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const deadline = new Promise<never>((_, reject) => {
    const stop = (reason: unknown) => {
      controller.abort(reason);
      reject(reason);
    };
    timer = setTimeout(() => stop(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
    onAbort = () => stop(parent?.reason ?? new DOMException("Request cancelled", "AbortError"));
    parent?.addEventListener("abort", onAbort, { once: true });
    if (parent?.aborted) onAbort();
  });
  try {
    return await Promise.race([
      deadline,
      controller.signal.aborted ? deadline : run(controller.signal),
    ]);
  } finally {
    clearTimeout(timer);
    if (onAbort) parent?.removeEventListener("abort", onAbort);
  }
}

export function discoveryFailureMessage(status: number, fallback: string, retryAfter: string | null = null) {
  if (status === 401) return "Your session has expired. Sign in again to load results.";
  if (status === 429) {
    const seconds = Number(retryAfter);
    return Number.isFinite(seconds) && seconds > 0 && seconds <= 3600
      ? `Please wait ${Math.ceil(seconds)} seconds before trying again.`
      : "Please wait a minute before trying again.";
  }
  return fallback;
}
