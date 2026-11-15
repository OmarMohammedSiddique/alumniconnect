"use client";

import { useState } from "react";
import { CabinIntro } from "@/components/cabin-intro/cabin-intro";

// Review helper: plays the intro over the page and offers a replay control.
export function IntroPreview() {
  const [run, setRun] = useState(0);
  const [finished, setFinished] = useState(false);

  return (
    <>
      <CabinIntro key={run} onFinished={() => setFinished(true)} />
      {finished && (
        <button
          type="button"
          onClick={() => {
            setFinished(false);
            setRun(count => count + 1);
          }}
          className="fixed bottom-4 right-4 z-50 rounded-full bg-foreground px-4 py-2 text-xs text-background shadow-md"
        >
          Replay intro
        </button>
      )}
    </>
  );
}
