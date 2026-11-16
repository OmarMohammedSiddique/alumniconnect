// Rule-based profile suggestions from CV text (#108). Runs on our server only;
// pure functions so every rule is unit tested with fictional sample text.
import { MAX_BIO_LENGTH, MAX_HEADLINE_LENGTH, MAX_INDUSTRY_LENGTH } from "./form-limits.ts";
import { MAX_PROFILE_SKILLS, MAX_SKILL_LENGTH } from "./profile-skills.ts";

export interface CvSuggestions {
  headline: string | null;
  bio: string | null;
  skills: string[];
  industry: string | null;
  graduation_year: number | null;
}

type Section = "summary" | "experience" | "education" | "skills" | "other";

const SECTION_HEADINGS: [Section, RegExp][] = [
  ["summary", /^(professional\s+)?(summary|profile|about(\s+me)?|career\s+objective|objective|personal\s+statement|overview)$/i],
  ["experience", /^(work\s+|professional\s+|employment\s+|relevant\s+)?(experience|history|employment|career\s+history|work\s+history)$/i],
  ["education", /^(education|academic\s+(background|qualifications)|qualifications|education\s+and\s+training)$/i],
  ["skills", /^((technical|key|core|professional)\s+)?(skills|competencies|expertise|skills\s+and\s+(abilities|competencies)|tools(\s+and\s+technologies)?)$/i],
  ["other", /^(certifications?|licen[cs]es|languages|interests|hobbies|references|projects|awards|publications|volunteer(ing)?(\s+experience)?|achievements|referees|contact(\s+details)?)$/i],
];

/** Common skills recognised anywhere in the CV, kept in their usual spelling. */
const KNOWN_SKILLS = [
  "Python", "SQL", "JavaScript", "TypeScript", "Java", "C#", "C++", "Go", "R", "Excel", "Power BI", "Tableau",
  "Machine Learning", "Deep Learning", "Data Analysis", "Data Engineering", "Data Science", "Statistics",
  "React", "Node.js", "Next.js", "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Linux",
  "Spark", "Git", "DevOps", "Cybersecurity", "Networking", "Agile", "Scrum", "Project Management",
  "Product Management", "Stakeholder Management", "Leadership", "Team Leadership", "Mentoring", "Coaching",
  "Public Speaking", "Communication", "Negotiation", "Customer Service", "Sales", "Marketing", "Digital Marketing",
  "Financial Analysis", "Accounting", "Audit", "Budgeting", "Risk Management", "Compliance", "Procurement",
  "Supply Chain", "Logistics", "Operations Management", "Human Resources", "Recruitment", "Training",
  "Strategic Planning", "Business Analysis", "Research", "Writing", "UX Design", "UI Design", "Figma",
  "Aviation Safety", "Flight Operations", "Air Traffic Management", "Aircraft Maintenance", "Cabin Crew",
  "Revenue Management", "Crew Scheduling", "Ground Handling", "Safety Management Systems", "Quality Assurance",
];

const INDUSTRY_KEYWORDS: [string, RegExp][] = [
  ["Aviation", /\b(aviation|airline|airways|airport|aircraft|flight|cabin crew|pilot|aerospace|ground handling|air traffic)\b/gi],
  ["Technology", /\b(software|developer|engineering team|data platform|cloud|devops|machine learning|it support|technology|saas|web application)\b/gi],
  ["Finance", /\b(finance|financial|bank(ing)?|accounting|audit(or)?|investment|fintech|treasury|insurance)\b/gi],
  ["Healthcare", /\b(health(care)?|hospital|clinical|nurs(e|ing)|medical|pharma(ceutical)?|patient)\b/gi],
  ["Law", /\b(law|legal|advocate|lawyer|solicitor|litigation|counsel|paralegal)\b/gi],
  ["Education", /\b(teach(er|ing)|lecturer|school|university|curriculum|education(al)?|tutor)\b/gi],
  ["Marketing", /\b(marketing|brand(ing)?|advertising|campaigns?|seo|social media)\b/gi],
  ["Logistics", /\b(logistics|supply chain|freight|warehouse|shipping|cargo|procurement)\b/gi],
  ["Hospitality", /\b(hospitality|hotel|tourism|travel|restaurant|catering)\b/gi],
  ["Engineering", /\b(mechanical|electrical|civil engineer(ing)?|maintenance engineer|manufacturing)\b/gi],
];

const CONTACT_LINE = {
  // Emails, links and phone numbers (nine or more digits, so "2021 - 2024" is not a phone).
  test(line: string): boolean {
    if (/@|https?:\/\/|www\.|linkedin|github\.com/i.test(line)) return true;
    return (line.match(/\+?\d[\d\s()-]{7,}\d/g) ?? []).some((run) => run.replace(/\D/g, "").length >= 9);
  },
};
const BULLET = /^[\s•●▪◦‣∙·*–\-]+/;
const YEAR = /\b(19[5-9]\d|20\d\d)\b/g;

