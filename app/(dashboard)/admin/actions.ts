"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Both actions run as the caller: RLS plus the protect_profile_columns
// trigger enforce that only admins change roles and only staff change
// visibility. The UI guard is convenience, not security.

export async function setUserRole(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!["mentee", "mentor", "moderator", "admin"].includes(role)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  revalidatePath("/admin");
}

export async function setUserVisibility(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const visible = formData.get("visible") === "true";

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ is_visible: visible })
    .eq("id", userId);
  revalidatePath("/admin");
}
