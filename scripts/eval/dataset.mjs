// Synthetic profile dataset for the matching evaluation (proposal Specific
// Objective v). Each profile carries a ground-truth `domain` label used to
// score matching relevance. Generation is deterministic (seeded RNG) so
// evaluation runs are reproducible.

export const DOMAINS = [
  {
    key: "data_ml",
    industry: "Technology",
    skills: ["Python", "Machine Learning", "SQL", "Spark", "Data Engineering", "Statistics", "TensorFlow", "Airflow"],
    mentorRoles: ["machine learning engineer", "data scientist", "data platform engineer", "analytics lead", "ML researcher"],
    mentorFocus: ["recommendation systems", "data pipelines at scale", "experimentation platforms", "predictive analytics", "MLOps and model deployment"],
    menteeGoals: [
      "I want to build predictive models and work with large datasets in my career.",
      "Hoping to move from analytics into building intelligent systems that learn from data.",
      "Fresh graduate aiming to become a data professional; I enjoy statistics and coding.",
    ],
    menteeSkills: [["Python", "SQL"], ["Statistics", "Python"], ["SQL", "Excel"]],
  },
  {
    key: "software",
    industry: "Technology",
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "System Design", "Testing", "Git", "REST APIs"],
    mentorRoles: ["senior software engineer", "staff engineer", "engineering manager", "full-stack developer", "tech lead"],
    mentorFocus: ["large-scale web applications", "developer productivity and tooling", "API platforms", "front-end architecture", "mentoring junior engineers"],
    menteeGoals: [
      "I want to grow from junior developer into someone who can design whole systems.",
      "Learning web development and hoping to land my first engineering role.",
      "Interested in writing cleaner code and understanding how big applications are built.",
    ],
    menteeSkills: [["JavaScript", "React"], ["HTML", "CSS", "JavaScript"], ["Java", "Git"]],
  },
  {
    key: "cloud_devops",
    industry: "Technology",
    skills: ["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD", "Linux", "Networking", "Monitoring"],
    mentorRoles: ["cloud architect", "site reliability engineer", "DevOps lead", "platform engineer", "infrastructure consultant"],
    mentorFocus: ["cloud migrations", "container orchestration", "infrastructure as code", "reliability and observability", "platform engineering teams"],
    menteeGoals: [
      "I want to learn how production systems are deployed and kept running reliably.",
      "Aiming for a career automating infrastructure and working with cloud platforms.",
      "System administrator hoping to modernise my skills toward cloud and automation.",
    ],
    menteeSkills: [["Linux", "Bash"], ["AWS", "Docker"], ["Networking", "Linux"]],
  },
  {
    key: "product",
    industry: "Technology",
    skills: ["Product Management", "Roadmapping", "User Research", "Agile", "Stakeholder Management", "Product Analytics", "Prioritisation", "Wireframing"],
    mentorRoles: ["product manager", "head of product", "product lead", "group product manager", "product consultant"],
    mentorFocus: ["B2B SaaS products", "product discovery and research", "growth and retention", "platform products", "zero-to-one launches"],
    menteeGoals: [
      "I want to move from engineering into deciding what gets built and why.",
      "Interested in understanding users and shaping products people love.",
      "Business graduate hoping to break into tech product roles.",
    ],
    menteeSkills: [["Agile", "Communication"], ["User Research", "Figma"], ["Analytics", "Presentation"]],
  },
  {
    key: "finance",
    industry: "Finance",
    skills: ["Financial Analysis", "Audit", "Accounting", "Financial Modelling", "Valuation", "Budgeting", "IFRS", "Risk Management"],
    mentorRoles: ["finance director", "senior auditor", "investment analyst", "financial controller", "CFO"],
    mentorFocus: ["corporate finance and audit", "investment analysis", "financial planning and analysis", "risk and compliance", "professional certifications like CPA and CFA"],
    menteeGoals: [
      "I want a career analysing companies and advising on investment decisions.",
      "Accounting graduate working toward my CPA and looking for career direction.",
      "Interested in how businesses manage money, budgets and financial risk.",
    ],
    menteeSkills: [["Excel", "Accounting"], ["Financial Analysis", "Excel"], ["Bookkeeping", "QuickBooks"]],
  },
  {
    key: "law",
    industry: "Legal",
    skills: ["Contract Law", "Negotiation", "Corporate Governance", "Compliance", "Litigation", "IP Law", "Due Diligence", "Arbitration"],
    mentorRoles: ["corporate lawyer", "legal counsel", "partner at a law firm", "compliance officer", "advocate"],
    mentorFocus: ["mergers and acquisitions", "commercial contracts", "intellectual property", "regulatory compliance", "dispute resolution"],
    menteeGoals: [
      "Law student hoping to specialise in advising companies on deals and contracts.",
      "I want to understand how to build a career in commercial legal practice.",
      "Interested in the intersection of regulation, business and technology.",
    ],
    menteeSkills: [["Legal Research", "Writing"], ["Contract Law", "Research"], ["Public Speaking", "Debate"]],
  },
  {
    key: "marketing",
    industry: "Marketing",
    skills: ["Digital Marketing", "SEO", "Content Strategy", "Brand Management", "Social Media", "Copywriting", "Market Research", "Email Marketing"],
    mentorRoles: ["marketing director", "brand manager", "growth marketer", "content lead", "communications manager"],
    mentorFocus: ["brand building", "performance marketing", "content and storytelling", "go-to-market strategy", "audience growth"],
    menteeGoals: [
      "I want to learn how brands grow audiences and turn attention into customers.",
      "Creative writer hoping to build a career around campaigns and storytelling.",
      "Interested in the analytical side of advertising and online growth.",
    ],
    menteeSkills: [["Social Media", "Canva"], ["Writing", "Instagram"], ["Google Ads", "Excel"]],
  },
  {
    key: "health",
    industry: "Healthcare",
    skills: ["Public Health", "Epidemiology", "Clinical Research", "Health Policy", "Biostatistics", "Patient Care", "Health Informatics", "Grant Writing"],
    mentorRoles: ["public health specialist", "clinical researcher", "health programme manager", "epidemiologist", "health policy advisor"],
    mentorFocus: ["community health programmes", "clinical trials", "disease surveillance", "health systems strengthening", "research funding and publication"],
    menteeGoals: [
      "I want to design programmes that improve health outcomes for communities.",
      "Nursing graduate interested in moving toward research and policy work.",
      "Passionate about using data to understand and prevent disease.",
    ],
    menteeSkills: [["Patient Care", "Communication"], ["Biology", "Statistics"], ["Research", "Writing"]],
  },
];

