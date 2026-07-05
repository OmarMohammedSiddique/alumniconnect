"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

// Match-result reveal: brief staggered fade-in of ranked mentor cards
// (one of the micro-interactions the build instructions assign to GSAP).
// Animation is decoration only — content is visible immediately without it.
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(el.children, {
        y: 12,
        opacity: 0,
        duration: 0.25,
        ease: "power1.out",
        stagger: 0.05,
        clearProps: "all",
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