function cleanLine(line: string): string {
  return line.replace(BULLET, "").replace(/\s+/g, " ").trim();
}

function headingSection(line: string): Section | null {
  const text = line.replace(/[:：]\s*$/, "").trim();
  if (!text || text.length > 45) return null;
  for (const [section, pattern] of SECTION_HEADINGS) if (pattern.test(text)) return section;
  return null;
}

/** Splits CV text into its top block and named sections. */
export function splitSections(text: string): { top: string[]; sections: Record<Section, string[]> } {
  const sections: Record<Section, string[]> = { summary: [], experience: [], education: [], skills: [], other: [] };
  const top: string[] = [];
  let current: Section | null = null;
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = cleanLine(raw);
    if (!line) continue;
    const heading = headingSection(line);
    if (heading) {
      current = heading;
      continue;
    }
    // "Skills: Python, SQL" or "Summary: ..." is a heading with its content on the same line.
    const inline = line.match(/^([A-Za-z][A-Za-z ]{2,40}):\s*(\S.*)$/);
    const inlineHeading = inline ? headingSection(inline[1]) : null;
    if (inline && inlineHeading) {
      current = inlineHeading;
      sections[current].push(inline[2]);
      continue;
    }
    if (current) sections[current].push(line);
    else top.push(line);
  }
  return { top, sections };
}

function truncateAtSentence(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(" "))).trim();
}

const DATE_ONLY = /^(\(?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(19|20)\d\d\s*([-–to]+\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?((19|20)\d\d|present|current|now))?\)?$/i;

function looksLikeTitle(line: string): boolean {
  return line.length >= 4 && line.length <= MAX_HEADLINE_LENGTH && !CONTACT_LINE.test(line)
    && !DATE_ONLY.test(line) && !/[.!?]$/.test(line) && /[a-z]/i.test(line);
}

const ROLE_WORD = /\b(engineer|manager|officer|analyst|developer|designer|consultant|director|lead|head|specialist|teacher|nurse|pilot|student|graduate|accountant|auditor|lawyer|advocate|scientist|intern|coordinator|executive|founder|associate|assistant|technician|administrator|architect|researcher|lecturer|mentor|advis[eo]r|supervisor|agent|crew|controller|planner|attendant|captain|steward|dispatcher|economist|editor|writer|marketer|programmer|doctor|pharmacist|surveyor|chef)s?\b/i;
// "London, United Kingdom" or "Nairobi, Kenya": capitalised words separated by commas, no role word.
const PLACE = /^[A-Z][\w.'-]*(?: [A-Z][\w.'-]*)*(?:, ?[A-Z][\w.'-]*(?: [A-Z][\w.'-]*)*)+$/;
const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const TRAILING_DATES = new RegExp(`[\\s|,;(\u2013-]*(?:\\b${MONTH}\\s*)?\\b(?:19|20)\\d\\d\\b.*$`, "i");

function isPlace(line: string): boolean {
  return PLACE.test(line) && !ROLE_WORD.test(line);
}

function tidyRole(line: string): string {
  return line.replace(TRAILING_DATES, "").replace(/\s+\|\s+/, " at ").trim().slice(0, MAX_HEADLINE_LENGTH);
}

function extractHeadline(top: string[], experience: string[]): string | null {
  // A short descriptive line under the name is usually the person's headline.
  const candidates = top.slice(1, 4).filter((line) => looksLikeTitle(line) && line.split(" ").length >= 1 && !isPlace(line));
  const underName = candidates.find((line) => ROLE_WORD.test(line)) ?? candidates.find((line) => line.split(" ").length >= 2);
  if (underName) return tidyRole(underName) || null;
  // Otherwise the first role in the experience section, e.g. "Data Analyst at Acme" or "Data Analyst | Acme".
  const role = experience.find((line) => looksLikeTitle(line) && !isPlace(line));
  return role ? tidyRole(role) || null : null;
}

function extractBio(summary: string[]): string | null {
  const text = summary.filter((line) => !CONTACT_LINE.test(line)).join(" ").replace(/\s+/g, " ").trim();
  return text.length >= 20 ? truncateAtSentence(text, MAX_BIO_LENGTH) : null;
}

/** Splits a skills line on commas, semicolons, bars and bullets, but not inside brackets. */
export function splitItems(line: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "(" || char === "[") depth += 1;
    if ((char === ")" || char === "]") && depth > 0) depth -= 1;
    const separator = depth === 0 && (",;|•·".includes(char) || (char === " " && line[i + 1] === " "));
    if (separator) {
      items.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  items.push(current.trim());
  return items.filter(Boolean);
}

