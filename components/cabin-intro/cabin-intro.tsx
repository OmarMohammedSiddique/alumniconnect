"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NairobiClock } from "@/components/nairobi-clock";
import styles from "./cabin-intro.module.css";

type Phase = "preload" | "cabin" | "lowering" | "dark" | "done";

// Beats measured against the reference choreography.
const PRELOAD_MS = 1600;
const SHADE_MS = 600;
const BLACK_MS = 220;
const EXIT_MS = 580;
const HINT = "Please lower your window shade";
const HINT_DELAY_MS = 900;
const FLAP_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const IGNORED_KEYS = new Set(["Tab", "Shift", "Control", "Alt", "Meta", "CapsLock"]);

export function CabinIntro({ onFinished }: { onFinished?: () => void }) {
  const [phase, setPhase] = useState<Phase>("preload");
  const [mounted, setMounted] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLButtonElement>(null);
  const hintTextRef = useRef<HTMLSpanElement>(null);

  const lowerShade = useCallback(() => {
    setPhase(current => (current === "cabin" ? "lowering" : current));
  }, []);

  // Timeline: each phase schedules the next one.
  useEffect(() => {
    const next: Partial<Record<Phase, [Phase | null, number]>> = {
      preload: ["cabin", PRELOAD_MS],
      lowering: ["dark", SHADE_MS],
      dark: ["done", BLACK_MS],
      done: [null, EXIT_MS],
    };
    const step = next[phase];
    if (!step) return;
    const pace = phase !== "preload" && prefersReducedMotion() ? 0.3 : 1;
    const timer = window.setTimeout(() => {
      if (step[0]) setPhase(step[0]);
      else {
        setMounted(false);
        onFinished?.();
      }
    }, step[1] * pace);
    return () => window.clearTimeout(timer);
  }, [phase, onFinished]);

  // The page underneath must not scroll while the cabin is on screen.
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [mounted]);

  // Split-flap hint: letters settle left to right once the cabin is in view.
  useEffect(() => {
    const target = hintTextRef.current;
    if (phase !== "cabin" || !target) return;
    if (prefersReducedMotion()) {
      target.textContent = HINT;
      return;
    }
    let frame = 0;
    let interval = 0;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        frame += 1;
        const settled = Math.floor(frame / 2);
        target.textContent = Array.from(HINT, (char, index) => {
          if (index < settled || char === " ") return char;
          if (index > settled + 4) return " ";
          return FLAP_GLYPHS[Math.floor(Math.random() * FLAP_GLYPHS.length)];
        }).join("");
        if (settled >= HINT.length) window.clearInterval(interval);
      }, 28);
    }, HINT_DELAY_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [phase]);


  // Whatever the visitor does next lowers the shade.
  useEffect(() => {
    if (phase !== "cabin") return;
    hintRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (!IGNORED_KEYS.has(event.key)) lowerShade();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", lowerShade, { passive: true });
    window.addEventListener("touchmove", lowerShade, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", lowerShade);
      window.removeEventListener("touchmove", lowerShade);
    };
  }, [phase, lowerShade]);

  const onPointerMove = (event: React.PointerEvent) => {
    const root = rootRef.current;
    if (!root || event.pointerType === "touch") return;
    root.dataset.tracking = "";
    root.style.setProperty("--px", ((event.clientX / window.innerWidth) * 2 - 1).toFixed(3));
  };

  if (!mounted) return null;

  return (
    <div
      ref={rootRef}
      className={styles.intro}
      data-phase={phase}
      data-cabin-intro
      onPointerDown={lowerShade}
      onPointerMove={onPointerMove}
    >
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.hole}>
          <div className={styles.clouds}><span /><span /><span /><span /></div>
          <div className={styles.plane}>
            <span className={styles.jet}>
              <span className={styles.trail} />
              <svg viewBox="0 0 120 40" focusable="false">
                <path d="M9 19 3 3h9l17 15z" fill="#ED1C24" />
                <path d="M7 22 1 27h9l9-5z" fill="#d5dde6" />
                <path d="M6 21c0-2 3-3 8-3l80-2c12 0 20 3 23 6-3 3-11 5-22 5H15c-6 0-9-3-9-6z" fill="#fff" />
                <path d="M8 23c2 3 4 4 8 4h80c10 0 17-2 21-5-6 2-13 3-22 3H16c-4 0-6-1-8-2z" fill="#c9d3de" />
                <path d="M104 18.5c3 .4 6 1.200 8 2.300l-9 .2z" fill="#22344a" />
                <path d="M52 23 37 37h9l26-14z" fill="#e3e9f0" />
                <rect x="50" y="27" width="13" height="5.500" rx="2.700" fill="#b9c4d0" />
              </svg>
            </span>
          </div>
          <div className={styles.shade} />
        </div>
        <div className={`${styles.plate} ${styles.plateDark}`} />
        <div className={`${styles.plate} ${styles.plateLit}`} />
      </div>

      <div className={styles.topbar}>
        <div className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-white.png" alt="AlumniKonneQt" />
          <span className={styles.tagline} aria-hidden="true">Alumni mentorship network</span>
        </div>
        <NairobiClock className={styles.clock} />
        <p className={styles.sections} aria-hidden="true">
          <span>How it works</span>
          <span>Community</span>
          <span>FAQs</span>
        </p>
      </div>
      <button ref={hintRef} type="button" className={styles.hint} aria-label={HINT} onClick={lowerShade}>
        <span ref={hintTextRef} aria-hidden="true">{" ".repeat(HINT.length)}</span>
      </button>

      <div className={styles.black} aria-hidden="true" />
      <div className={styles.preload} aria-hidden="true">
        <div className={styles.logo}>
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={styles.band} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
      </div>
    </div>
  );
}
