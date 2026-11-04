"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { ProfilePhotoPicker } from "@/components/profile-photo-picker";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { updatePhoto } from "./actions";

export function PhotoForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (previous: { error: string | null; saved: boolean }, formData: FormData) => {
    const result = await updatePhoto(previous, formData);
    if (result.saved) router.refresh();
    return result;
  }, { error: null, saved: false });
  return <form action={action} className="grid max-w-xl gap-4" aria-busy={pending}>
    <ProfilePhotoPicker disabled={pending} />
    {state.error && <StatusMessage tone="error">{state.error}</StatusMessage>}
    {state.saved && <StatusMessage tone="success">Profile picture saved.</StatusMessage>}
    <Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Save picture"}</Button>
  </form>;
}
