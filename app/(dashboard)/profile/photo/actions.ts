"use server";

import { revalidatePath } from "next/cache";
import { saveProfilePhoto } from "@/lib/profile-photo";

export async function updatePhoto(_previous: { error: string | null; saved: boolean }, formData: FormData) {
  const file = formData.get("profile_photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a picture first.", saved: false };
  try {
    const error = await saveProfilePhoto(file);
    if (error) return { error, saved: false };
    revalidatePath("/profile/photo");
    return { error: null, saved: true };
  } catch {
    return { error: "Your picture could not be saved. Please try again.", saved: false };
  }
}
