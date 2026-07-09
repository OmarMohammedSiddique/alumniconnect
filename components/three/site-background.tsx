"use client";

import { useEffect, useState } from "react";
import DotGrid from "./dot-grid";

// One fixed, full-viewport background for the whole marketing page. Because it
// is fixed, it never scrolls out from under the content — the dot field is
// continuous from the hero through the footer (no seam between sections).
//
// pointer-events are disabled on the whole layer so content stays clickable;
// DotGrid listens on `window`, so it still reacts to the cursor. Under
// prefers-reduced-motion the grid renders completely static.
export function SiteBackground() {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 bg-neutral-950">
      {mounted && (
        <DotGrid
          dotSize={4}
          gap={26}
          baseColor="#2b2550"
          activeColor="#8b7cff"
          proximity={130}
          shockRadius={220}
          shockStrength={4}
          resistance={750}
          returnDuration={1.4}
          interactive={!reducedMotion}
        />
      )}
      {/* Vignette: subtle depth + keeps text readable over the dot field. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(9,9,14,0.6)_100%)]" />
    </div>
  );
}
