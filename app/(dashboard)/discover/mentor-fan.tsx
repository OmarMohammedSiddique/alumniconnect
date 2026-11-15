"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import type { Mentor } from "./mentor-card";
import { sharedSkillLabels } from "@/lib/mentor-explanation";
import styles from "./mentor-fan.module.css";

type RequestStatus = "pending" | "connected" | null;

// Geometry of the fan, in card widths, pixels and degrees. Presentation only:
// the order of the passes is always the order of the mentors that were given.
const FIRST_STEP = 1.0;
const NEXT_STEP = 0.5;
const FIRST_DEPTH = 300;
const NEXT_DEPTH = 60;
const TILT = 46;
const VISIBLE_REACH = 5;
const DRAG_THRESHOLD = 6;

function passTransform(offset: number): CSSProperties {
  const distance = Math.abs(offset);
  const side = Math.sign(offset);
  const near = Math.min(distance, 1);
  const far = Math.max(distance - 1, 0);
  const shift = side * (near * FIRST_STEP + far * NEXT_STEP);
  const depth = -(near * FIRST_DEPTH + far * NEXT_DEPTH);
  const fade = distance <= VISIBLE_REACH - 1 ? 1 : Math.max(0, VISIBLE_REACH - distance);
  return {
    transform: `translate3d(calc(var(--pass-width) * ${shift.toFixed(4)}), 0, ${depth.toFixed(1)}px) rotateY(${(-side * near * TILT).toFixed(2)}deg)`,
    zIndex: 100 - Math.round(distance * 10),
    opacity: fade,
    visibility: fade === 0 ? "hidden" : "visible",
    ["--shade" as string]: Math.min(distance * 0.12, 0.45).toFixed(3),
    ["--stagger" as string]: `${Math.round(Math.min(distance, VISIBLE_REACH) * 45)}ms`,
  };
}

