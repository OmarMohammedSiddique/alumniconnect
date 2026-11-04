import assert from "node:assert/strict";
import test from "node:test";
import { buildKickstarterMessage } from "./connection-kickstarter.ts";

test("generates tailored starter message for a mentor reaching out to a mentee", () => {
  const msg = buildKickstarterMessage({
    isMentor: true,
    partnerName: "Alex Mentee",
    partnerIndustry: "Aviation & Logistics",
  });

  assert.match(msg, /^Hi Alex Mentee,/);
  assert.match(msg, /supporting your journey in Aviation & Logistics/);
  assert.match(msg, /20–30 minute introductory call/);
});

test("generates tailored starter message for a mentee reaching out to a mentor", () => {
  const msg = buildKickstarterMessage({
    isMentor: false,
    partnerName: "Sarah Mentor",
    partnerIndustry: "Software Engineering",
  });

  assert.match(msg, /^Hi Sarah Mentor,/);
  assert.match(msg, /learning from your experience in your journey in Software Engineering/);
  assert.match(msg, /flexible around your schedule/);
});

test("provides clean fallbacks when partner name or industry is missing", () => {
  const mentorFallback = buildKickstarterMessage({
    isMentor: true,
    partnerName: "",
    partnerIndustry: "",
  });
  assert.match(mentorFallback, /^Hi there,/);
  assert.match(mentorFallback, /supporting your career and professional goals/);

  const menteeFallback = buildKickstarterMessage({
    isMentor: false,
    partnerName: "  ",
    partnerIndustry: undefined,
  });
  assert.match(menteeFallback, /^Hi there,/);
  assert.match(menteeFallback, /learning from your experience in your career and professional goals/);
});
