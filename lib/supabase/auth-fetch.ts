// Keep authentication forms responsive when a gateway cannot reach Auth.
// Scope this to account-email flows; other database/storage requests keep their
// existing behavior. Preserve any caller cancellation as well as our deadline.
export const AUTH_REQUEST_TIMEOUT_MS = 8_000;

export const fetchAuthWithDeadline: typeof fetch = (input, init) => fetch(input, {
  ...init,
  signal: init?.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS)])
    : AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
});
