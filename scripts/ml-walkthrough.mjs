// Run through npm run ml:walkthrough. The react-server condition lets a Node
// demonstration import the same server-only TypeScript module used by /api/embed.
import {
  EMBEDDING_DIMENSIONS,
  buildProfileEmbeddingText,
  generateEmbedding,
} from "../lib/embedding/embed.ts";

const profiles = [
  {
    name: "Mentee query",
    profile: {
      headline: "Seeking guidance on creating dependable digital tools",
      bio: "I want to turn ideas into useful products for many people and learn how complex online work is planned.",
      skills: ["Programming", "Problem solving"],
      industry: "",
      graduation_year: null,
    },
  },
  {
    name: "Mentor A: related meaning, different vocabulary",
    profile: {
      headline: "Senior software engineer focused on scalable web platforms",
      bio: "I mentor early career developers in API architecture, production reliability, and front end engineering.",
      skills: ["TypeScript", "React", "System Design"],
      industry: "Technology",
      graduation_year: 2016,
    },
  },
  {
    name: "Mentor B: finance",
    profile: {
      headline: "Investment analyst in corporate finance",
      bio: "I mentor graduates interested in company valuation, financial modelling, and capital markets.",
      skills: ["Accounting", "Valuation", "Excel"],
      industry: "Finance",
      graduation_year: 2015,
    },
  },
  {
    name: "Mentor C: public health",
    profile: {
      headline: "Public health researcher",
      bio: "I study disease prevention and mentor graduates in epidemiology and clinical research.",
      skills: ["Epidemiology", "Biostatistics"],
      industry: "Healthcare",
      graduation_year: 2014,
    },
  },
];

function norm(vector) {
  return Math.hypot(...vector);
}

function cosine(a, b) {
  if (a.length !== b.length) throw new Error("Vector dimensions differ");
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  return dot / (norm(a) * norm(b));
}

async function main() {
  console.log("Local ML walkthrough: frozen Xenova/all-MiniLM-L6-v2 inference");
  console.log("No database, credentials, model training, or hosted data are used.\n");

  const examples = [];
  for (const { name, profile } of profiles) {
    const text = buildProfileEmbeddingText(profile);
    console.log(`${name} profile text:\n${text}\n`);
    const vector = await generateEmbedding(text);
    const length = norm(vector);
    console.log(`  embedding dimensions: ${vector.length}; L2 norm: ${length.toFixed(6)}\n`);
    if (vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`${name}: expected ${EMBEDDING_DIMENSIONS} dimensions, got ${vector.length}`);
    }
    if (!vector.every(Number.isFinite) || !Number.isFinite(length) || Math.abs(length - 1) > 0.001) {
      throw new Error(`${name}: embedding must be finite and have unit L2 norm`);
    }
    examples.push({ name, vector });
  }

  const query = examples[0];
  const ranked = examples.slice(1).map((mentor) => ({
    name: mentor.name,
    similarity: cosine(query.vector, mentor.vector),
  }));
  if (ranked.some(({ similarity }) => !Number.isFinite(similarity) || similarity < -1.000001 || similarity > 1.000001)) {
    throw new Error("Cosine similarity must be finite and within [-1, 1]");
  }
  ranked.sort((a, b) => b.similarity - a.similarity);

  console.log("Cosine similarities and ranking for the mentee query:");
  ranked.forEach(({ name, similarity }, index) => {
    console.log(`  ${index + 1}. ${name}: ${similarity.toFixed(6)}`);
  });
  console.log("\nHigher cosine similarity means a smaller angle between these normalized vectors.");
  console.log("These scores compare text representations, not human-reviewed mentor suitability or a probability of success.");
  console.log("Postgres uses 1 - cosine distance (<=>) to rank stored mentor vectors; this local calculation illustrates that math.");
  console.log("This example does not evaluate the full app, database permissions, or real-user outcomes.");
}

main().catch((error) => {
  console.error("ML walkthrough failed:", error);
  process.exitCode = 1;
});
