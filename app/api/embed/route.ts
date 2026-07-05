import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildProfileEmbeddingText,
  generateEmbedding,
} from "@/lib/embedding/embed";

// Regenerates the signed-in user's profile embedding. Called after profile
// save. Embedding generation is server-side only (non-negotiable #2), and the
// embedding column is writable only via the service role.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("headline, bio, skills, industry, graduation_year")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const text = buildProfileEmbeddingText(profile);
  if (!text.trim()) {
    return NextResponse.json(
      { error: "Profile has no content to embed yet" },
      { status: 422 },
    );
  }

  const embedding = await generateEmbedding(text);

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({ embedding: JSON.stringify(embedding) })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dimensions: embedding.length });
}
