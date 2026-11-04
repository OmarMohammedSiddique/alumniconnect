"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, Upload } from "lucide-react";
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
    <div className="grid min-w-0 gap-2">
      <p id="photo-label" className="text-sm font-semibold">Profile picture <span className="font-normal text-muted-foreground">(optional)</span></p>
      <label htmlFor="profile_photo" className={`group relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-border bg-surface p-3 text-center transition-colors hover:border-primary hover:bg-card focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-ring ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        <input id="profile_photo" name="profile_photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={selectPhoto} aria-invalid={Boolean(error)} aria-labelledby="photo-label photo-action" aria-describedby={error ? "photo-help photo-error" : "photo-help"} className="sr-only" />
        {preview ? (
          <span className="relative block size-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Selected profile picture" className="size-full border object-cover" />
            <span className="absolute -right-2 -bottom-1 border border-border bg-card p-1"><Camera className="size-4" aria-hidden="true" /></span>
          </span>
        ) : <ImagePlus className="size-9 text-primary" strokeWidth={1.5} aria-hidden="true" />}
        <span id="photo-action" className="inline-flex min-h-8 items-center gap-2 text-sm font-semibold text-primary"><Upload className="size-4" aria-hidden="true" />{preview ? "Click to change your photo" : "Click to upload your photo"}</span>
        <span id="photo-help" className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 512 KB</span>
      </label>
      {error && <p id="photo-error" role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
