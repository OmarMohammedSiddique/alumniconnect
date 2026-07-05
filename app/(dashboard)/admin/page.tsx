import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — AlumniConnect" };

// Placeholder: admin/moderator views land in build-order step 8.
// RLS is the real barrier; this guard is just UX.
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "moderator") {
    redirect("/discover");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Administration</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Admin and moderation tools are coming in a later sprint.
      </p>
    </div>
  );
}
