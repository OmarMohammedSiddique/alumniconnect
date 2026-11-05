import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { PrivacySettingsCard, type BlockedMember } from "./privacy-settings-card";
import { AvailabilityCard } from "./availability-card";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata = { title: "Profile - AlumniKonneQt" };

export default async function ProfilePage() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: blockedMembers }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, headline, bio, skills, industry, graduation_year, role, embedding, member_visible, staff_hidden, is_visible, accepting_requests",
      )
      .eq("id", user.id)
      .single(),
    supabase.rpc("get_my_blocks"),
  ]);

  if (!profile) redirect("/login");

  // Only send readiness to the client, not the stored embedding vector.
  const {
    embedding,
    member_visible,
    staff_hidden,
    is_visible,
    accepting_requests,
    ...details
  } = profile;

  return (
    <div>
      <PageHeading title="Your profile">
        Help your community understand your experience, interests, and the guidance you seek or offer.
      </PageHeading>
      <ProfileForm
        userId={user.id}
        profile={details}
        hasMatchProfile={Boolean(embedding)}
      />
      {details.role === "mentor" && (
        <AvailabilityCard acceptingRequests={accepting_requests ?? true} />
      )}
      <p className="mt-8"><Link href="/profile/email-preferences" className="text-sm underline underline-offset-4">Manage email preferences or unsubscribe</Link></p>
      <PrivacySettingsCard
        memberVisible={member_visible ?? true}
        staffHidden={staff_hidden ?? false}
        isVisible={is_visible ?? true}
        blockedMembers={(blockedMembers as BlockedMember[]) || []}
      />
    </div>
  );
}
