import assert from "node:assert/strict";
import test from "node:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { encodeScratchTexts, generateScratchEmbeddings, loadScratchModel, SCRATCH_DIMENSIONS, SCRATCH_MODEL_ID,
  SCRATCH_MODEL_SHA256, SCRATCH_MODEL_VERSION } from "./scratch-model.ts";
import { ScratchTokenizer } from "./scratch-tokenizer.ts";
import { comparisonText, cosineSimilarity, rankComparison } from "./model-comparison.ts";

const modelDir = new URL("../ml/models/scratch-v3/", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, modelDir)));
const fixtures = read("parity.json");
const manifest = read("manifest.json");
const tokenizer = new ScratchTokenizer(read("tokenizer.json"));

test("tokeniser matches the Python reference for plain, mixed-case, symbol, Unicode, empty and long text", () => {
  for (const fixture of fixtures) {
    assert.deepEqual(tokenizer.ids(fixture.text), fixture.tokens, JSON.stringify(fixture.text.slice(0, 40)));
  }
  assert.deepEqual(tokenizer.ids(""), [1], "empty text becomes one unknown token");
  assert.deepEqual(tokenizer.ids(" \n\t "), [1]);
  assert.deepEqual(tokenizer.ids("AVIATION"), tokenizer.ids("aviation"));
  assert.equal(tokenizer.ids("word ".repeat(1000)).length, manifest.max_length);
  const row = tokenizer.encode(["a", ""]);
  assert.equal(row.length, 2 * manifest.max_length);
  assert.equal(row[manifest.max_length], BigInt(1));
  assert.equal(row[manifest.max_length + 1], BigInt(0), "rows are padded with zero");
  assert.throws(() => new ScratchTokenizer({ format: "other", max_length: 1, vocabulary: {}, merges: [] }));
});

test("exported v3 model matches PyTorch for both heads within 1e-4", async () => {
  const output = await generateScratchEmbeddings(fixtures.map((fixture) => fixture.text));
  assert.match(SCRATCH_MODEL_ID, /^scratch-v3:[a-f0-9]{12}$/);
  assert.equal(SCRATCH_MODEL_VERSION, "v3");
  assert.equal(SCRATCH_MODEL_SHA256, manifest.onnx_sha256);
  assert.ok(SCRATCH_DIMENSIONS === 64 || SCRATCH_DIMENSIONS === 128);
  let worst = 0;
  for (const head of ["query", "mentor"]) {
    fixtures.forEach((fixture, row) => {
      assert.equal(output[head][row].length, SCRATCH_DIMENSIONS);
      output[head][row].forEach((value, column) => {
        worst = Math.max(worst, Math.abs(value - fixture[head][column]));
      });
    });
  }
  assert.ok(worst < 1e-4, `largest difference from PyTorch was ${worst}`);
  assert.notDeepEqual(output.query[2], output.mentor[2], "Directional heads must remain distinct");
});

test("inference handles a single item and rejects invalid or unbounded batches", async () => {
  const output = await generateScratchEmbeddings([fixtures[2].text]);
  assert.equal(output.query.length, 1);
  output.query[0].forEach((value, i) => assert.ok(Math.abs(value - fixtures[2].query[i]) < 1e-4));
  await assert.rejects(() => encodeScratchTexts([]));
  await assert.rejects(() => generateScratchEmbeddings(Array(52).fill("profile")));
  await assert.rejects(() => generateScratchEmbeddings([null]));
  assert.equal((await encodeScratchTexts(["🛩".repeat(1000)])).length, manifest.max_length);
});

test("a missing or altered model file fails closed with a clear error", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "scratch-v3-"));
  try {
    await assert.rejects(() => loadScratchModel(root), /ENOENT/);
    const target = path.join(root, "ml/models/scratch-v3");
    cpSync(new URL(".", modelDir), target, { recursive: true });
    await loadScratchModel(root);
    writeFileSync(path.join(target, "encoder.onnx"), "not the model");
    await assert.rejects(() => loadScratchModel(root), /integrity check failed/);
    cpSync(new URL("encoder.onnx", modelDir), path.join(target, "encoder.onnx"));
    writeFileSync(path.join(target, "tokenizer.json"), readFileSync(new URL("tokenizer.json", modelDir), "utf8") + " ");
    await assert.rejects(() => loadScratchModel(root), /integrity check failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the manifest describes a from-scratch artefact under the size limit, and v1 is kept", () => {
  assert.equal(manifest.trained_from_random_initialisation, true);
  assert.deepEqual(manifest.pretrained_components, []);
  assert.equal(manifest.experimental, true);
  assert.ok(manifest.onnx_bytes < 25 * 1024 * 1024);
  assert.equal(readFileSync(new URL("encoder.onnx", modelDir)).length, manifest.onnx_bytes);
  assert.ok(readFileSync(new URL("../ml/models/scratch-pilot-v1/encoder.onnx", import.meta.url)).length > 0);
});

const query = { id: "q", full_name: "Excluded identity", headline: "Seeking guidance", bio: "Career goal",
  skills: ["Safety"], industry: "Aviation", graduation_year: 2026 };

test("comparison uses only the four input fields", () => {
  assert.equal(comparisonText(query), "Seeking guidance\nCareer goal\nSkills: Safety\nIndustry: Aviation");
  assert.equal(comparisonText({ ...query, full_name: "Changed", graduation_year: 1999, relevance_score: 3 }), comparisonText(query));
});

test("ranks the complete same pool by cosine, keeps availability and ties stable", () => {
  const mentors = [{ ...query, id: "b", accepting_requests: false }, { ...query, id: "a" }, { ...query, id: "c" }];
  const ranked = rankComparison(query, mentors, [1, 0], [[2, 0], [1, 0], [0, 1]]);
  assert.deepEqual(ranked.map((m) => m.id), ["a", "b", "c"]);
  assert.equal(ranked[1].accepting_requests, false);
  assert.deepEqual(ranked[0].shared_skills, ["Safety"]);
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
  assert.throws(() => cosineSimilarity([1], [1, 2]));
  assert.throws(() => cosineSimilarity([1], [NaN]));
  assert.throws(() => cosineSimilarity([0], [1]));
  assert.throws(() => rankComparison(query, mentors, [1], [[1]]));
});
