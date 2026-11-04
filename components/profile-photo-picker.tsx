"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPhotoError } from "@/lib/signup-validation";

export function ProfilePhotoPicker({ disabled = false }: { disabled?: boolean }) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const message = file ? getPhotoError(file) : null;
    setError(message);
    event.target.setCustomValidity(message ?? "");
    setPreview(file && !message ? URL.createObjectURL(file) : "");
  }

  return (
    <div className="grid min-w-0 gap-3">
      <Label htmlFor="profile_photo">Profile picture <span className="font-normal text-muted-foreground">(optional)</span></Label>
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden border bg-surface">
          {/* Object URLs are local previews; no remote image loader is needed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="Selected profile picture" className="size-full object-cover" /> : <UserRound className="size-7 text-muted-foreground" aria-hidden="true" />}
        </div>
        <div className="grid min-w-0 flex-1 gap-2">
          <Input id="profile_photo" name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={selectPhoto} aria-invalid={Boolean(error)} aria-describedby="photo-help photo-error" className="min-w-0 py-2" />
          <p id="photo-help" className="text-sm text-muted-foreground">JPG, PNG or WebP, up to 512 KB. You can change it later in your profile.</p>
          <p id="photo-error" role="status" className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    </div>
  );
}
