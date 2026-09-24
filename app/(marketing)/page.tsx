import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ScrollReveal } from "@/components/animations/scroll-reveal";

const FEATURES = [
  {
    title: "Semantic matching",
    body: "Your profile becomes a 384-dimension vector. Mentors are ranked by meaning, not keyword luck - so a “data pipelines” mentee still finds the “ML platforms” mentor.",
  },
  {
    title: "Explanations, not black boxes",
    body: "Every match shows the shared skills that drove it, so you know why someone is suggested before you reach out.",
  },
  {
    title: "No cold start",
    body: "Matching works from your very first profile save - no months of interaction history needed before recommendations mean something.",
  },
  {
    title: "Institution-controlled",
    body: "Role-based access enforced in the database itself, with moderation and auditing built in from day one.",
  },
];

export default function LandingPage() {
  return (
    <div>
      <section className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="max-w-2xl text-5xl font-semibold tracking-tight">
          Your alumni network, working for you
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          AlumniConnect pairs mentees with the right mentors using semantic
          matching - intelligent from day one.
        </p>
        <div className="flex gap-3">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Get started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "lg" })}
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
        AlumniConnect - a Strathmore University capstone project.
      </footer>
    </div>
  );
}
