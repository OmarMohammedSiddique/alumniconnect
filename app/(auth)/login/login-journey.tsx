"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { ArrowRight, Plane } from "lucide-react";
import styles from "./login-sky.module.css";

export function WindowMark() {
  return <div className={styles.windowMark} aria-hidden="true"><div className={styles.windowView}><div className={styles.cloudStrip}>{[0, 1, 2, 3].map(tile => <span key={tile} />)}</div><div className={styles.shade} /></div></div>;
}

export interface Arrival {
  kind: "signed-in" | "registered" | "confirmation";
  destination?: string;
  onContinue?: () => void;
}
export interface AuthJourneyHandle { play: (arrival: Arrival) => Promise<void>; reset: () => void; }

export function LoginJourney({ children, previewEnabled = false, ref, surface = "login" }: { children: ReactNode; previewEnabled?: boolean; ref?: Ref<AuthJourneyHandle>; surface?: "login" | "signup" }) {
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const pass = useRef<HTMLElement>(null);
  const motion = useRef<Animation[]>([]);
  const overlay = useRef<HTMLElement | null>(null);
  const running = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const returnButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    mounted.current = true;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => motion.current.forEach(animation => animation.finish());
    const preferenceChanged = () => { if (reduced.matches) finish(); };
    window.addEventListener("resize", finish);
    reduced.addEventListener("change", preferenceChanged);
    return () => {
      mounted.current = false;
      window.removeEventListener("resize", finish);
      reduced.removeEventListener("change", preferenceChanged);
      motion.current.forEach(animation => animation.cancel());
      overlay.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (showPass && !busy) {
      pass.current?.scrollIntoView({ block: "center", behavior: "instant" });
      returnButton.current?.focus({ preventScroll: true });
    }
  }, [showPass, busy]);

  async function previewJourney() {
    if (running.current || !card.current || !pass.current || !root.current) return;
    running.current = true;
    setBusy(true);
    const login = card.current;
    const ticket = pass.current;
    const source = login.querySelector<HTMLButtonElement>('button[type="submit"][data-login-primary]');
    const sourceBounds = (source ?? login).getBoundingClientRect();
    const animate = (element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = element.animate(frames, { fill: "both", ...options });
      motion.current.push(animation);
      return animation;
    };
    const ease = "cubic-bezier(.22,1,.36,1)";
    login.inert = true;
    try {
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const mark = login.querySelector<HTMLElement>(`.${styles.windowMark}`)!;
        const bounds = mark.getBoundingClientRect();
        const viewport = document.createElement("div");
        viewport.className = styles.flightViewport;
        viewport.setAttribute("aria-hidden", "true");
        const flyingWindow = mark.cloneNode(true) as HTMLElement;
        flyingWindow.classList.add(styles.flyingWindow);
        Object.assign(flyingWindow.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
        viewport.append(flyingWindow);
        root.current.append(viewport);
        overlay.current = viewport;
        const scale = Math.max(innerWidth / (bounds.width - 10), innerHeight / (bounds.height - 10)) * 1.3;
        const x = innerWidth / 2 - bounds.left - bounds.width / 2;
        const y = innerHeight / 2 - bounds.top - bounds.height / 2;
        await animate(flyingWindow, [{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${x}px,${y}px) scale(${scale})` }], { duration: 1200, easing: "cubic-bezier(.65,0,.35,1)" }).finished;
      }
      ticket.hidden = false;
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const bounds = ticket.getBoundingClientRect();
        if (overlay.current) animate(overlay.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 280 });
        animate(ticket, [{ transform: `translate(${sourceBounds.left - bounds.left}px,${sourceBounds.top - bounds.top}px) scale(${sourceBounds.width / bounds.width},${sourceBounds.height / bounds.height})` }, { transform: "translate(0,0) scale(1)" }], { duration: 820, easing: ease });
        animate(login, [{ opacity: 1 }, { opacity: 0 }], { duration: 240 });
        ticket.querySelectorAll(`.${styles.ticketMain}, .${styles.ticketStub}`).forEach(panel => animate(panel, [{ backgroundColor: "#101415", offset: 0 }, { backgroundColor: "#101415", offset: .28 }, { backgroundColor: "#fcfdfb", offset: 1 }], { duration: 680 }));
        ticket.querySelectorAll("[data-flight-detail]").forEach((detail, index) => animate(detail, [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 340, delay: 460 + (index % 2) * 60, easing: ease }));
        await Promise.all(motion.current.map(animation => animation.finished));
      }
      if (mounted.current) {
        setShowPass(true);
        login.hidden = true;
        returnButton.current?.focus({ preventScroll: true });
      }
    } catch {
      // A route change cancels animation promises and unmounts this local preview.
      if (mounted.current) { ticket.hidden = true; login.hidden = false; }
    } finally {
      motion.current.forEach(animation => animation.cancel());
      motion.current = [];
      overlay.current?.remove();
      overlay.current = null;
      login.inert = false;
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  useImperativeHandle(ref, () => ({
    reset: resetJourney,
    async play(nextArrival) {
      setArrival(nextArrival);
      // Commit ticket copy before measuring and animating the shared surface.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      await previewJourney();
    },
  }));

  function resetJourney() {
    setShowPass(false);
    setArrival(null);
    if (card.current) card.current.hidden = false;
    if (pass.current) pass.current.hidden = true;
    card.current?.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
  }

  return <div ref={root} className={`${styles.journey} ${surface === "signup" ? styles.signupJourney : ""}`} data-sky-login aria-busy={busy}>
    <div className={styles.sky} aria-hidden="true" />
    <div className={styles.stage}>
      <div ref={card} className={surface === "signup" ? styles.signupJourneySurface : styles.card} hidden={showPass}>{children}</div>
      <section ref={pass} className={styles.ticket} hidden={!showPass} aria-label={arrival ? "Your mentorship boarding pass" : "Mentorship boarding pass design preview"}>
        <div className={styles.ticketMain}>
          <div data-flight-detail className={styles.ticketHeading}><span>AlumniKonneQt</span><span>{arrival ? arrival.kind === "confirmation" ? "Email confirmation needed" : arrival.kind === "registered" ? "Account created" : "Signed in" : "Design preview"}</span></div>
          <div data-flight-detail className={styles.route}><div><span>{arrival?.kind === "confirmation" ? "Account details" : "Your profile"}</span><strong>YOU</strong></div><Plane aria-hidden="true" /><div><span>{arrival?.kind === "confirmation" ? "Confirm your email" : "Your next connection"}</span><strong>{arrival?.kind === "confirmation" ? "MAIL" : "NEXT"}</strong></div></div>
          <div data-flight-detail className={styles.ticketInfo}><div><span>Start with</span><p>Your skills &amp; goals</p></div><div><span>Explore</span><p>Recommended mentors</p></div></div>
          <p data-flight-detail className={styles.ticketNote}>{arrival?.kind === "confirmation" ? "Check your email to complete registration. Your account is not confirmed yet." : "A new connection starts with what you know and where you want to go."}</p>
          <div data-flight-detail className={styles.ticketActions}><p>{arrival ? arrival.kind === "confirmation" ? "Follow the confirmation instructions before entering your workspace." : "Your account is ready. Continue when you are." : surface === "signup" ? "Preview only. No account has been created." : "Preview only. Sign in to enter your workspace."}</p><button ref={returnButton} type="button" onClick={() => { if (arrival?.onContinue) arrival.onContinue(); else if (arrival?.destination) window.location.assign(arrival.destination); else resetJourney(); }} disabled={busy}>{arrival ? arrival.kind === "confirmation" ? "View email instructions" : arrival.destination?.startsWith("/profile") ? "Continue to your profile" : "Open workspace" : surface === "signup" ? "Back to signup" : "Back to sign in"} <ArrowRight size={16} aria-hidden="true" /></button></div>
        </div>
        <div className={styles.ticketStub}><div data-flight-detail><span>Next stop</span><strong>{arrival?.kind === "confirmation" ? "Email" : arrival?.destination?.startsWith("/profile") ? "Profile" : "Discover"}</strong></div><div data-flight-detail className={styles.barcode} aria-hidden="true" /><span data-flight-detail>Mentorship journey</span></div>
      </section>
    </div>
    {previewEnabled && !showPass && !arrival && <button type="button" className={styles.previewButton} onClick={previewJourney} disabled={busy}>{busy ? "Flying into the preview…" : "Preview the boarding pass"}<ArrowRight size={14} aria-hidden="true" /><span>Local design preview</span></button>}
    <p className="sr-only" role="status">{showPass ? arrival ? arrival.kind === "confirmation" ? "Registration needs email confirmation. View your email instructions." : "Authentication completed. Your boarding pass is ready." : "Mentorship boarding pass preview. No sign-in was submitted." : busy ? "Playing the window flight preview" : ""}</p>
  </div>;
}
