"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

// Match-result reveal: brief staggered fade-in of ranked mentor cards
// (one of the micro-interactions the build instructions assign to GSAP).
// Animation is decoration only - content is visible immediately without it.
export function StaggerReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.children.length === 0) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const duration = parseFloat(getComputedStyle(el).getPropertyValue("--motion-standard")) / 1000;
      gsap.from(el.children, {
        y: 8,
        duration: Number.isFinite(duration) ? duration : 0.22,
        ease: "power1.out",
        stagger: 0.03,
        clearProps: "all",
      });
    }, el);
    return () => media.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