// Deterministic RNG (mulberry32) so the dataset is reproducible.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Grace", "Brian", "Fatima", "David", "Esther", "Kevin", "Amina", "Peter", "Lucy", "Hassan", "Joy", "Samuel", "Naima", "John", "Wanjiru", "Ali", "Mercy", "Daniel", "Zainab", "George"];
const LAST = ["Wanjiku", "Otieno", "Noor", "Kimani", "Mwangi", "Omondi", "Hassan", "Kariuki", "Achieng", "Abdi", "Njeri", "Mutua", "Said", "Ochieng", "Kamau", "Yusuf", "Wairimu", "Maina", "Ahmed", "Odhiambo"];

function pick(r, arr) {
  return arr[Math.floor(r() * arr.length)];
}
function pickN(r, arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
  }
  return out;
}

export function generateMentors(perDomain, seed = 42) {
  const r = rng(seed);
  const mentors = [];
  for (const d of DOMAINS) {
    for (let i = 0; i < perDomain; i++) {
      const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
      const role = pick(r, d.mentorRoles);
      const focus = pick(r, d.mentorFocus);
      const years = 5 + Math.floor(r() * 18);
      mentors.push({
        domain: d.key,
        email: `mentor.${d.key}.${i}@eval.local`,
        full_name: name,
        headline: `${role[0].toUpperCase()}${role.slice(1)} - ${focus}`,
        bio: `${years} years working as a ${role}, focused on ${focus}. I enjoy mentoring people earlier in their ${d.industry.toLowerCase()} careers and sharing what I have learned.`,
        skills: pickN(r, d.skills, 4 + Math.floor(r() * 3)),
        industry: d.industry,
        graduation_year: 2024 - years,
      });
    }
  }
  return mentors;
}

export function generateMentees(perDomain, seed = 1337) {
  const r = rng(seed);
  const mentees = [];
  for (const d of DOMAINS) {
    for (let i = 0; i < perDomain; i++) {
      const goal = d.menteeGoals[i % d.menteeGoals.length];
      const skills = d.menteeSkills[i % d.menteeSkills.length];
      mentees.push({
        domain: d.key,
        full_name: `${pick(r, FIRST)} ${pick(r, LAST)}`,
        headline: `Early-career: ${goal.split(" ").slice(0, 6).join(" ")}…`,
        bio: goal,
        skills,
        industry: d.industry,
        graduation_year: 2023 + (i % 3),
      });
    }
  }
  return mentees;
}
