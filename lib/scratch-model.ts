import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { InferenceSession, Tensor } from "onnxruntime-node";
import manifest from "../ml/models/scratch-v3/manifest.json" with { type: "json" };
import { ScratchTokenizer } from "./scratch-tokenizer.ts";

// Version 3 of the model trained from random weights (see docs/ml-scratch-v3.md).
// The version 1 pilot artefact stays in ml/models/scratch-pilot-v1 for the record.
const MODEL_DIR = "ml/models/scratch-v3";
export const SCRATCH_MODEL_VERSION = "v3";
export const SCRATCH_MODEL_ID = `${manifest.id}:${manifest.onnx_sha256.slice(0, 12)}`;
export const SCRATCH_MODEL_SHA256 = manifest.onnx_sha256;
export const SCRATCH_DIMENSIONS = manifest.dimensions;
export const SCRATCH_MAX_TEXTS = 51;

interface Loaded { session: InferenceSession; tokenizer: ScratchTokenizer }
let loadedPromise: Promise<Loaded> | undefined;

async function verified(file: string, expected: string, root: string) {
  const bytes = await readFile(path.join(root, MODEL_DIR, file));
  if (createHash("sha256").update(bytes).digest("hex") !== expected) {
    throw new Error("Scratch model integrity check failed");
  }
  return bytes;
}

/** Loads the tokeniser and model from local files only, after checking both hashes. */
export async function loadScratchModel(root = process.cwd()): Promise<Loaded> {
  const [tokenizerBytes, modelBytes] = await Promise.all([
    verified("tokenizer.json", manifest.tokenizer_sha256, root),
    verified("encoder.onnx", manifest.onnx_sha256, root),
  ]);
  const tokenizer = new ScratchTokenizer(JSON.parse(tokenizerBytes.toString("utf8")));
  if (tokenizer.maxLength !== manifest.max_length) throw new Error("Scratch tokeniser does not match the model");
  const session = await InferenceSession.create(modelBytes, { executionProviders: ["cpu"], intraOpNumThreads: 1 });
  return { session, tokenizer };
}

function getLoaded() {
  loadedPromise ??= loadScratchModel().catch((error) => {
    loadedPromise = undefined; // A temporary load failure must be retryable.
    throw error;
  });
  return loadedPromise;
}

function checkTexts(texts: string[]) {
  if (!texts.length || texts.length > SCRATCH_MAX_TEXTS || texts.some((text) => typeof text !== "string")) {
    throw new Error("Expected 1–51 profile texts");
  }
}

export async function encodeScratchTexts(texts: string[]) {
  checkTexts(texts);
  return (await getLoaded()).tokenizer.encode(texts);
}

/** Both heads share the encoder, but query and mentor vectors are directional. */
export async function generateScratchEmbeddings(texts: string[]) {
  checkTexts(texts);
  const { session, tokenizer } = await getLoaded();
  const tokens = new Tensor("int64", tokenizer.encode(texts), [texts.length, tokenizer.maxLength]);
  const output = await session.run({ tokens });
  const rows = (name: "query" | "mentor") => {
    const tensor = output[name];
    if (tensor.type !== "float32" || tensor.dims[0] !== texts.length || tensor.dims[1] !== SCRATCH_DIMENSIONS) {
      throw new Error("Invalid scratch output shape");
    }
    const values = Array.from(tensor.data as Float32Array);
    if (!values.every(Number.isFinite)) throw new Error("Invalid scratch output values");
    return texts.map((_, i) => values.slice(i * SCRATCH_DIMENSIONS, (i + 1) * SCRATCH_DIMENSIONS));
  };
  return { query: rows("query"), mentor: rows("mentor") };
}
