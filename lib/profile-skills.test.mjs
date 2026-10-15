import assert from "node:assert/strict";
import test from "node:test";
import { getSkillsLimitError, MAX_PROFILE_SKILLS, normalizeSkills } from "./profile-skills.ts";

test("deduplicates case-insensitively while preserving first spelling and order", () => {
  assert.deepEqual(normalizeSkills("Python, python, SQL, sql, JavaScript, JAVASCRIPT"), [
    "Python", "SQL", "JavaScript",
  ]);
});

test("cleans whitespace and ignores empty comma-separated entries", () => {
  assert.deepEqual(normalizeSkills(" , Public   Speaking,\tpublic speaking,  SQL, ,"), [
    "Public Speaking", "SQL",
  ]);
  assert.deepEqual(normalizeSkills(" , \t, "), []);
});

test("recognizes equivalent Unicode spelling without merging different skills", () => {
  assert.deepEqual(normalizeSkills("Café, CAFE\u0301, C++, C#"), ["Café", "C++", "C#"]);
});

test("counts unique skills rather than repeated input entries", () => {
  const skills = normalizeSkills(Array(30).fill("SQL").join(","));
  assert.deepEqual(skills, ["SQL"]);
  assert.equal(getSkillsLimitError(skills.length), null);
});

test("accepts exactly 20 unique skills", () => {
  const skills = normalizeSkills(Array.from({ length: 20 }, (_, i) => `Skill ${i + 1}`).join(","));
  assert.equal(MAX_PROFILE_SKILLS, 20);
  assert.equal(skills.length, 20);
  assert.equal(getSkillsLimitError(skills.length), null);
});

test("retains excess skills and explains how many must be removed", () => {
  const skills = normalizeSkills(Array.from({ length: 22 }, (_, i) => `Skill ${i + 1}`).join(","));
  assert.equal(skills.length, 22);
  assert.equal(skills.at(-1), "Skill 22");
  assert.equal(getSkillsLimitError(21), "Add up to 20 unique skills. Remove 1 skill to save your profile.");
  assert.equal(getSkillsLimitError(skills.length), "Add up to 20 unique skills. Remove 2 skills to save your profile.");
});
