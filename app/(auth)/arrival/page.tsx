import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { getSafeSignInRedirect } from "@/lib/auth-redirect";
import { ArrivalScreen } from "./arrival-screen";

export const metadata = { title: "Your boarding pass - AlumniKonneQt", robots: { index: false, follow: false } };

export default async function ArrivalPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { user } = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const { next } = await searchParams;
  return <ArrivalScreen destination={getSafeSignInRedirect(typeof next === "string" ? next : "")} />;
}
