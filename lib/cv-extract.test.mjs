import assert from "node:assert/strict";
import test from "node:test";
import { detectCvKind, docxXmlToText, extractCvSuggestions, splitSections } from "./cv-extract.ts";

const NOW = new Date("2026-11-16T00:00:00Z");

// Fictional sample CVs written for these tests.
const AVIATION_CV = `Amani Fictional
Flight Operations Officer
amani.fictional@example.test | +254 700 000 000 | linkedin.com/in/amani-fictional

Professional Summary
Flight operations officer with six years at a regional airline. I coordinate crew scheduling and
dispatch, and I want to grow into airline operations leadership.

Work Experience
Flight Operations Officer | Example Airways
2020 - Present
• Coordinated daily flight dispatch for 40 aircraft
• Improved crew scheduling turnaround

Education
BSc Aviation Management, Example University
2014 - 2018

Skills
Crew Scheduling, Flight Operations, Excel; Stakeholder Management
Languages: English, Swahili
`;

const TECH_CV = `Jordan Example
jordan@example.test

EXPERIENCE
Data Analyst at Example Fintech, 2021 - 2024
Built dashboards in Power BI and wrote SQL for the finance team.

EDUCATION
MSc Data Science, 2022 (expected 2027 for PhD)
BSc Statistics 2019

TECHNICAL SKILLS:
Programming: Python, SQL, R
Tools: Tableau, Git
`;

test("splits a CV into sections by common headings", () => {
  const { top, sections } = splitSections(AVIATION_CV);
  assert.equal(top[0], "Amani Fictional");
  assert.ok(sections.summary[0].startsWith("Flight operations officer"));
  assert.ok(sections.experience.length >= 3);
  assert.deepEqual(sections.education, ["BSc Aviation Management, Example University", "2014 - 2018"]);
});

test("extracts headline, summary, skills, industry and graduation year", () => {
  const result = extractCvSuggestions(AVIATION_CV, NOW);
  assert.equal(result.headline, "Flight Operations Officer");
  assert.match(result.bio, /^Flight operations officer with six years/);
  assert.match(result.bio, /leadership\.$/);
  for (const skill of ["Crew Scheduling", "Flight Operations", "Excel", "Stakeholder Management"]) {
    assert.ok(result.skills.includes(skill), skill);
  }
  assert.equal(result.industry, "Aviation");
  assert.equal(result.graduation_year, 2018);
});

test("falls back to the first role when there is no headline under the name", () => {
  const result = extractCvSuggestions(TECH_CV, NOW);
  assert.equal(result.headline, "Data Analyst at Example Fintech");
  assert.equal(result.bio, null, "no summary section means no bio suggestion");
  for (const skill of ["Python", "SQL", "R", "Tableau", "Git", "Power BI"]) {
    assert.ok(result.skills.includes(skill), skill);
  }
  assert.ok(!result.skills.some((skill) => skill.startsWith("Programming")));
});

test("ignores expected or future graduation years", () => {
  assert.equal(extractCvSuggestions(TECH_CV, NOW).graduation_year, 2019);
});

test("never suggests contact details as profile content", () => {
  const result = extractCvSuggestions(AVIATION_CV, NOW);
  const all = [result.headline, result.bio, ...result.skills].join(" ");
  assert.doesNotMatch(all, /@|linkedin|\+254/);
});

test("returns empty suggestions for text with nothing recognisable", () => {
  assert.deepEqual(extractCvSuggestions("hello", NOW), {
    headline: null, bio: null, skills: [], industry: null, graduation_year: null,
  });
});

test("caps skills at the profile limit and keeps them short", () => {
  const many = Array.from({ length: 40 }, (_, i) => `Skill ${i}`).join(", ");
  const result = extractCvSuggestions(`Skills\n${many}\nA very long phrase that is clearly a sentence rather than a skill name`, NOW);
  assert.equal(result.skills.length, 20);
  assert.ok(result.skills.every((skill) => skill.length <= 40));
});

test("needs repeated evidence before suggesting an industry", () => {
  assert.equal(extractCvSuggestions("Worked one summer at a hotel.", NOW).industry, null);
});

test("detects PDF and Word files by content, not by name alone", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
  const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]);
  assert.equal(detectCvKind(pdf, "cv.pdf"), "pdf");
  assert.equal(detectCvKind(pdf, "renamed.docx"), "pdf");
  assert.equal(detectCvKind(zip, "cv.docx"), "docx");
  assert.equal(detectCvKind(zip, "archive.zip"), null);
  assert.equal(detectCvKind(new Uint8Array([0x4d, 0x5a, 0, 0]), "cv.pdf"), null);
});

test("converts Word XML to text with paragraph breaks and entities", () => {
  const xml = '<w:document><w:body><w:p><w:r><w:t>Skills</w:t></w:r></w:p><w:p><w:r><w:t>Python &amp; SQL</w:t><w:tab/><w:t>Excel</w:t></w:r></w:p></w:body></w:document>';
  assert.equal(docxXmlToText(xml), "Skills\nPython & SQL Excel\n");
});
