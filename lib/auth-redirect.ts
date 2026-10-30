const REDIRECT_ORIGIN = "https://alumniconnect.invalid";
const DEFAULT_REDIRECT = "/discover";

export function getSafeSignInRedirect(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_REDIRECT;
  }

  try {
    // Parse as a browser does: backslashes and embedded tabs/newlines can turn
    // an apparently internal path into a URL on another origin.
    const target = new URL(value, REDIRECT_ORIGIN);
    if (target.origin !== REDIRECT_ORIGIN) return DEFAULT_REDIRECT;

    const path = `${target.pathname}${target.search}${target.hash}`;
    // Dot-segment normalization can expose a leading double slash. Returning
    // it as a relative redirect would turn it into an external destination.
    return path.startsWith("//") ? DEFAULT_REDIRECT : path;
  } catch {
    return DEFAULT_REDIRECT;
  }
}
