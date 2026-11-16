// Embeds profiles with the frozen MiniLM model exactly as the comparison route does:
// the deployed embedding module, the same four input fields, one profile at a time.
// Run with:
//   node --conditions=react-server --experimental-strip-types \
//     scripts/eval/embed-minilm-profiles.mjs <profiles.jsonl> <output.json>
// MiniLM is a reference system only. Its vectors never label, filter or select data.
import { readFileSync, writeFileSync } from "node:fs";
import { generateEmbedding, MODEL_ID, EMBEDDING_DIMENSIONS } from "../../lib/embedding/embed.ts";
import { comparisonText } from "../../lib/model-comparison.ts";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: embed-minilm-profiles.mjs <profiles.jsonl> <output.json>");
  process.exit(1);
}
const profiles = readFileSync(input, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const vectors = {};
const started = performance.now();
for (const profile of profiles) {
  const vector = await generateEmbedding(comparisonText(profile));
  if (vector.length !== EMBEDDING_DIMENSIONS) throw new Error("Unexpected MiniLM dimension");
  vectors[profile.person_id] = vector.map((value) => Number(value.toFixed(6)));
}
const seconds = (performance.now() - started) / 1000;
writeFileSync(output, JSON.stringify({ model: MODEL_ID, dtype: "q8", dimensions: EMBEDDING_DIMENSIONS,
  profiles: profiles.length, seconds: Number(seconds.toFixed(1)), vectors }));
console.log(`${MODEL_ID}: ${profiles.length} profiles in ${seconds.toFixed(1)} s`);
