import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DiscoverClient } from "./discover-client";

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
      <h1 className="mb-1 text-2xl font-semibold">Discover mentors</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Ranked by how well their experience matches your profile.
      </p>
      <DiscoverClient canRequest={profile?.role === "mentee"} />
    </div>
  );
}
