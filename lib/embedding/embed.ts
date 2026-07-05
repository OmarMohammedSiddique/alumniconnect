import "server-only";
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

export const EMBEDDING_DIMENSIONS = 384;
const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

// The ~25MB ONNX model loads once per server process and is reused across
// requests. Never import this module from client code.
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  extractorPromise ??= pipeline("feature-extraction", MODEL_ID, {
    dtype: "q8",
  });
  return extractorPromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export interface EmbeddableProfile {
  headline: string;
  bio: string;
  skills: string[];
  industry: string;
  graduation_year: number | null;
}

// Embedding text is built from structured profile fields, so a profile is
// matchable the moment it is saved — this is the cold-start mitigation.
export function buildProfileEmbeddingText(p: EmbeddableProfile): string {
  return [
    p.headline,
    p.bio,
    p.skills.length ? `Skills: ${p.skills.join(", ")}` : "",
    p.industry ? `Industry: ${p.industry}` : "",
    p.graduation_year ? `Graduated: ${p.graduation_year}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