// Decorative stripes derived from the profile id, so each pass looks distinct
// without displaying an identifier or implying a scannable code.
function stripeWidths(seed: string): number[] {
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
  return Array.from({ length: 34 }, () => {
    state = Math.imul(state ^ (state >>> 13), 1274126177);
    return 1 + ((state >>> 8) & 3);
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function statusText(mentor: Mentor, status: RequestStatus): string {
  if (status === "connected") return "Connected";
  if (status === "pending") return "Pending request";
  return mentor.accepting_requests === false ? "Not accepting requests" : "Accepting requests";
}

export function MentorFan({
  mentors,
  label,
  positionLabel = "Result",
  getStatus,
  getDetail,
  renderActive,
}: {
  mentors: Mentor[];
  label: string;
  positionLabel?: string;
  getStatus: (mentorId: string) => RequestStatus;
  getDetail?: (mentor: Mentor) => string | null;
  renderActive: (mentor: Mentor, position: number) => ReactNode;
}) {
  const hintId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; moved: boolean; pointerId: number } | null>(null);
  const suppressClick = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(mentors[0]?.id ?? null);
  const [dragOffset, setDragOffset] = useState(0);
  // Passes start stacked, fan out once with a stagger, then follow selection directly.
  const [phase, setPhase] = useState<"stacked" | "opening" | "ready">("stacked");

  // Follow the selected mentor through filtering; fall back to the first pass.
  const found = mentors.findIndex((mentor) => mentor.id === activeId);
  const active = found === -1 ? 0 : found;
  const last = mentors.length - 1;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPhase((value) => (value === "stacked" ? "opening" : value)));
    const timer = setTimeout(() => setPhase("ready"), 1000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, []);

  const stripes = useMemo(
    () => Object.fromEntries(mentors.map((mentor) => [mentor.id, stripeWidths(mentor.id)])),
    [mentors],
  );

  function goTo(index: number) {
    const next = Math.max(0, Math.min(last, index));
    setActiveId(mentors[next]?.id ?? null);
  }

  function stepWidth(): number {
    const pass = stageRef.current?.querySelector<HTMLElement>("[data-pass]");
    return (pass?.offsetWidth ?? 300) * FIRST_STEP;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { startX: event.clientX, moved: false, pointerId: event.pointerId };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const delta = event.clientX - current.startX;
    if (!current.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD) return;
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const raw = -delta / stepWidth();
    // Resist dragging past either end of the fan.
    const target = active + raw;
    const overshoot = target < 0 ? target : target > last ? target - last : 0;
    setDragOffset(raw - overshoot * 0.7);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!current.moved) return;
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 0);
    goTo(Math.round(active + dragOffset));
    setDragOffset(0);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const moves: Record<string, number> = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: last };
    if (!(event.key in moves)) return;
    event.preventDefault();
    goTo(moves[event.key]);
  }

  if (mentors.length === 0) return null;
  const current = mentors[active];
  const dragging = dragOffset !== 0;

  return (
    <div className={styles.fan}>
      <div
        ref={stageRef}
        className={styles.stage}
        data-dragging={dragging || undefined}
        data-phase={phase}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        aria-describedby={hintId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <p id={hintId} className="sr-only">
          Use the previous and next buttons, or the left and right arrow keys, to move between Mentors. Details and actions for the selected Mentor follow this carousel.
        </p>
        <ul className={styles.track}>
          {mentors.map((mentor, index) => {
            const isActive = index === active;
            const status = getStatus(mentor.id);
            const shared = sharedSkillLabels(mentor.shared_skills);
            const detail = getDetail?.(mentor) ?? null;
            const offset = phase === "stacked" ? 0 : index - active - dragOffset;
            return (
              <li
                key={mentor.id}
                className={styles.slot}
                style={passTransform(offset)}
                aria-current={isActive ? "true" : undefined}
              >
                <div className={styles.tag} aria-hidden={!isActive}>
                  <span>{positionLabel} {String(index + 1).padStart(2, "0")}{detail ? ` · ${detail}` : ""}</span>
                  <strong data-status={status ?? (mentor.accepting_requests === false ? "closed" : "open")}>{statusText(mentor, status)}</strong>
                </div>
                <div className={styles.pass} data-pass aria-hidden={!isActive}>
                  <div className={styles.passHeader}>
                    <span className={styles.mark}><Send size={15} aria-hidden="true" />Mentor pass</span>
                    <span className={styles.wordmark}>AlumniKonneQt</span>
                  </div>
                  <div className={styles.row}>
                    <span className={styles.caption}>Mentor</span>
                    <p className={styles.name}>{mentor.full_name}</p>
                  </div>
                  <div className={`${styles.row} ${styles.split}`}>
                    <div>
                      <span className={styles.caption}>Field</span>
                      <p className={styles.field}>{mentor.industry || "Not stated"}</p>
                    </div>
                    {mentor.graduation_year && (
                      <div className={styles.year}>
                        <span className={styles.caption}>Class of</span>
                        <p className={styles.field}>{mentor.graduation_year}</p>
                      </div>
                    )}
                  </div>
                  <div className={styles.row}>
                    <span className={styles.caption}>Headline</span>
                    <p className={styles.headline}>{mentor.headline || "No headline yet"}</p>
                  </div>
                  <div className={styles.stub}>
                    <span className={styles.monogram} aria-hidden="true">{initials(mentor.full_name)}</span>
                    <div className={styles.stubBody}>
                      <span className={styles.caption}>{shared.length ? "Shared skills" : "Skills"}</span>
                      <p className={styles.skills}>
                        {(shared.length ? shared : mentor.skills).slice(0, 3).join(", ") || "None listed"}
                      </p>
                      <span className={styles.stripes} aria-hidden="true">
                        {stripes[mentor.id].map((width, stripe) => <i key={stripe} style={{ width }} />)}
                      </span>
                    </div>
                  </div>
                </div>
                {!isActive && (
                  <button
                    type="button"
                    tabIndex={-1}
                    className={styles.cover}
                    aria-label={`Show ${mentor.full_name}, ${positionLabel.toLowerCase()} ${index + 1} of ${mentors.length}`}
                    onClick={() => { if (!suppressClick.current) goTo(index); }}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <div className={styles.controls}>
          <button type="button" className={styles.arrow} onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous Mentor">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <p className={styles.counter} aria-live="polite">
            <span className="sr-only">{current.full_name}, </span>
            {String(active + 1).padStart(2, "0")} <span aria-hidden="true">/</span><span className="sr-only">of</span> {String(mentors.length).padStart(2, "0")}
          </p>
          <button type="button" className={styles.arrow} onClick={() => goTo(active + 1)} disabled={active === last} aria-label="Next Mentor">
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.detail} key={current.id}>
        {renderActive(current, active)}
      </div>
    </div>
  );
}
