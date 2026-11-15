import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { Brand, PrototypeNotice } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { CookieSettingsTrigger } from "@/components/cookie-settings-trigger";
import {
  ArrowDown,
  ArrowRight,
  Check,
  GraduationCap,
  MoveUpRight,
  Compass,
} from "lucide-react";
import { LandingIntro } from "@/components/cabin-intro/landing-intro";
import styles from "./landing.module.css";

const STEPS = [
  {
    title: "Start with your profile",
    body: "Add your skills, interests and career goals so Mentors can understand what you want to learn.",
  },
  {
    title: "Explore relevant experience",
    body: "Review recommended Mentors and shared skills, or search by name, skill or field.",
  },
  {
    title: "Make an introduction",
    body: "Send a request with a short introduction. Accepted requests become connections.",
  },
];

const FAQS = [
  { question: "Who is AlumniKonneQt for?", answer: "AlumniKonneQt is an independent academic prototype for Kenya Airways alumni and eligible participants. Join as a Mentee seeking guidance or a Mentor sharing your experience. It is not an official Kenya Airways product." },
  { question: "How are Mentors recommended?", answer: "Recommendations use the skills, interests, and goals in your profile to find relevant Mentor profiles. Shared skills help you understand each suggestion. You can also use keyword and category search to explore on your own." },
  { question: "Can I join as a Mentor?", answer: "Yes. Choose the Mentor role when you create your account, then complete your profile with your experience, industry, and the skills you can help others develop." },
  { question: "What happens after I send a request?", answer: "The Mentor can accept or decline your request. You can track the response and manage accepted connections from your requests page." },
];
export default async function LandingPage() {
  const { user } = await getAuthenticatedUser();
  const member = Boolean(user);
  const profileHref = member ? "/profile" : "/signup";
  const workspaceHref = member ? "/discover" : "/signup";
  return (
    <div className={styles.page}>
      <LandingIntro />
      <a className={styles.skipLink} href="#main">Skip to content</a>
      <div className={styles.identityBar} role="region" aria-label="Academic prototype notice"><div className={styles.container}><span>An independent academic prototype</span></div></div>
      <header className={styles.header}>
        <div className={styles.navbar}>
          <Link href="/" aria-label="AlumniKonneQt home"><Brand className={styles.brand} imageClassName="h-10 sm:h-12" /></Link>
          <nav className={styles.navLinks} aria-label="Main navigation">
            <a href="#how-it-works">How it works</a><a href="#community">For our community</a><a href="#questions">FAQs</a>
          </nav>
          <div className={styles.navActions}>
            <Link href={member ? "/profile" : "/login"} className={styles.signIn}>{member ? "Your profile" : "Sign in"}</Link>
            <Link href={workspaceHref} className={styles.smallButton}>{member ? "Open workspace" : "Join the network"} <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </header>
      <main id="main">
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-heading">
          <div className={styles.heroCopy}>
            <p className={styles.heroLabel}>Kenya Airways alumni · Mentorship</p>
            <h1 id="hero-heading">Find guidance in<br /><span>shared experience.</span></h1>
            <p className={styles.heroDescription}>Meet Mentors who understand your field. Explore their experience, see the skills you share and make an introduction.</p>
            <div className={styles.heroActions}><Link href={workspaceHref} className={styles.primaryButton}>{member ? "Explore your network" : "Find your Mentor"} <ArrowRight size={19} aria-hidden="true" /></Link><a href="#how-it-works" className={styles.textLink}>See how it works <ArrowDown size={17} aria-hidden="true" /></a></div>
            <PrototypeNotice className={styles.heroDisclosure} />
          </div>
          <figure className={styles.heroVisual} aria-labelledby="profile-example-title">
            <figcaption className={styles.exampleHeading}><span id="profile-example-title">A reason to reach out</span><span>Illustrative profile</span></figcaption>
            <div className={styles.examplePerson}><span className={styles.exampleInitials} aria-hidden="true">WM</span><div><h2>Wanjiru Muthoni</h2><p>Mentor · Airport operations</p></div></div>
            <p className={styles.exampleBio}>Experience in ground operations, team leadership and coordinating the work behind each departure.</p>
            <div className={styles.exampleSkills} aria-label="Example mentor skills"><span>Ground operations</span><span>Team leadership</span><span>Operational planning</span></div>
            <div className={styles.sharedEvidence}><span className={styles.evidenceLabel}>Common ground</span><p>Team leadership</p><span>A shared skill gives you a starting point for your introduction.</span></div>
            <p className={styles.exampleDisclaimer}>Example content, not a member profile. Shared skills do not guarantee mentorship suitability.</p>
          </figure>
        </section>
        <nav className={`${styles.container} ${styles.utilityPanel}`} aria-label="Start exploring AlumniKonneQt">
          <div className={styles.utilityIntro}><h2>How will you take part?</h2></div>
          <Link href="/discover" className={styles.utilityChoice}><Compass size={24} aria-hidden="true" /><span><strong>Find guidance</strong><span>Discover Mentors in your field</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
          <Link href={profileHref} className={styles.utilityChoice}><GraduationCap size={24} aria-hidden="true" /><span><strong>{member ? "Keep your profile current" : "Share your experience"}</strong><span>{member ? "Update your experience and goals" : "Join the network as a Mentor"}</span></span><ArrowRight size={18} aria-hidden="true" /></Link>
        </nav>

        <section id="how-it-works" className={`${styles.container} ${styles.section}`} aria-labelledby="steps-heading">
          <div className={styles.sectionIntro}><h2 id="steps-heading">From profile to introduction</h2></div>
          <ol className={styles.steps}>{STEPS.map((step, index) => <li key={step.title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
        </section>
        <section id="community" className={styles.community} aria-labelledby="community-heading"><div className={`${styles.container} ${styles.communityInner}`}>
          <div className={styles.communityIntro}><h2 id="community-heading">Learn from experience.<br />Share your own.</h2><p>Join as a Mentee seeking guidance or a Mentor sharing your experience.</p></div>
          <div className={styles.audiences}>
            <article><p className={styles.audienceLabel}>For Mentees</p><h3>Find guidance for your next step.</h3><p>Explore career paths with someone who’s walked them. Find Mentors with relevant experience and reach out with a clear starting point.</p><Link href={workspaceHref} className={styles.communityLink}>{member ? "Discover Mentors" : "Find your direction"} <MoveUpRight size={18} aria-hidden="true" /></Link></article>
            <article><p className={styles.audienceLabel}>For Mentors</p><h3>Help someone navigate your field.</h3><p>Create a Mentor profile, describe the skills you can help develop and review introductions from Mentees.</p><Link href={member ? "/requests" : "/signup"} className={styles.communityLink}>{member ? "View your requests" : "Give back as a Mentor"} <MoveUpRight size={18} aria-hidden="true" /></Link></article>
          </div>
        </div></section>
        <section id="matching" className={`${styles.container} ${styles.matchingSection}`} aria-labelledby="matching-heading"><div><h2 id="matching-heading">Know why a profile<br />caught your attention.</h2><p>Recommendations use your profile text to surface Mentor profiles. Exact shared skills provide context; you decide whether the experience fits your goals.</p><Link href={profileHref} className={styles.textLink}>{member ? "Update your profile" : "Build your profile"} <ArrowRight size={18} aria-hidden="true" /></Link></div><ul className={styles.benefits}><li><Check aria-hidden="true" /><div><h3>Recommendations from the start</h3><p>Begin with your profile. You don’t need months of activity to start discovering Mentors.</p></div></li><li><Check aria-hidden="true" /><div><h3>A reason to reach out</h3><p>See shared skills alongside recommendations, so you have a starting point for your introduction.</p></div></li><li><Check aria-hidden="true" /><div><h3>Your search, your choice</h3><p>Use keywords and categories to explore your network. You decide who to connect with.</p></div></li></ul></section>
        <section id="questions" className={`${styles.container} ${styles.faqSection}`} aria-labelledby="faq-heading"><div><h2 id="faq-heading">Before you join</h2></div><div className={styles.faqs}>{FAQS.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></section>
        <section className={`${styles.container} ${styles.finalCta}`} aria-labelledby="join-heading"><div><h2 id="join-heading">Start with your experience.</h2><p>Create a profile to seek guidance or offer it.</p></div><Link href={workspaceHref} className={styles.primaryButton}>{member ? "Open workspace" : "Join the network"} <ArrowRight size={19} aria-hidden="true" /></Link></section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <Link href="/" aria-label="AlumniKonneQt home"><Brand className={styles.brand} imageClassName="h-10" /></Link>
          <p>A Strathmore University academic prototype.</p>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-5">
            <Link href="/about-developer">About Developer</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <CookieSettingsTrigger />
            <a href="#how-it-works">How it works</a>
            <Link href={member ? "/discover" : "/login"}>{member ? "Open workspace" : "Sign in"}</Link>
            <a href="#main">Back to top ↑</a>
            <ThemeToggle />
          </nav>
        </div>
        <PrototypeNotice className={`${styles.container} ${styles.independence}`} />
      </footer>
    </div>
  );
}
