import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeSignInRedirect } from "@/lib/auth-redirect";
import { finishGoogleSignIn, getGoogleCallbackOrigin, GOOGLE_NEXT_COOKIE } from "@/lib/google-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let origin: string;
  try {
    origin = getGoogleCallbackOrigin(request, process.env.SITE_URL, process.env.NODE_ENV === "production");
  } catch {
    return new Response("Google sign-in is not configured for this environment.", { status: 503, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  }

  const cookieStore = await cookies();
  const next = getSafeSignInRedirect(cookieStore.get(GOOGLE_NEXT_COOKIE)?.value ?? "");
  cookieStore.set(GOOGLE_NEXT_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:"), path: "/auth", maxAge: 0 });

  let reason: string | null = "exchange_failed";
  try {
    const supabase = await createClient();
    reason = await finishGoogleSignIn(url.searchParams, supabase.auth);
  } catch { /* Return a fixed error, never provider descriptions or tokens. */ }

  const target = reason ? new URL("/login", origin) : new URL(next, origin);
  if (reason) {
    target.searchParams.set("oauth_error", reason);
    target.searchParams.set("next", next);
  }
  const response = NextResponse.redirect(target, 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
