import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata = { title: "Profile - AlumniConnect" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, headline, bio, skills, industry, graduation_year")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div>
      <PageHeading title="Your profile">Help your community understand your experience, interests, and the guidance you seek or offer.</PageHeading>
      <ProfileForm profile={profile} />
    </div>
  );
}
