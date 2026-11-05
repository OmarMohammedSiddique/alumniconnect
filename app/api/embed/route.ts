import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildProfileEmbeddingText,
  generateEmbedding,
  MODEL_ID,
  EMBEDDING_DIMENSIONS,
} from "@/lib/embedding/embed";
import {
  defaultEmbedGuard,
  computeEmbeddingKey,
} from "@/lib/embedding/embed-guard";

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

  // Check per-user rate limit
  const rateLimit = defaultEmbedGuard.checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many embedding requests. Please wait a moment before trying again.",
        retryAfter: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("headline, bio, skills, industry, graduation_year, updated_at")
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

  const profileUpdatedAt = String(profile.updated_at ?? "");
  const textHash = computeEmbeddingKey(text, MODEL_ID);

  // Check if profile content is unchanged and already successfully embedded
  if (
    defaultEmbedGuard.hasCachedEmbedding(
      user.id,
      textHash,
      MODEL_ID,
      profileUpdatedAt,
    )
  ) {
    return NextResponse.json({
      ok: true,
      dimensions: EMBEDDING_DIMENSIONS,
      reused: true,
    });
  }

  // Deduplicate concurrent in-flight requests for the same user and text
  const dedupeKey = `${user.id}:${textHash}`;
  try {
    const result = await defaultEmbedGuard.deduplicate(dedupeKey, async () => {
      const embedding = await generateEmbedding(text);

      const admin = createAdminClient();
      // Optimistic concurrency: only persist if the profile hasn't been updated
      // by a newer save while inference was running.
      const query = admin
        .from("profiles")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", user.id);

      if (profileUpdatedAt) {
        query.eq("updated_at", profileUpdatedAt);
      }

      const { data, error: updateError } = await query
        .select("id, updated_at")
        .maybeSingle();

      if (updateError) {
        throw new Error("Could not persist match profile embedding.");
      }

      if (!data && profileUpdatedAt) {
        // A newer profile update occurred while inference was running; do not overwrite.
        return { dimensions: embedding.length, reused: false, superseded: true };
      }

      defaultEmbedGuard.recordSuccess(
        user.id,
        textHash,
        MODEL_ID,
        embedding.length,
        String(data?.updated_at ?? profileUpdatedAt),
      );

      return { dimensions: embedding.length, reused: false, superseded: false };
    });

    if (result.superseded) {
      return NextResponse.json(
        {
          ok: false,
          error: "A newer profile edit occurred while updating your match profile. Please save again to apply latest changes.",
          superseded: true,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      dimensions: result.dimensions,
      ...(result.reused ? { reused: true } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not update your match profile right now. Please try again." },
      { status: 500 },
    );
  }
}
