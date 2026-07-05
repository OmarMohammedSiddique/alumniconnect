// Sprint 1 PoC: verify MiniLM via transformers.js produces normalized
// 384-dim embeddings where semantic similarity ranks sensibly.
import { pipeline } from "@huggingface/transformers";

const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });

async function embed(text) {
  const out = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}

const cosine = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

const mentee = await embed(
  "Aspiring data engineer interested in machine learning pipelines and cloud infrastructure.\nSkills: Python, SQL, Airflow",
);
const mlMentor = await embed(
  "Senior machine learning engineer building data platforms.\nSkills: Python, Spark, MLOps\nIndustry: Technology",
);
const lawMentor = await embed(
  "Corporate lawyer specialising in mergers and acquisitions.\nSkills: Contract Law, Negotiation\nIndustry: Legal",
);

console.log("dimensions:", mentee.length);
console.log("norm:", Math.hypot(...mentee).toFixed(4));
const simML = cosine(mentee, mlMentor);
const simLaw = cosine(mentee, lawMentor);
console.log("mentee <-> ML mentor:", simML.toFixed(4));
console.log("mentee <-> law mentor:", simLaw.toFixed(4));

if (mentee.length !== 384) throw new Error("FAIL: wrong dimensions");
if (Math.abs(Math.hypot(...mentee) - 1) > 0.01) throw new Error("FAIL: not normalized");
if (simML <= simLaw) throw new Error("FAIL: semantic ranking is wrong");
console.log("EMBEDDING POC PASSED");
