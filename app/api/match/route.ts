import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Returns ranked mentor matches for the signed-in user: pgvector cosine
// similarity plus skill-overlap explainability, computed in Postgres under
// the caller's RLS context.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let count = 10;
  try {
    const body = await request.json();
    if (Number.isInteger(body?.count) && body.count > 0) count = body.count;
  } catch {
    // empty body - use default count
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("embedding")
    .eq("id", user.id)
    .single();

  if (!me?.embedding) {
    return NextResponse.json(
      { error: "Complete your profile first so we can find your matches." },
      { status: 422 },
    );
  }

  const { data: matches, error } = await supabase.rpc("match_mentors", {
    query_embedding: me.embedding,
    match_count: count,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ matches });
}
