"use client";

import { useSyncExternalStore } from "react";
import DotGrid from "./dot-grid";

const subscribeToMount = () => () => {};
const getClientMountSnapshot = () => true;
const getServerMountSnapshot = () => false;

function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

const getReducedMotionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getServerReducedMotionSnapshot = () => false;

// One fixed, full-viewport background for the whole marketing page. Because it
// is fixed, it never scrolls out from under the content - the dot field is
// continuous from the hero through the footer (no seam between sections).
//
// pointer-events are disabled on the whole layer so content stays clickable;
// DotGrid listens on `window`, so it still reacts to the cursor. Under
// prefers-reduced-motion the grid renders completely static.
export function SiteBackground() {
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 bg-background">
      {mounted && (
        <DotGrid
          dotSize={4}
          gap={26}
          baseColor="#bcbcd0"
          activeColor="#5227ff"
          proximity={130}
          shockRadius={220}
          shockStrength={4}
          resistance={750}
          returnDuration={1.4}
          interactive={!reducedMotion}
        />
      )}
      {/* Vignette fades the dot field toward the theme background at the
          edges (works in light and dark mode via the CSS variable). */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--background)_100%)]" />
    </div>
  );
}
