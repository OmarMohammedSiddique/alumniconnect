import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui/page-heading";
import { PhotoForm } from "./photo-form";

export const metadata = { title: "Profile picture - AlumniKonneQt" };

export default async function ProfilePhotoPage({ searchParams }: { searchParams: Promise<{ retry?: string }> }) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/profile/photo");
  const photos = supabase.storage.from("profile-photos");
  const path = `${user.id}/avatar`;
  const [{ data }, { data: info }, { retry }] = await Promise.all([
    photos.createSignedUrl(path, 300),
    photos.info(path),
    searchParams,
  ]);
  // Storage can issue an identical signed URL for rapid same-path replacements.
  // Version the rendered src by the stored object, not the signing timestamp.
  const photoUrl = data?.signedUrl ? new URL(data.signedUrl) : null;
  if (info?.version) photoUrl?.searchParams.set("v", info.version);
  return <div className="grid gap-6">
    <PageHeading title="Your profile picture">Choose a picture to help other members recognise you. Photos are accessible to signed-in members.</PageHeading>
    {retry && <p role="status">Your account was created, but your picture could not be uploaded. Please choose it again below.</p>}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photoUrl && <img src={photoUrl.href} alt="Your current profile picture" className="size-28 border object-cover" />}
    <PhotoForm />
    <Link href="/profile" className="inline-flex min-h-11 items-center text-primary underline">Back to your profile</Link>
  </div>;
}
