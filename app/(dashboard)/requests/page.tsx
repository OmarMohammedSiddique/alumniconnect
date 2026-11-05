import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestActions } from "./request-actions";
import { ConnectionCard } from "./connection-card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { SafetyActionsMenu } from "@/components/safety/safety-actions-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Requests - AlumniKonneQt" };

interface RequestRow {
  id: string;
  mentee_id: string;
  mentor_id: string;
  status: string;
  message: string;
  created_at: string;
  mentee: { full_name: string } | null;
  mentor: { full_name: string } | null;
}

interface ConnectionProfile {
  full_name: string;
  role: string;
  headline: string;
  industry: string;
}

interface ConnectionRow {
  id: string;
  created_at: string;
  mentee_id: string;
  mentor_id: string;
  mentee: ConnectionProfile | null;
  mentor: ConnectionProfile | null;
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

  // Explicitly scope to rows the signed-in user participates in (staff RLS
  // permits reading all platform rows for moderation, which must not leak into
  // personal request/connection views).
  const { data: requests } = await supabase
    .from("mentorship_requests")
    .select(
      `id, mentee_id, mentor_id, status, message, created_at,
       mentee:profiles!mentorship_requests_mentee_id_fkey(full_name),
       mentor:profiles!mentorship_requests_mentor_id_fkey(full_name)`,
    )
    .or(`mentee_id.eq.${user.id},mentor_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .returns<RequestRow[]>();

  const { data: connections } = await supabase
    .from("connections")
    .select(
      `id, created_at, mentee_id, mentor_id,
       mentee:profiles!connections_mentee_id_fkey(full_name, role, headline, industry),
       mentor:profiles!connections_mentor_id_fkey(full_name, role, headline, industry)`,
    )
    .or(`mentee_id.eq.${user.id},mentor_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .returns<ConnectionRow[]>();

  return (
    <div className="grid max-w-4xl gap-10">
      <section>
        <PageHeading title={isMentor ? "Incoming requests" : "Your requests"}>
          {isMentor ? "Review introductions from Mentees seeking your guidance." : "Keep track of the introductions you have made and their responses."}
        </PageHeading>
        {!requests?.length && (
          <EmptyState title={isMentor ? "Your next introduction starts here" : "Start with a Mentor who understands your goals"}
            action={<Link href={isMentor ? "/profile" : "/discover"} className={buttonVariants({ variant: "outline" })}>{isMentor ? "Review your profile" : "Discover Mentors"}</Link>}>
            {isMentor ? "When a Mentee requests your guidance, their introduction will appear here." : "Explore the community and send a mentorship request when you find a relevant connection."}
          </EmptyState>
        )}
        <div className="grid gap-3">
          {requests?.map((req) => {
            const isIncoming = req.mentor_id === user.id;
            const counterpartId = isIncoming ? req.mentee_id : req.mentor_id;
            const counterpartName = isIncoming
              ? (req.mentee?.full_name ?? "Unknown")
              : (req.mentor?.full_name ?? "Unknown");
            return (
              <Card key={req.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="min-w-0 break-words text-base"><h2>
                      {isIncoming ? counterpartName : `To: ${counterpartName}`}
                    </h2></CardTitle>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={req.status === "accepted" ? "success" : req.status === "pending" ? "warning" : "neutral"}>
                        {STATUS_LABEL[req.status] ?? req.status}
                      </Badge>
                      {counterpartId && counterpartId !== user.id && (
                        <SafetyActionsMenu
                          targetId={counterpartId}
                          targetName={counterpartName}
                        />
                      )}
                    </div>
                  </div>
                  {req.message && (
                    <CardDescription className="mt-3 whitespace-pre-wrap break-words">“{req.message}”</CardDescription>
                  )}
                </CardHeader>
                {req.status === "pending" && (
                  <CardContent>
                    <RequestActions requestId={req.id} isMentor={isIncoming} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section id="connections" className="scroll-mt-8">
        <h2 className="section-heading mb-1">Your connections</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Your active mentorship relationships.
        </p>
        {!connections?.length && (
          <EmptyState title="Room for your first connection" headingLevel={3}>
            Accepted mentorship requests become connections. You can follow their progress in the request list above.
          </EmptyState>
        )}
        <div className="grid gap-4">
          {connections?.map((c) => {
            const isConnectionMentor = c.mentor_id === user.id;
            const partner = isConnectionMentor ? c.mentee : c.mentor;
            const partnerId = isConnectionMentor ? c.mentee_id : c.mentor_id;
            return (
              <ConnectionCard
                key={c.id}
                connectionId={c.id}
                connectedSince={c.created_at}
                isMentor={isConnectionMentor}
                partner={{
                  id: partnerId,
                  fullName: partner?.full_name ?? "Unavailable member",
                  role: partner?.role ?? (isConnectionMentor ? "mentee" : "mentor"),
                  headline: partner?.headline ?? "",
                  industry: partner?.industry ?? "",
                  available: Boolean(partner),
                }}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
