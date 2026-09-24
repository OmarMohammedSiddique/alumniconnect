import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cancelRequest, respondRequest } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Requests - AlumniConnect" };

interface RequestRow {
  id: string;
  status: string;
  message: string;
  created_at: string;
  mentee: { full_name: string } | null;
  mentor: { full_name: string } | null;
}

interface ConnectionRow {
  id: string;
  created_at: string;
  mentee: { full_name: string } | null;
  mentor: { full_name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
};

export default async function RequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isMentor = profile?.role === "mentor";

  // RLS already limits rows to ones the caller participates in.
  const { data: requests } = await supabase
    .from("mentorship_requests")
    .select(
      `id, status, message, created_at,
       mentee:profiles!mentorship_requests_mentee_id_fkey(full_name),
       mentor:profiles!mentorship_requests_mentor_id_fkey(full_name)`,
    )
    .order("created_at", { ascending: false })
    .returns<RequestRow[]>();

  const { data: connections } = await supabase
    .from("connections")
    .select(
      `id, created_at,
       mentee:profiles!connections_mentee_id_fkey(full_name),
       mentor:profiles!connections_mentor_id_fkey(full_name)`,
    )
    .order("created_at", { ascending: false })
    .returns<ConnectionRow[]>();

  return (
    <div className="grid max-w-3xl gap-8">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">
          {isMentor ? "Incoming requests" : "Your requests"}
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {isMentor
            ? "Mentees who would like your guidance."
            : "Mentorship requests you have sent."}
        </p>
        {!requests?.length && (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        )}
        <div className="grid gap-3">
          {requests?.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    {isMentor
                      ? (req.mentee?.full_name ?? "Unknown")
                      : `To: ${req.mentor?.full_name ?? "Unknown"}`}
                  </CardTitle>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {STATUS_LABEL[req.status] ?? req.status}
                  </span>
                </div>
                {req.message && (
                  <CardDescription>“{req.message}”</CardDescription>
                )}
              </CardHeader>
              {req.status === "pending" && (
                <CardContent className="flex gap-2">
                  {isMentor ? (
                    <>
                      <form action={respondRequest}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <input type="hidden" name="accept" value="true" />
                        <Button type="submit" size="sm">
                          Accept
                        </Button>
                      </form>
                      <form action={respondRequest}>
                        <input type="hidden" name="request_id" value={req.id} />
                        <input type="hidden" name="accept" value="false" />
                        <Button type="submit" size="sm" variant="outline">
                          Decline
                        </Button>
                      </form>
                    </>
                  ) : (
                    <form action={cancelRequest}>
                      <input type="hidden" name="request_id" value={req.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Cancel request
                      </Button>
                    </form>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-semibold">Connections</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Your active mentorship relationships.
        </p>
        {!connections?.length && (
          <p className="text-sm text-muted-foreground">No connections yet.</p>
        )}
        <div className="grid gap-3">
          {connections?.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {isMentor
                    ? (c.mentee?.full_name ?? "Unknown")
                    : (c.mentor?.full_name ?? "Unknown")}
                </CardTitle>
                <CardDescription>
                  Connected since{" "}
                  {new Date(c.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
