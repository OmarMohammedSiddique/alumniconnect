import type { Metadata } from "next";
import { ClockStrip } from "@/components/nairobi-clock";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  GraduationCap,
  Sparkles,
  Code2,
  BrainCircuit,
  Shield,
} from "lucide-react";
import { Brand, PrototypeNotice } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { CookieSettingsTrigger } from "@/components/cookie-settings-trigger";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "About the Developer - Omar Siddique | AlumniKonneQt",
  description:
    "Meet Omar Siddique, the software engineer and researcher who developed AlumniKonneQt as an academic capstone at Strathmore University.",
};

export default function AboutDeveloperPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Top Identity & Navigation Header */}
      <header className="border-b border-border bg-card">
        <ClockStrip />
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="AlumniKonneQt home" className="inline-flex items-center">
            <Brand imageClassName="h-10 sm:h-11" />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="border border-border bg-card p-6 sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent" className="font-semibold">
                  <Sparkles className="size-3 text-primary" aria-hidden="true" />
                  Lead Developer &amp; Researcher
                </Badge>
                <Badge tone="neutral">Strathmore University Capstone</Badge>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Omar Siddique
              </h1>
              <p className="text-base text-muted-foreground sm:text-lg">
                Software Engineer, Full-Stack Developer &amp; Machine Learning Researcher
              </p>
            </div>

            {/* Direct Link to Portfolio Website */}
            <div className="flex flex-wrap items-center gap-3 md:shrink-0">
              <a
                href="https://omarsiddique.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[color-mix(in_oklch,var(--primary),var(--foreground)_12%)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"
              >
                <Globe className="size-4" aria-hidden="true" />
                Visit omarsiddique.com
                <ExternalLink className="size-3.5 opacity-80" aria-hidden="true" />
              </a>

              <a
                href="https://github.com/OmarMohammedSiddique/alumniconnect"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"
                aria-label="GitHub Repository (opens in new tab)"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub
                <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-8 leading-relaxed text-muted-foreground">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              About the Developer
            </h2>
            <div className="mt-4 grid gap-4 text-sm sm:text-base">
              <p>
                Hi, I’m <strong>Omar Siddique</strong>, the developer and researcher behind <strong>AlumniKonneQt</strong>.
                I created this project as an independent academic capstone at <strong>Strathmore University</strong> in Nairobi, Kenya.
              </p>
              <p>
                AlumniKonneQt was inspired by the professional community of Kenya Airways alumni. Navigating career transitions,
                seeking senior mentorship, or sharing industry guidance often relies on disjointed channels or ad-hoc networking.
                I wanted to design an intelligent, purpose-built platform that bridges that gap by connecting mentees with mentors
                through semantic similarity, shared backgrounds, and genuine common ground.
              </p>
              <p>
                As the sole engineer and researcher on this capstone, I oversaw the entire lifecycle: from empirical data collection
                and research methodologies to full-stack architecture, machine learning model fine-tuning, security audits, and
                responsive UI/UX implementation.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Architecture & Capabilities */}
        <section className="mt-10 grid gap-6 md:grid-cols-2" aria-labelledby="architecture-heading">
          <div className="border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <BrainCircuit className="size-5" aria-hidden="true" />
              </div>
              <h3 id="architecture-heading" className="text-lg font-bold text-foreground">
                Semantic Matching &amp; AI
              </h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Developed an automated semantic discovery pipeline utilizing fine-tuned <strong>MiniLM-L6-v2</strong> sentence transformer
              embeddings paired with PostgreSQL <strong>pgvector</strong> cosine similarity indexing, allowing mentees to discover mentors
              based on underlying career aspirations and shared competencies rather than simple keyword matches.
            </p>
          </div>

          <div className="border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Code2 className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Modern Full-Stack Stack
              </h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Engineered with <strong>Next.js (App Router, React 19, Server Actions)</strong>, <strong>TypeScript</strong>, and
              <strong> Tailwind CSS v4</strong>. Backed by Supabase PostgreSQL with strict Row Level Security (RLS) policies,
              asynchronous webhook email notifications (Resend), and passwordless authentication.
            </p>
          </div>

          <div className="border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Shield className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Privacy &amp; Security Engineering
              </h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Built with privacy-by-design principles: strict data-minimization on registration, granular member profile privacy controls,
              member safety blocking &amp; reporting actions, and transparent cookie/storage preference controls.
            </p>
          </div>

          <div className="border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <GraduationCap className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Academic Rigor &amp; Evaluation
              </h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Backed by comprehensive empirical evaluation: baseline heuristic comparisons, statistical ranking benchmarks,
              automated test suites with over 150 regression specifications, and strict compliance with academic research standards.
            </p>
          </div>
        </section>

        {/* Connect & Attribution Card */}
        <div className="mt-10 border border-primary/40 bg-card p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="grid gap-2">
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Want to connect or explore more work?
              </h3>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                Visit my personal website to explore other engineering projects, research writings, and get in touch.
              </p>
            </div>
            <a
              href="https://omarsiddique.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[color-mix(in_oklch,var(--primary),var(--foreground)_12%)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring"
            >
              omarsiddique.com
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border bg-card py-8 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Brand imageClassName="h-8" />
            <span>&copy; {new Date().getFullYear()} AlumniKonneQt</span>
          </div>
          <nav aria-label="Developer page footer navigation" className="flex flex-wrap items-center gap-4">
            <Link href="/" className="underline-offset-4 hover:underline">
              Home
            </Link>
            <Link href="/privacy" className="underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            <CookieSettingsTrigger className="underline-offset-4 hover:underline" />
            <a
              href="https://omarsiddique.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              omarsiddique.com &rarr;
            </a>
          </nav>
        </div>
        <div className="mx-auto mt-4 max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <PrototypeNotice />
        </div>
      </footer>
    </div>
  );
}
