import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DiscoverClient } from "./discover-client";
import { QuickActions } from "@/components/quick-actions";
import { PageHeading } from "@/components/ui/page-heading";
import type { MentorRequestState } from "@/lib/discovery-filters";

export const metadata = { title: "Discover - AlumniConnect" };

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Load existing requests involving this user to reflect persistent relationship states
  const { data: userRequests } = await supabase
    .from("mentorship_requests")
    .select("mentor_id, status")
    .eq("mentee_id", user.id);

  const initialRequestMap: Record<string, MentorRequestState> = {};
  if (userRequests) {
    for (const req of userRequests) {
      if (req.mentor_id && req.status) {
        initialRequestMap[req.mentor_id] = req.status as MentorRequestState;
      }
    }
  }

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
