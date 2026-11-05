import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { encodeScratchTexts, generateScratchEmbeddings, SCRATCH_MODEL_ID } from "./scratch-model.ts";
import { comparisonText, cosineSimilarity, rankComparison } from "./model-comparison.ts";

const fixtures = JSON.parse(readFileSync(new URL("../ml/models/scratch-pilot-v1/parity.json", import.meta.url)));

test("exported trained model matches PyTorch for both heads, Unicode, empty and long inputs", async () => {
  const output = await generateScratchEmbeddings(fixtures.map((fixture) => fixture.text));
  assert.match(SCRATCH_MODEL_ID, /^scratch-pilot-v1:[a-f0-9]{12}$/);
  for (const head of ["query", "mentor"]) {
    fixtures.forEach((fixture, row) => {
      assert.equal(output[head][row].length, 64);
      output[head][row].forEach((value, column) => {
        assert.ok(Math.abs(value - fixture[head][column]) < 1e-5, `${head} parity at ${row}/${column}`);
      });
    });
  }
  assert.notDeepEqual(output.query[0], output.mentor[0], "Directional heads must remain distinct");
});

test("inference handles a single item and rejects invalid or unbounded batches", async () => {
  const output = await generateScratchEmbeddings([fixtures[1].text]);
  assert.equal(output.query.length, 1);
  output.query[0].forEach((value, i) => assert.ok(Math.abs(value - fixtures[1].query[i]) < 1e-5));
  assert.throws(() => encodeScratchTexts([]));
  assert.throws(() => encodeScratchTexts(Array(52).fill("profile")));
  assert.throws(() => encodeScratchTexts([null]));
  assert.equal(encodeScratchTexts(["🛩".repeat(1000)]).length, 512);
});

const query = { id: "q", full_name: "Excluded identity", headline: "Seeking guidance", bio: "Career goal",
  skills: ["Safety"], industry: "Aviation", graduation_year: 2026 };

test("comparison uses only the pilot's four input fields", () => {
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
