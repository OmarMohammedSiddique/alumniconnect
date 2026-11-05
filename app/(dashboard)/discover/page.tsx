import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { DiscoverClient } from "./discover-client";
import { QuickActions } from "@/components/quick-actions";
import { PageHeading } from "@/components/ui/page-heading";
import { buildRequestStateMap } from "@/lib/discovery-filters";

export const metadata = { title: "Discover - AlumniKonneQt" };

export default async function DiscoverPage() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/login");

  // Load role, existing requests, and connections in parallel
  const [{ data: profile }, { data: userRequests }, { data: userConnections }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("mentorship_requests")
        .select("mentor_id, status")
        .eq("mentee_id", user.id),
      supabase
        .from("connections")
        .select("mentor_id")
        .eq("mentee_id", user.id),
    ]);

  const initialRequestMap = buildRequestStateMap(
    userRequests ?? [],
    (userConnections ?? []).map((c) => c.mentor_id),
  );

  return (
    <div>
      <PageHeading title="Discover Mentors">
        Find people whose experience can help you move forward. Explore recommendations or search your community.
      </PageHeading>
      <QuickActions />
      <DiscoverClient
        canRequest={profile?.role === "mentee"}
        isMentor={profile?.role === "mentor"}
        initialRequestMap={initialRequestMap}
      />
    </div>
  );
}
