import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { saveEmailPreferences } from "./actions";

export const metadata = { title: "Email preferences - AlumniKonneQt" };

export default async function EmailPreferencesPage({ searchParams }: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const [{ data, error }, params] = await Promise.all([
    supabase.from("email_preferences").select("requests, connections, matches").eq("user_id", user.id).maybeSingle(),
    searchParams,
  ]);
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeading title="Email preferences">Choose which activity emails you receive. Uncheck a category to unsubscribe.</PageHeading>
      {params.saved && !error && <StatusMessage tone="success">Your email preferences have been saved.</StatusMessage>}
      {(error || params.error) && <StatusMessage tone="error">We couldn’t load or save your preferences. Please try again.</StatusMessage>}
      <form action={saveEmailPreferences} className="space-y-6">
        <fieldset disabled={Boolean(error)} className="space-y-5">
          <legend className="mb-4 font-semibold">Optional activity emails</legend>
          {([
            ["requests", "Mentorship requests", "New requests and declined-request updates."],
            ["connections", "Successful connections", "Confirmation when a mentorship request is accepted."],
            ["matches", "Mentor recommendations", "Recommendations after your match profile changes, at most once per day."],
          ] as const).map(([key, label, description]) => (
            <label key={key} className="flex min-h-11 cursor-pointer items-start gap-3">
              <input type="checkbox" name={key} defaultChecked={data?.[key] ?? true} className="mt-1 size-5 accent-primary" />
              <span><span className="block font-medium">{label}</span><span className="text-sm text-muted-foreground">{description}</span></span>
            </label>
          ))}
          <Button type="submit">Save email preferences</Button>
        </fieldset>
      </form>
      <p className="text-sm text-muted-foreground">Confirmation, sign-in and password recovery emails are managed separately and remain available regardless of these settings.</p>
      <Link href="/profile" className="text-sm underline underline-offset-4">Back to your profile</Link>
    </div>
  );
}
