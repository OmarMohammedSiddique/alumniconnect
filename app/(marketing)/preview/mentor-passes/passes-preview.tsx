"use client";

import { MentorCard, type Mentor } from "@/app/(dashboard)/discover/mentor-card";
import { MentorFan } from "@/app/(dashboard)/discover/mentor-fan";

const FICTIONAL: Mentor[] = [
  { id: "demo-1", full_name: "Grace Wanjiku", headline: "Machine learning lead building data platforms for airline operations", bio: "Fictional demo profile. Twelve years across analytics, data engineering and applied machine learning.", skills: ["Machine learning", "Python", "Data platforms", "Team leadership"], industry: "Technology", graduation_year: 2012, shared_skills: ["Python", "Machine learning"] },
  { id: "demo-2", full_name: "Brian Otieno", headline: "Aviation and commercial contracts counsel", bio: "Fictional demo profile. Advises on aircraft leasing, regulatory compliance and commercial agreements.", skills: ["Contract law", "Negotiation", "Compliance"], industry: "Law", graduation_year: 2009, shared_skills: [] },
  { id: "demo-3", full_name: "Fatima Noor", headline: "Product manager for customer booking journeys", bio: "Fictional demo profile. Leads discovery, roadmaps and delivery for digital booking products.", skills: ["Product strategy", "User research", "Roadmapping"], industry: "Product", graduation_year: 2015, shared_skills: ["User research"], accepting_requests: false },
  { id: "demo-4", full_name: "David Kimani", headline: "Cloud infrastructure engineer", bio: "Fictional demo profile. Designs resilient cloud systems and mentors early career engineers.", skills: ["Cloud architecture", "Kubernetes", "Reliability"], industry: "Technology", graduation_year: 2014, shared_skills: [] },
  { id: "demo-5", full_name: "Esther Mwangi", headline: "Finance director and leadership coach", bio: "Fictional demo profile. Two decades in airline finance, planning and executive leadership.", skills: ["Financial planning", "Leadership", "Budgeting"], industry: "Finance", graduation_year: 2001, shared_skills: ["Leadership"] },
  { id: "demo-6", full_name: "Samuel Kiptoo", headline: "Ground operations and safety manager", bio: "Fictional demo profile. Runs turnaround operations and safety management programmes.", skills: ["Ground operations", "Safety management"], industry: "Operations", graduation_year: 2007, shared_skills: [] },
  { id: "demo-7", full_name: "Amina Hassan", headline: "Cabin crew training lead", bio: "Fictional demo profile. Develops service and safety training for new cabin crew.", skills: ["Training design", "Customer service", "Coaching"], industry: "Training", graduation_year: 2011, shared_skills: [] },
];

const STATUS: Record<string, "pending" | "connected"> = { "demo-2": "pending", "demo-5": "connected" };

export function PassesPreview() {
  return (
    <main className="min-h-svh bg-surface px-4 py-8 sm:px-6 lg:px-10">
      <div className="product-page grid gap-6">
        <header className="page-heading !mb-0">
          <h1>Mentor passes preview</h1>
          <p>Local design review with fictional profiles. This page is unavailable in production.</p>
        </header>
        <MentorFan
          mentors={FICTIONAL}
          label="Recommended Mentors"
          positionLabel="Rank"
          getStatus={(id) => STATUS[id] ?? null}
          renderActive={(mentor) => <MentorCard mentor={mentor} mode="semantic" requestStatus={STATUS[mentor.id] ?? null} />}
        />
      </div>
    </main>
  );
}
