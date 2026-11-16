import assert from "node:assert/strict";
import test from "node:test";
import { planCvApply } from "./cv-apply.ts";

const empty = { headline: "", bio: "", skills: "", industry: "", graduation_year: "" };
const suggestions = {
  headline: "Flight Operations Officer",
  bio: "Six years in airline operations.",
  skills: ["Python", "SQL", "Excel"],
  industry: "Aviation",
  graduation_year: 2018,
};

test("empty fields are filled from the CV", () => {
  const plan = planCvApply(empty, suggestions);
  assert.deepEqual(plan.fill, {
    headline: "Flight Operations Officer",
    bio: "Six years in airline operations.",
    skills: "Python, SQL, Excel",
    industry: "Aviation",
    graduation_year: "2018",
  });
  assert.equal(plan.offers.length, 0);
});

test("typed values are never overwritten, only offered", () => {
  const plan = planCvApply({ ...empty, headline: "Ops lead", industry: "aviation" }, suggestions);
  assert.equal(plan.fill.headline, undefined);
  assert.deepEqual(plan.offers.map((o) => o.field), ["headline"]);
  assert.equal(plan.offers[0].value, "Flight Operations Officer");
  assert.ok(!plan.offers.some((o) => o.field === "industry"), "same value in different case is not offered");
});

test("existing skills are kept and only new ones are offered", () => {
  const plan = planCvApply({ ...empty, skills: "sql, Leadership" }, suggestions);
  const offer = plan.offers.find((o) => o.field === "skills");
  assert.equal(offer.value, "sql, Leadership, Python, Excel");
  assert.equal(offer.description, "Add Python, Excel");
});

test("skill offers respect the 20 skill limit", () => {
  const full = Array.from({ length: 20 }, (_, i) => `Skill ${i}`).join(", ");
  const plan = planCvApply({ ...empty, skills: full }, suggestions);
  assert.ok(!plan.offers.some((o) => o.field === "skills"));
});

test("fields the CV did not reveal are reported as missing", () => {
  const plan = planCvApply(empty, { headline: null, bio: null, skills: [], industry: "Aviation", graduation_year: null });
  assert.deepEqual(plan.missingLabels, ["Headline", "Bio", "Skills", "Graduation year"]);
  assert.deepEqual(plan.filledLabels, ["Industry"]);
});
