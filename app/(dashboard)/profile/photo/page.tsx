import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui/page-heading";
import { PhotoForm } from "./photo-form";

export const metadata = { title: "Profile picture - AlumniKonneQt" };

export default async function ProfilePhotoPage({ searchParams }: { searchParams: Promise<{ retry?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/photo");
  const { data } = await supabase.storage.from("profile-photos").createSignedUrl(`${user.id}/avatar`, 300);
  const { retry } = await searchParams;
  return <div className="grid gap-6">
    <PageHeading title="Your profile picture">Choose a picture to help other members recognise you. Photos are accessible to signed-in members.</PageHeading>
    {retry && <p role="status">Your account was created, but your picture could not be uploaded. Please choose it again below.</p>}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {data?.signedUrl && <img src={data.signedUrl} alt="Your current profile picture" className="size-28 border object-cover" />}
    <PhotoForm />
    <Link href="/profile" className="inline-flex min-h-11 items-center text-primary underline">Back to your profile</Link>
  </div>;
}
