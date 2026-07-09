"use client";

import { useEffect, useState } from "react";
import FloatingLines from "./floating-lines";

// Landing-hero background. This is the ONE place 3D belongs (build
// instructions section 2). Non-negotiable #3: it MUST degrade to a plain
// gradient when WebGL is unavailable or prefers-reduced-motion is set.

// Static prop values kept at module scope so their references are stable
// across renders (FloatingLines re-inits its scene when props change).
const LINES_GRADIENT = ["#6366f1", "#818cf8", "#c084fc", "#e879f9"];
const ENABLED_WAVES = ["top", "middle", "bottom"] as const;
const LINE_COUNT = [10, 15, 20];
const LINE_DISTANCE = [8, 6, 4];

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function HeroBackground() {
  // Render the gradient until mounted, then decide: shader or static fallback.
  const [mode, setMode] = useState<"pending" | "shader" | "fallback">(
    "pending",
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setMode(!reducedMotion && supportsWebGL() ? "shader" : "fallback");
  }, []);

  if (mode !== "shader") {
    // Graceful degradation (also the SSR/pending state): a static gradient
    // over the dark hero, no WebGL, no motion.
    return (
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.indigo.500/25),transparent_60%),radial-gradient(ellipse_at_bottom_right,theme(colors.fuchsia.500/20),transparent_55%)]"
      />
    );
  }

  return (
    <div aria-hidden className="absolute inset-0">
      <FloatingLines
        linesGradient={LINES_GRADIENT}
        enabledWaves={[...ENABLED_WAVES]}
        lineCount={LINE_COUNT}
        lineDistance={LINE_DISTANCE}
        bendRadius={5.0}
        bendStrength={-0.5}
        interactive
        parallax
      />
    </div>
  );
}
