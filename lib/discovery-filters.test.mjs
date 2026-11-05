import test from "node:test";
import assert from "node:assert/strict";
import {
  extractAvailableFilters,
  filterMentors,
  getActiveRelationshipStatus,
  buildRequestStateMap,
} from "./discovery-filters.ts";

const sampleMentors = [
  {
    id: "m-1",
    full_name: "Alice Aviation",
    headline: "Flight Operations Lead",
    industry: "Aviation Operations",
    skills: ["Safety Management", "Flight Planning", "Compliance"],
    graduation_year: 2018,
  },
  {
    id: "m-2",
    full_name: "Bob Boeing",
    headline: "Senior Aeronautical Engineer",
    industry: "Aerospace Engineering",
    skills: ["Avionics", "Safety Management", "CAD"],
    graduation_year: 2015,
  },
  {
    id: "m-3",
    full_name: "Carol Cargo",
    headline: "Fleet Logistics Specialist",
    industry: "Logistics",
    skills: ["Supply Chain", "Air Cargo", "Compliance"],
    graduation_year: 2020,
  },
  {
    id: "m-4",
    full_name: "David Dispersed",
    headline: "No Industry Mentor",
    industry: "",
    skills: [],
    graduation_year: null,
  },
];

test("extractAvailableFilters: extracts unique sorted industries, skills, and graduation years", () => {
  const { industries, skills, graduationYears } = extractAvailableFilters(sampleMentors);

  assert.deepEqual(industries, [
    "Aerospace Engineering",
    "Aviation Operations",
    "Logistics",
  ]);

  assert.deepEqual(skills, [
    "Air Cargo",
    "Avionics",
    "CAD",
    "Compliance",
    "Flight Planning",
    "Safety Management",
    "Supply Chain",
  ]);

  assert.deepEqual(graduationYears, [2020, 2018, 2015]);
});

test("extractAvailableFilters: handles empty or malformed inputs without throwing", () => {
  const empty = extractAvailableFilters([]);
  assert.deepEqual(empty, { industries: [], skills: [], graduationYears: [] });

  const malformed = extractAvailableFilters([
    { id: "1", full_name: "Test", industry: null, skills: null, graduation_year: 1800 },
    { id: "2", full_name: "Test 2", industry: "   ", skills: ["  ", "Valid Skill"], graduation_year: 2022 },
  ]);
  assert.deepEqual(malformed.industries, []);
  assert.deepEqual(malformed.skills, ["Valid Skill"]);
  assert.deepEqual(malformed.graduationYears, [2022]);
});

test("filterMentors: returns all mentors when no filter is provided", () => {
  const result = filterMentors(sampleMentors, {});
  assert.equal(result.length, 4);

  const resultAll = filterMentors(sampleMentors, { industry: "all", skills: [] });
  assert.equal(resultAll.length, 4);
});

test("filterMentors: filters by industry case-insensitively", () => {
  const result = filterMentors(sampleMentors, { industry: "aviation operations" });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "m-1");

  const none = filterMentors(sampleMentors, { industry: "Healthcare" });
  assert.equal(none.length, 0);
});

test("filterMentors: filters by single skill", () => {
  const result = filterMentors(sampleMentors, { skills: ["Avionics"] });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "m-2");

  const shared = filterMentors(sampleMentors, { skills: ["Compliance"] });
  assert.equal(shared.length, 2);
  assert.deepEqual(shared.map((m) => m.id), ["m-1", "m-3"]);
});

test("filterMentors: supports matchMode 'any' and 'all' across multiple skills", () => {
  const anyResult = filterMentors(sampleMentors, {
    skills: ["Avionics", "Flight Planning"],
    matchMode: "any",
  });
  assert.equal(anyResult.length, 2);
  assert.deepEqual(anyResult.map((m) => m.id), ["m-1", "m-2"]);

  const allResult = filterMentors(sampleMentors, {
    skills: ["Safety Management", "Compliance"],
    matchMode: "all",
  });
  assert.equal(allResult.length, 1);
  assert.equal(allResult[0].id, "m-1");
});

test("filterMentors: combines industry and skills filters", () => {
  const result = filterMentors(sampleMentors, {
    industry: "Logistics",
    skills: ["Compliance"],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "m-3");

  const mismatch = filterMentors(sampleMentors, {
    industry: "Aerospace Engineering",
    skills: ["Flight Planning"],
  });
  assert.equal(mismatch.length, 0);
});

test("getActiveRelationshipStatus: maps persisted request states correctly", () => {
  const map = {
    "m-1": "pending",
    "m-2": "accepted",
    "m-3": "declined",
    "m-4": "cancelled",
  };

  assert.equal(getActiveRelationshipStatus("m-1", map), "pending");
  assert.equal(getActiveRelationshipStatus("m-2", map), "connected");
  assert.equal(getActiveRelationshipStatus("m-3", map), null);
  assert.equal(getActiveRelationshipStatus("m-4", map), null);
  assert.equal(getActiveRelationshipStatus("m-unknown", map), null);
  assert.equal(getActiveRelationshipStatus("m-1", {}), null);
});

test("filterMentors: filters by cohort graduation_year and combines with industry/skills", () => {
  const cohort2018 = filterMentors(sampleMentors, { graduationYear: 2018 });
  assert.equal(cohort2018.length, 1);
  assert.equal(cohort2018[0].id, "m-1");

  const combined = filterMentors(sampleMentors, {
    industry: "Logistics",
    graduationYear: "2020",
    skills: ["Air Cargo"],
  });
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, "m-3");

  const wrongYear = filterMentors(sampleMentors, {
    industry: "Logistics",
    graduationYear: "2018",
  });
  assert.equal(wrongYear.length, 0);
});

test("buildRequestStateMap: prioritizes accepted and pending over historical cancelled/declined rows", () => {
  const requests = [
    { mentor_id: "m-1", status: "accepted" },
    { mentor_id: "m-1", status: "cancelled" }, // older cancelled row returned later
    { mentor_id: "m-2", status: "declined" },
    { mentor_id: "m-2", status: "pending" },
    { mentor_id: "m-3", status: "cancelled" },
  ];
  const map = buildRequestStateMap(requests, ["m-4"]);
  assert.equal(map["m-1"], "accepted");
  assert.equal(map["m-2"], "pending");
  assert.equal(map["m-3"], "cancelled");
  assert.equal(map["m-4"], "accepted");
});

test("filterMentors: filters by mentor availability (onlyAccepting) and combines with other filters", () => {
  const mentorsWithAvailability = [
    { id: "m-1", full_name: "A", industry: "Aviation", skills: ["Python"], accepting_requests: true },
    { id: "m-2", full_name: "B", industry: "Aviation", skills: ["Python"], accepting_requests: false },
    { id: "m-3", full_name: "C", industry: "Finance", skills: ["SQL"] }, // default undefined treated as accepting
  ];

  const all = filterMentors(mentorsWithAvailability, { onlyAccepting: false });
  assert.equal(all.length, 3);

  const acceptingOnly = filterMentors(mentorsWithAvailability, { onlyAccepting: true });
  assert.deepEqual(acceptingOnly.map((m) => m.id), ["m-1", "m-3"]);

  const acceptingAviation = filterMentors(mentorsWithAvailability, {
    industry: "Aviation",
    onlyAccepting: true,
  });
  assert.deepEqual(acceptingAviation.map((m) => m.id), ["m-1"]);
});
