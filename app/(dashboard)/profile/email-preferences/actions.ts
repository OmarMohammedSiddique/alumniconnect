"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveEmailPreferences(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Identity always comes from Auth; ignore any submitted user ID.
  const { error } = await supabase.from("email_preferences").upsert({
    user_id: user.id,
    requests: form.get("requests") === "on",
    connections: form.get("connections") === "on",
    matches: form.get("matches") === "on",
    reminders: form.get("reminders") === "on",
  });
  redirect(`/profile/email-preferences?${error ? "error=1" : "saved=1"}`);
}

export async function unsubscribeActivityEmails() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("email_preferences").upsert({
    user_id: user.id, requests: false, connections: false, matches: false, reminders: false,
  });
  redirect(`/profile/email-preferences?${error ? "error=1" : "saved=1"}`);
}