function extractSkills(skillLines: string[], fullText: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const add = (skill: string) => {
    const value = skill.replace(/^[^:]{2,30}:\s*/, "").replace(/[.;]+$/, "").trim();
    const key = value.toLowerCase();
    if (!value || (value.length < 2 && !KNOWN_SKILLS.includes(value)) || value.length > Math.min(40, MAX_SKILL_LENGTH) || seen.has(key)) return;
    if (value.split(" ").length > 4 || CONTACT_LINE.test(value) || /available on request|^references?\b/i.test(value)) return;
    seen.add(key);
    found.push(value);
  };
  for (const line of skillLines) {
    // "Programming: Python, SQL" keeps the items after the label.
    for (const item of splitItems(line.replace(/^[^:]{2,30}:\s*/, ""))) add(item);
  }
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&");
    // One and two letter skills (R, Go) need clear separators, so "R&D" is not "R".
    const pattern = skill.length <= 2
      ? new RegExp(`(^|[\\s,;/(])${escaped}($|[\\s,;/)])`, "m")
      : new RegExp(`(^|[^A-Za-z0-9+#.])${escaped}($|[^A-Za-z0-9+#])`, "i");
    if (pattern.test(fullText)) add(skill);
  }
  return found.slice(0, MAX_PROFILE_SKILLS);
}

function extractIndustry(fullText: string): string | null {
  let best: string | null = null;
  let bestCount = 1; // Require at least two mentions to suggest an industry.
  for (const [industry, pattern] of INDUSTRY_KEYWORDS) {
    const count = fullText.match(pattern)?.length ?? 0;
    if (count > bestCount) {
      best = industry;
      bestCount = count;
    }
  }
  return best ? best.slice(0, MAX_INDUSTRY_LENGTH) : null;
}

const SCHOOL = /\b(a[- ]?levels?|o[- ]?levels?|gcses?|igcses?|kcse|kcpe|high school|secondary school|primary school|international baccalaureate)\b/i;

function extractGraduationYear(education: string[], now: Date): number | null {
  const max = now.getFullYear();
  const years = education
    .filter((line) => !/\b(expected|present|current|ongoing)\b/i.test(line) && !SCHOOL.test(line))
    .flatMap((line) => line.match(YEAR) ?? [])
    .map(Number)
    .filter((year) => year >= 1950 && year <= max);
  return years.length ? Math.max(...years) : null;
}

export function extractCvSuggestions(text: string, now = new Date()): CvSuggestions {
  const { top, sections } = splitSections(text);
  return {
    headline: extractHeadline(top, sections.experience),
    bio: extractBio(sections.summary),
    skills: extractSkills(sections.skills, text),
    industry: extractIndustry(text),
    graduation_year: extractGraduationYear(sections.education, now),
  };
}

// Vercel rejects request bodies over 4.5 MB before the route runs, so stay below it.
export const CV_MAX_BYTES = 4 * 1024 * 1024;
export type CvFileKind = "pdf" | "docx";

/** Identifies a supported CV by its first bytes, not its name or claimed type. */
export function detectCvKind(bytes: Uint8Array, fileName: string): CvFileKind | null {
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04; // PK..
  if (isPdf) return "pdf";
  if (isZip && /\.docx$/i.test(fileName)) return "docx";
  return null;
}

/** Decodes the XML entities Word uses in text runs; invalid code points become nothing. */
function decodeEntities(text: string): string {
  const codePoint = (value: number) => (value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : "");
  return text.replace(/&(#x[0-9a-fA-F]{1,6}|#\d{1,7}|quot|apos|lt|gt|amp);/g, (_, entity: string) => {
    if (entity[0] === "#") return codePoint(entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
    return ({ quot: "\"", apos: "'", lt: "<", gt: ">", amp: "&" } as Record<string, string>)[entity];
  });
}

/**
 * Turns Word document XML into plain text with paragraph line breaks. A single pass walks tags and
 * text runs (each token stops at the next "<", so crafted input cannot cause slow backtracking) and
 * keeps only text. Deleted text and field codes are skipped, and angle brackets are never emitted.
 */
export function docxXmlToText(xml: string): string {
  const parts: string[] = [];
  let skipping = false;
  for (const [token] of xml.matchAll(/<[^<>]*>|[^<]+|</g)) {
    if (token.length > 1 && token[0] === "<") {
      const name = /^<\/?([\w:.-]+)/.exec(token)?.[1];
      const closing = token[1] === "/";
      if (name === "w:delText" || name === "w:instrText") skipping = !closing && !token.endsWith("/>");
      else if (name === "w:tab") parts.push(" ");
      else if (name === "w:br" || (name === "w:p" && closing)) parts.push("\n");
      continue;
    }
    if (token === "<" || skipping) continue;
    parts.push(decodeEntities(token).replace(/[<>]/g, " "));
  }
  return parts.join("");
}
