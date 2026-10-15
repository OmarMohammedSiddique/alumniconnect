import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DiscoverClient } from "./discover-client";
import { QuickActions } from "@/components/quick-actions";
import { PageHeading } from "@/components/ui/page-heading";

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

  return (
    <div>
      <PageHeading title="Discover Mentors">Find people whose experience can help you move forward. Explore recommendations or search your community.</PageHeading>
      <QuickActions />
      <DiscoverClient canRequest={profile?.role === "mentee"} />
    </div>
  );
}
