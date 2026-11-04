import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getPhotoError, hasPhotoSignature } from "@/lib/signup-validation";

export async function validateProfilePhoto(file: File): Promise<string | null> {
  const error = getPhotoError(file);
  if (error) return error;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return hasPhotoSignature(bytes, file.type) ? null : "This file is not a supported image. Choose a JPG, PNG or WebP image.";
}

export async function saveProfilePhoto(file: File): Promise<string | null> {
  const validationError = await validateProfilePhoto(file);
  if (validationError) return validationError;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Sign in before uploading a profile picture.";
  // Fixed owner path prevents arbitrary object writes and avoids orphaned replacements.
  const { error } = await supabase.storage.from("profile-photos").upload(`${user.id}/avatar`, file, { contentType: file.type, upsert: true, cacheControl: "0" });
  return error ? "Your picture could not be saved. Please try again from your profile." : null;
}
