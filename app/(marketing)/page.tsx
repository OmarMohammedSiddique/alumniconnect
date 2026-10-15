import Link from "next/link";
import { Brand, PrototypeNotice } from "@/components/brand";
import {
  ArrowDown,
  ArrowRight,
  Check,
  GraduationCap,
  MoveUpRight,
  Sparkles,
  Users,
} from "lucide-react";
import styles from "./landing.module.css";

const STEPS = [
  {
    title: "Tell us where you want to go",
    body: "Add your skills, interests, and career goals. Your profile is the starting point for finding relevant guidance.",
  },
  {
    title: "Find people who understand",
    body: "Explore recommended Mentors, see the skills you share, or search by the field that interests you.",
  },
  {
    title: "Start a conversation",
    body: "Send a mentorship request. When your mentor accepts, you can take the next step together.",
  },
];

const FAQS = [
  { question: "Who is AlumniConnect for?", answer: "AlumniConnect is an independent academic prototype for Kenya Airways alumni and eligible participants. Join as a Mentee seeking guidance or a Mentor sharing your experience. It is not an official Kenya Airways product." },
  { question: "How are Mentors recommended?", answer: "Recommendations use the skills, interests, and goals in your profile to find relevant Mentor profiles. Shared skills help you understand each suggestion. You can also use keyword and category search to explore on your own." },
  { question: "Can I join as a Mentor?", answer: "Yes. Choose the Mentor role when you create your account, then complete your profile with your experience, industry, and the skills you can help others develop." },
  { question: "What happens after I send a request?", answer: "The Mentor can accept or decline your request. You can track the response and manage accepted connections from your requests page." },
];
export default function LandingPage() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main">Skip to content</a>
      <header className={styles.header}>
        <div className={styles.navbar}>
          <Link href="/" aria-label="AlumniConnect home"><Brand className={styles.brand} /></Link>
          <nav className={styles.navLinks} aria-label="Main navigation">
            <a href="#how-it-works">How it works</a><a href="#community">For our community</a><a href="#questions">FAQs</a>
          </nav>
          <div className={styles.navActions}><Link href="/login" className={styles.signIn}>Sign in</Link><Link href="/signup" className={styles.smallButton}>Join the network <ArrowRight size={16} aria-hidden="true" /></Link></div>
        </div>
      </header>
      <main id="main">
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-heading">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> A professional community. A shared way forward.</p>
            <h1 id="hero-heading">Your next chapter.<br /><span>Someone’s been there.</span></h1>
            <p className={styles.heroDescription}>Mentorship and professional connections for Kenya Airways alumni and eligible participants. Find guidance from people who understand your experience and ambitions.</p>
            <div className={styles.heroActions}><Link href="/signup" className={styles.primaryButton}>Find your Mentor <ArrowRight size={19} aria-hidden="true" /></Link><a href="#how-it-works" className={styles.textLink}>See how it works <ArrowDown size={17} aria-hidden="true" /></a></div>
            <p className={styles.heroNote}><Users size={17} aria-hidden="true" /> For Mentees moving forward. For Mentors giving back.</p>
            <PrototypeNotice className={styles.heroDisclosure} />
          </div>
          <figure className={styles.preview} aria-label="Illustrative mentor recommendation">
            <div className={styles.previewTop}><span className={styles.previewLogo}><Sparkles size={17} aria-hidden="true" /> Your next connection</span><span className={styles.exampleLabel}>Example preview</span></div>
            <div className={styles.previewContent}>
              <div className={styles.previewHeading}><span>Discover Mentors</span><span className={styles.liveDot}>Based on your profile</span></div>
              <div className={styles.interestLine}>Your interests <span>Technology</span><span>Career growth</span></div>
              <div className={styles.mentorIdentity}><div className={styles.avatar} aria-hidden="true">AN<span><Check size={12} /></span></div><div><h2>Alex N.</h2><p>Software engineer &amp; alumni Mentor</p><span className={styles.alumniLabel}><GraduationCap size={14} aria-hidden="true" /> Class of 2019</span></div></div>
              <p className={styles.mentorBio}>“I help early-career developers navigate their first role, grow their skills, and find their own path in tech.”</p>
              <div className={styles.skillTags}><span>Software engineering</span><span>Career development</span><span>Leadership</span></div>
              <div className={styles.matchReason}><Sparkles size={17} aria-hidden="true" /><div><strong>A connection with something in common</strong><p>Shared interests in technology and career development.</p></div></div>
              <Link href="/signup" className={styles.previewButton}>Discover your own matches <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
            <figcaption>Good guidance starts with common ground.</figcaption>
          </figure>
        </section>
        <nav className={`${styles.container} ${styles.utilityPanel}`} aria-label="Start exploring AlumniConnect">
          <div><h2>Put your experience in good company.</h2><p>Explore your next connection or learn what goes into a recommendation.</p></div>
          <div className={styles.utilityActions}><Link href="/discover" className={styles.primaryButton}>Discover Mentors <ArrowRight size={18} aria-hidden="true" /></Link><a href="#matching" className={styles.textLink}>How matching works <ArrowRight size={17} aria-hidden="true" /></a></div>
        </nav>
        <div className={styles.contextStrip}><div className={styles.container}><p><GraduationCap size={21} aria-hidden="true" /> Rooted in shared professional experience.</p><span>Built to turn shared experience into a way forward.</span></div></div>
        <section id="how-it-works" className={`${styles.container} ${styles.section}`} aria-labelledby="steps-heading">
          <div className={styles.sectionIntro}><h2 id="steps-heading">From “what’s next?”<br />to a real connection.</h2><p>You bring the ambition. Your alumni network brings the experience. Here’s how to bring them together.</p></div>
          <ol className={styles.steps}>{STEPS.map((step, index) => <li key={step.title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
        </section>
        <section id="community" className={styles.community} aria-labelledby="community-heading"><div className={`${styles.container} ${styles.communityInner}`}>
          <div className={styles.communityIntro}><span className={styles.communitySymbol} aria-hidden="true"><Users size={32} /></span><h2 id="community-heading">Different chapters.<br />A shared story.</h2><p>Whether you’re looking for direction or ready to share what you’ve learned, there’s a place for you here.</p></div>
          <div className={styles.audiences}>
            <article><p className={styles.audienceLabel}>For Mentees</p><h3>You don’t have to figure it all out alone.</h3><p>Explore career paths with someone who’s walked them. Find Mentors with relevant experience and reach out with a clear starting point.</p><Link href="/signup" className={styles.communityLink}>Find your direction <MoveUpRight size={18} aria-hidden="true" /></Link></article>
            <article><p className={styles.audienceLabel}>For Mentors</p><h3>Your experience could be someone’s turning point.</h3><p>Share the lessons you wish you’d known earlier. Create a Mentor profile and connect with Mentees who can learn from your journey.</p><Link href="/signup" className={styles.communityLink}>Give back as a Mentor <MoveUpRight size={18} aria-hidden="true" /></Link></article>
          </div>
        </div></section>
        <section id="matching" className={`${styles.container} ${styles.matchingSection}`} aria-labelledby="matching-heading"><div><h2 id="matching-heading">More common ground.<br />Less guesswork.</h2><p>People describe the same ambitions in different ways. AlumniConnect looks at the meaning behind your profile to help surface relevant Mentors.</p><Link href="/signup" className={styles.textLink}>Build your profile <ArrowRight size={18} aria-hidden="true" /></Link></div><ul className={styles.benefits}><li><Check aria-hidden="true" /><div><h3>Recommendations from the start</h3><p>Begin with your profile. You don’t need months of activity to start discovering Mentors.</p></div></li><li><Check aria-hidden="true" /><div><h3>A reason to reach out</h3><p>See shared skills alongside recommendations, so you have a starting point for your introduction.</p></div></li><li><Check aria-hidden="true" /><div><h3>Your search, your choice</h3><p>Use keywords and categories to explore your network. You decide who to connect with.</p></div></li></ul></section>
        <section id="questions" className={`${styles.container} ${styles.faqSection}`} aria-labelledby="faq-heading"><div><h2 id="faq-heading">A few things<br />you might be wondering.</h2><p>A little clarity before your first connection.</p></div><div className={styles.faqs}>{FAQS.map(faq => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">+</span></summary><p>{faq.answer}</p></details>)}</div></section>
        <section className={`${styles.container} ${styles.finalCta}`} aria-labelledby="join-heading"><div><h2 id="join-heading">A conversation can<br />change what comes next.</h2><p>Make your next connection with AlumniConnect.</p></div><Link href="/signup" className={styles.primaryButton}>Join the network <ArrowRight size={19} aria-hidden="true" /></Link></section>
      </main>
      <footer className={styles.footer}><div className={styles.container}><Link href="/" aria-label="AlumniConnect home"><Brand className={styles.brand} /></Link><p>A Strathmore University academic prototype.</p><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><Link href="/login">Sign in</Link><a href="#main">Back to top ↑</a></nav></div><PrototypeNotice className={`${styles.container} ${styles.independence}`} /></footer>
    </div>
  );
}
