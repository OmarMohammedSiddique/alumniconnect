import Link from "next/link";
import { HeroBackground } from "@/components/three/hero-scene";
import { ScrollReveal } from "@/components/animations/scroll-reveal";

const FEATURES = [
  {
    title: "Semantic matching",
    body: "Your profile becomes a 384-dimension vector. Mentors are ranked by meaning, not keyword luck — so a “data pipelines” mentee still finds the “ML platforms” mentor.",
  },
  {
    title: "Explanations, not black boxes",
    body: "Every match shows the shared skills that drove it, so you know why someone is suggested before you reach out.",
  },
  {
    title: "No cold start",
    body: "Matching works from your very first profile save — no months of interaction history needed before recommendations mean something.",
  },
  {
    title: "Institution-controlled",
    body: "Role-based access enforced in the database itself, with moderation and auditing built in from day one.",
  },
];

export default function LandingPage() {
  return (
    <div>
      <section className="relative isolate flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-neutral-950 p-6 text-center">
        <HeroBackground />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_55%_45%_at_center,rgba(9,9,14,0.72),transparent_72%)]"
        />
        <h1 className="relative z-10 max-w-2xl text-5xl font-semibold tracking-tight text-white [text-shadow:0_2px_24px_rgba(2,2,10,0.65)]">
          Your alumni network, working for you
        </h1>
        <p className="relative z-10 max-w-md text-lg text-white/80 [text-shadow:0_1px_16px_rgba(2,2,10,0.6)]">
          AlumniConnect pairs mentees with the right mentors using semantic
          matching — intelligent from day one.
        </p>
        <div className="relative z-10 flex gap-3">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-6 text-sm font-medium text-neutral-900 transition hover:bg-white/90"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-white/25 px-6 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-24">
        <ScrollReveal className="grid gap-10 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <h2 className="mb-2 text-xl font-semibold">{f.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </ScrollReveal>
      </section>

      <footer className="border-t px-6 py-8 text-center text-sm text-muted-foreground">
        AlumniConnect — a Strathmore University capstone project.
      </footer>
    </div>
  );
}
