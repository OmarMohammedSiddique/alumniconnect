"use client";

import { useEffect, useRef } from "react";
import { LoginJourney, WindowMark, type AuthJourneyHandle } from "../login/login-journey";
import styles from "../login/login-sky.module.css";

export function ArrivalScreen({ destination }: { destination: string }) {
  const journey = useRef<AuthJourneyHandle>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { void journey.current?.play({ kind: "signed-in", destination }); });
    return () => cancelAnimationFrame(frame);
  }, [destination]);
  return <LoginJourney ref={journey}>
    <WindowMark />
    <div className={styles.heading}><h1>You’re signed in</h1><p>Preparing your mentorship boarding pass.</p></div>
    <button type="button" data-login-primary className={styles.arrivalButton} onClick={() => { void journey.current?.play({ kind: "signed-in", destination }); }}>Show your boarding pass</button>
  </LoginJourney>;
}
