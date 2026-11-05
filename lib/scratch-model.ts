import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { InferenceSession, Tensor } from "onnxruntime-node";
import manifest from "../ml/models/scratch-pilot-v1/manifest.json" with { type: "json" };

export const SCRATCH_MODEL_ID = `${manifest.id}:${manifest.onnx_sha256.slice(0, 12)}`;
const vocabulary: Record<string, number> = manifest.vocabulary;
const casefold: Record<string, string> = manifest.casefold;
let sessionPromise: Promise<InferenceSession> | undefined;

async function getSession() {
  sessionPromise ??= (async () => {
    const bytes = await readFile(path.join(process.cwd(), "ml/models/scratch-pilot-v1/encoder.onnx"));
    if (createHash("sha256").update(bytes).digest("hex") !== manifest.onnx_sha256) {
      throw new Error("Scratch model integrity check failed");
    }
    return InferenceSession.create(bytes, { executionProviders: ["cpu"], intraOpNumThreads: 1 });
  })().catch((error) => {
    sessionPromise = undefined; // A temporary load failure must be retryable.
    throw error;
  });
  return sessionPromise;
}

export function encodeScratchTexts(texts: string[]) {
  if (!texts.length || texts.length > 51 || texts.some((text) => typeof text !== "string")) {
    throw new Error("Expected 1–51 profile texts");
  }
  const values = new BigInt64Array(texts.length * manifest.max_length);
  texts.forEach((text, row) => {
    const folded = Array.from(text, (char) => casefold[char] ?? char).join("");
    const chars = Array.from(folded).slice(0, manifest.max_length);
    if (!chars.length) values[row * manifest.max_length] = BigInt(1);
    chars.forEach((char, column) => {
      values[row * manifest.max_length + column] = BigInt(vocabulary[char] ?? 1);
    });
  });
  return values;
}

/** Both heads share the encoder, but query and mentor vectors are directional. */
export async function generateScratchEmbeddings(texts: string[]) {
  const tokens = new Tensor("int64", encodeScratchTexts(texts), [texts.length, manifest.max_length]);
  const session = await getSession();
  const output = await session.run({ tokens });
  const rows = (name: "query" | "mentor") => {
    const tensor = output[name];
    if (tensor.type !== "float32" || tensor.dims[0] !== texts.length || tensor.dims[1] !== 64) {
      throw new Error("Invalid scratch output shape");
    }
    const values = Array.from(tensor.data as Float32Array);
    if (!values.every(Number.isFinite)) throw new Error("Invalid scratch output values");
    return texts.map((_, i) => values.slice(i * 64, (i + 1) * 64));
  };
  return { query: rows("query"), mentor: rows("mentor") };
}
