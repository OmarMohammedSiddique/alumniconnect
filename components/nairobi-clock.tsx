"use client";

import { useEffect, useRef } from "react";
import styles from "./nairobi-clock.module.css";

const format = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Nairobi",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// Local time at the airline's home base. Shared by the cabin intro and the
// site headers so the same ticking clock carries through from the first frame.
export function NairobiClock({ className = "" }: { className?: string }) {
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const tick = () => {
      if (timeRef.current) timeRef.current.textContent = format.format(new Date());
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <p className={`${styles.clock} ${className}`} aria-hidden="true">
      <span className={styles.place}>Nairobi / Kenya </span>
      <span className={styles.placeShort}>Nairobi </span>
      <span ref={timeRef} className={styles.time} />
      <span className={styles.zone}> · UTC+03</span>
    </p>
  );
}

// A thin full width band carrying the clock, for the top of a page.
export function ClockStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`${styles.strip} ${className}`}>
      <NairobiClock />
    </div>
  );
}
