"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  changeProfileRole,
  changeProfileVisibility,
  type AdminActionState,
} from "@/lib/admin-profile-action";

// Both actions run as the caller: RLS plus the protect_profile_columns
// trigger enforce that only admins change roles and only staff change
// visibility. The UI guard is convenience, not security.

export async function setUserRole(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const result = await changeProfileRole(
    createClient,
    formData.get("user_id"),
    formData.get("role"),
  );
  if (result.ok) revalidatePath("/admin");
  return result;
}

export async function setUserVisibility(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const result = await changeProfileVisibility(
    createClient,
    formData.get("user_id"),
    formData.get("visible"),
  );
  if (result.ok) revalidatePath("/admin");
  return result;
}
