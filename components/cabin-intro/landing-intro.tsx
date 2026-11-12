"use client";

import { usePathname } from "next/navigation";
import { CabinIntro } from "./cabin-intro";

// Kept in memory only, so nothing is stored on the visitor's device: the intro
// plays on each fresh page load and not again when they navigate back here.
let played = false;
const markPlayed = () => {
  played = true;
};

export function LandingIntro() {
  const pathname = usePathname();
  if (played || pathname !== "/") return null;
  return <CabinIntro onFinished={markPlayed} />;
}
