import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { PrivacySettingsCard, type BlockedMember } from "./privacy-settings-card";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata = { title: "Profile - AlumniKonneQt" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, headline, bio, skills, industry, graduation_year, role, embedding, member_visible, staff_hidden, is_visible"
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Fetch blocked members safely via RPC
  const { data: blockedMembers } = await supabase.rpc("get_my_blocks");

  // Only send readiness to the client, not the stored embedding vector.
  const {
    embedding,
    member_visible,
    staff_hidden,
    is_visible,
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
      <PrivacySettingsCard
        memberVisible={member_visible ?? true}
        staffHidden={staff_hidden ?? false}
        isVisible={is_visible ?? true}
        blockedMembers={(blockedMembers as BlockedMember[]) || []}
      />
    </div>
  );
}
