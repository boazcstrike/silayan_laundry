"use client";

/**
 * Draft 5 — "Silayan Signature Pro".
 *
 * Evolution of the Signature Teal machine: matte powder-coated teal enamel
 * body (every surface derived from `var(--chart-2)` via color-mix so the
 * 13-theme palette picker keeps working), teal-enamel door bezel with a single
 * satin-chrome trim ring (chrome stays trim-only on this draft), molded rubber
 * gasket, concave glass overlay, detergent drawer with a 3-compartment peek,
 * program-label ring around a knurled knob, FILL/RINSE/SPIN/DONE status LEDs,
 * embossed brand plate, side vents, kick plate with drain-filter hatch and
 * threaded leveling feet.
 *
 * The production {@link Drum} renders unchanged inside the porthole; all
 * chrome overlays are pointer-events-none siblings rendered after it.
 */

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Drum } from "@/components/designs/tumble-full/Drum";
import { LoadBurst } from "@/components/designs/tumble-full/LoadBurst";
import { useLoadBurst } from "@/components/designs/tumble-full/useLoadBurst";
import { WASH_MS } from "@/components/designs/tumble-full/washTiming";
import type { WasherDraftProps } from "./DraftProps";

const TEAL = "var(--chart-2)";

/* Matte painted-steel body — satin enamel, deliberately not metallic. */
const BODY_GRAD = `linear-gradient(178deg, color-mix(in oklch, ${TEAL} 8%, var(--sp-hi)) 0%, color-mix(in oklch, ${TEAL} 14%, var(--sp-mid)) 55%, color-mix(in oklch, ${TEAL} 20%, var(--sp-lo)) 100%)`;

/* Teal-enamel door bezel — the painted Signature door ring (deliberately NOT
 * the conic chrome recipe other drafts use). */
const BEZEL_ENAMEL = `linear-gradient(180deg, color-mix(in oklch, ${TEAL} 30%, var(--sp-hi)), color-mix(in oklch, ${TEAL} 42%, var(--sp-lo)))`;
/* Satin chrome, trim-only on this draft: door trim ring, drawer lip, pull. */
const CHROME_LIP = "linear-gradient(90deg, #c9d4d0, #eef3f1 30%, #aab6b1 70%, #d6dedb)";
const CHROME_PULL = "linear-gradient(180deg, #e8eeec, #aab6b1 55%, #d6dedb)";
const SCREWHEAD =
  "linear-gradient(45deg, transparent 46%, #5b6a66 46%, #5b6a66 54%, transparent 54%), radial-gradient(circle at 35% 30%, #eef2f1, #96a49f)";

/* Rubber door boot: concentric molded ridges. */
const GASKET =
  "repeating-radial-gradient(circle, #101b18 0px, #101b18 2px, #1b2825 2px, #1b2825 4px)";

const KNURL = `repeating-conic-gradient(from 0deg, color-mix(in oklch, ${TEAL} 30%, #24312e) 0deg 3deg, color-mix(in oklch, ${TEAL} 18%, #8fa39d) 3deg 6deg)`;
const KNOB_DOME = `radial-gradient(circle at 38% 32%, color-mix(in oklch, ${TEAL} 8%, var(--sp-hi)), color-mix(in oklch, ${TEAL} 22%, var(--sp-lo)))`;

const LED_INK = `color-mix(in oklch, ${TEAL} 55%, #a5f3e8)`;
const LED_GLOW = `0 0 6px 2px color-mix(in oklch, ${TEAL} 70%, transparent)`;

/* Program ring: offset = % clockwise around the dial from 12 o'clock (tick
 * angle = off * 3.6deg). Eight detent ticks sit 12% apart except one 16% gap
 * that skips the bottom of the circle (6 o'clock), like a real dial. Only six
 * stops carry a printed name (`label`) — two are tick-only so the labels get
 * breathing room and stay legible at the rendered dial size; the ticks carry
 * the detent story. Labels whose stop lands on the lower half (`flip`) ride a
 * reversed, slightly larger circle path so their glyphs stay upright instead
 * of rendering upside-down; on the reversed path the same spot lives at
 * offset `100 - off`. */
const PROGRAM_STOPS: ReadonlyArray<{
  name: string;
  off: number;
  flip: boolean;
  label: boolean;
}> = [
  { name: "COTTON", off: 58, flip: true, label: true },
  { name: "ECO 40", off: 70, flip: true, label: true },
  { name: "QUICK", off: 82, flip: false, label: true },
  { name: "DELICATE", off: 94, flip: false, label: false },
  { name: "WOOL", off: 6, flip: false, label: true },
  { name: "RINSE", off: 18, flip: false, label: false },
  { name: "SPIN", off: 30, flip: true, label: true },
  { name: "DRAIN", off: 42, flip: true, label: true },
];

/* Wash-phase timeline: FILL → RINSE → SPIN advance one at a time (mutually
 * exclusive) across the ceremony. Derived from the shared WASH_MS single
 * source of truth so the LEDs can never desync from the real ceremony. */
const WASH_PHASES = ["FILL", "RINSE", "SPIN"] as const;
const PHASE_MS = WASH_MS / WASH_PHASES.length;

/* Idle-reachable loops (glass sheen drift, DONE LED breathe) run as CSS
 * keyframe animations on plain spans: transform/opacity animate on the
 * compositor thread and let motion's rAF driver sleep on an idle machine.
 * Sheen: 2.6s active inside a 9.1s cycle (28.57%), matching the previous
 * motion tween (duration 2.6, repeatDelay 6.5). */
const IDLE_KEYFRAMES = `
@keyframes d5-sheen{0%{transform:translateX(-8%);opacity:0}14.28%{opacity:.35}28.57%{transform:translateX(8%);opacity:0}100%{transform:translateX(8%);opacity:0}}
@keyframes d5-led-breathe{0%,100%{opacity:.4}50%{opacity:1}}`;

/** One status LED + its 5px silk-screen caption. */
function PhaseLed({
  label,
  lit,
  breathe,
  reduce,
  degraded,
}: {
  label: string;
  lit: boolean;
  breathe: boolean;
  reduce: boolean;
  degraded: boolean;
}) {
  const caption = (
    <span
      className="text-[6px] font-semibold tracking-[0.12em] uppercase"
      style={{ color: "color-mix(in oklch, var(--sp-ink) 70%, transparent)" }}
    >
      {label}
    </span>
  );

  /* DONE LED breathe: CSS opacity pulse on a plain span — no idle JS loop.
   * Reduced motion / degraded compare grid hold a steady 0.8. */
  if (lit && breathe) {
    return (
      <span className="flex flex-col items-center gap-[3px]">
        <span
          className="block size-1.5 rounded-full"
          style={{
            background: TEAL,
            boxShadow: LED_GLOW,
            ...(reduce || degraded
              ? { opacity: 0.8 }
              : { animation: "d5-led-breathe 2.8s ease-in-out infinite" }),
          }}
        />
        {caption}
      </span>
    );
  }

  return (
    <span className="flex flex-col items-center gap-[3px]">
      <motion.span
        className="block size-1.5 rounded-full"
        style={
          lit
            ? { background: TEAL, boxShadow: LED_GLOW }
            : {
                background: "transparent",
                border: `1px solid color-mix(in oklch, ${TEAL} 45%, var(--sp-ink))`,
              }
        }
        initial={false}
        animate={
          lit
            ? reduce
              ? { opacity: 1, scale: 1 }
              : { opacity: [0, 1], scale: [1, 1.4, 1] }
            : { opacity: 0.25, scale: 1 }
        }
        transition={
          lit ? (reduce ? { duration: 0 } : { duration: 0.35 }) : { duration: 0.3 }
        }
      />
      {caption}
    </span>
  );
}

/** Program-label ring, tick marks and knurled knob with settle animation. */
function ProgramKnob({ settleKey, reduce }: { settleKey: number; reduce: boolean }) {
  /* Unique per instance so light/dark gallery pairs never share DOM ids. */
  const ringId = useId();
  const cwPathId = `${ringId}-cw`;
  const ccwPathId = `${ringId}-ccw`;
  return (
    <div
      className="relative size-[4.5rem] rounded-full"
      style={{
        background: `color-mix(in oklch, ${TEAL} 6%, var(--sp-well))`,
        boxShadow: "inset 0 1px 3px rgba(0,0,0,.18)",
        color: "var(--sp-ink)",
      }}
      aria-hidden="true"
    >
      {/* 72px container over a 64-unit viewBox: labels render ~12% larger
          than their SVG font size, keeping them legible at DPR 1. */}
      <svg viewBox="0 0 64 64" className="absolute inset-0 size-full">
        <defs>
          {/* Clockwise ring for upper-half labels (glyphs extend outward). */}
          <path id={cwPathId} d="M32,5.5 a26.5,26.5 0 1,1 -0.01,0" fill="none" />
          {/* Counterclockwise ring, radius bumped so the inward-extending
              glyphs of flipped lower-half labels share the same band. */}
          <path id={ccwPathId} d="M32,1.5 a30.5,30.5 0 1,0 0.01,0" fill="none" />
        </defs>
        {/* All eight detent ticks — chunky enough to carry the dial story. */}
        {PROGRAM_STOPS.map((s) => (
          <line
            key={`tick-${s.name}`}
            x1="32"
            y1="7.5"
            x2="32"
            y2="11.5"
            stroke="currentColor"
            strokeWidth="1.1"
            opacity="0.6"
            transform={`rotate(${s.off * 3.6} 32 32)`}
          />
        ))}
        {PROGRAM_STOPS.filter((s) => s.label).map((s) => (
          <text
            key={`label-${s.name}`}
            fontSize="5.4"
            fontWeight="600"
            fill="currentColor"
            opacity="0.75"
            textAnchor="middle"
          >
            <textPath
              href={s.flip ? `#${ccwPathId}` : `#${cwPathId}`}
              startOffset={`${s.flip ? 100 - s.off : s.off}%`}
            >
              {s.name}
            </textPath>
          </text>
        ))}
      </svg>
      {/* Knob: knurled machined edge + satin dome + teal detent notch. */}
      <motion.div
        key={settleKey}
        className="absolute inset-0 m-auto size-10 rounded-full"
        style={{ background: KNURL, boxShadow: "0 2px 4px rgba(0,0,0,.3)" }}
        initial={false}
        animate={reduce ? { rotate: 0 } : { rotate: [0, -6, 0] }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <span
          className="absolute inset-[3px] rounded-full"
          style={{ background: KNOB_DOME, boxShadow: "inset 0 1px 0 rgba(255,255,255,.35)" }}
        />
        <span
          className="absolute top-[4px] left-1/2 h-[7px] w-[2px] -translate-x-1/2 rounded-full"
          style={{ background: TEAL }}
        />
      </motion.div>
    </div>
  );
}

/** Detergent drawer: chrome-lipped face over a 3-compartment peek. */
function DetergentDrawer({ isWashing, reduce }: { isWashing: boolean; reduce: boolean }) {
  return (
    <div
      className="relative h-9 overflow-hidden rounded-lg"
      style={{
        background: "var(--sp-well)",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,.28), inset 0 0 0 1px var(--sp-seam)",
      }}
      aria-hidden="true"
    >
      {/* Compartment tops — visible through the permanent peek gap. */}
      <div className="absolute inset-x-1 top-[3px] grid h-[18px] grid-cols-[1.2fr_1fr_1fr] gap-0.5">
        {(["I", "II", "flower"] as const).map((glyph) => (
          <span
            key={glyph}
            className="relative flex items-start justify-center rounded-[3px] pt-[5px]"
            style={{
              background: `color-mix(in oklch, ${TEAL} 5%, var(--sp-lo))`,
              boxShadow: "inset 0 1px 2px rgba(0,0,0,.35)",
              color: "var(--sp-ink)",
            }}
          >
            {/* Liquid surface line; main-wash (II) draws down during the wash. */}
            {glyph === "II" ? (
              <motion.span
                className="absolute inset-x-[3px] top-[2px] h-[2px] rounded-sm"
                style={{ background: `color-mix(in oklch, ${TEAL} 75%, transparent)` }}
                initial={false}
                animate={isWashing ? { y: 3, opacity: 0.35 } : { y: 0, opacity: 0.9 }}
                transition={reduce ? { duration: 0 } : { duration: isWashing ? 2.4 : 0.25, ease: "easeOut" }}
              />
            ) : (
              <span
                className="absolute inset-x-[3px] top-[2px] h-[2px] rounded-sm"
                style={{
                  background: `color-mix(in oklch, ${TEAL} ${glyph === "I" ? 55 : 40}%, transparent)`,
                }}
              />
            )}
            {glyph === "flower" ? (
              <svg viewBox="0 0 8 8" className="mt-[3px] size-1.5 opacity-70" fill="currentColor">
                <circle cx="4" cy="2.4" r="1.1" />
                <circle cx="4" cy="5.6" r="1.1" />
                <circle cx="2.4" cy="4" r="1.1" />
                <circle cx="5.6" cy="4" r="1.1" />
              </svg>
            ) : (
              <span className="mt-[2px] text-[5px] leading-none font-bold opacity-70">{glyph}</span>
            )}
          </span>
        ))}
      </div>
      {/* Drawer face: recessed pull pocket + chrome lip; nudges open on hover. */}
      <motion.div
        className="absolute inset-x-0 top-[13px] bottom-0 rounded-b-lg"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklch, ${TEAL} 12%, var(--sp-mid)), color-mix(in oklch, ${TEAL} 18%, var(--sp-lo)))`,
          boxShadow: "0 -1px 2px rgba(0,0,0,.3)",
        }}
        whileHover={reduce ? undefined : { x: 5 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <span
          className="absolute top-[4px] left-1/2 h-[6px] w-9 -translate-x-1/2 rounded-[3px]"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,.38), rgba(0,0,0,.1))",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,.35)",
          }}
        />
        <span
          className="absolute inset-x-1 bottom-[2px] h-[3px] rounded-full"
          style={{ background: CHROME_LIP }}
        />
      </motion.div>
    </div>
  );
}

export function Draft5({
  units,
  fill,
  spinCount,
  total,
  loadsDone,
  pileStyle,
  isWashing,
  degraded = false,
}: WasherDraftProps) {
  const reduce = useReducedMotion() ?? false;
  const shake = isWashing && !reduce;

  /* Knob "snap to detent" settle on mount and each wash end, plus wash-phase
   * reset — state adjusted during render (React's recommended pattern). */
  const [prevWashing, setPrevWashing] = useState(isWashing);
  const [settleKey, setSettleKey] = useState(0);
  const [phase, setPhase] = useState(0);
  if (prevWashing !== isWashing) {
    setPrevWashing(isWashing);
    setPhase(0);
    if (!isWashing) setSettleKey((k) => k + 1);
  }

  /* FILL → RINSE → SPIN advance one at a time, holding on SPIN until the
   * ceremony ends. Only one LED is ever lit (reduced motion: all lit steady). */
  useEffect(() => {
    if (!isWashing) return;
    const id = setInterval(
      () => setPhase((p) => Math.min(p + 1, WASH_PHASES.length - 1)),
      PHASE_MS,
    );
    return () => clearInterval(id);
  }, [isWashing]);

  /* "Load banked" burst: fires the instant a wash finishes (isWashing
   * true -> false). Shared handshake with the baseline WashingMachine — see
   * {@link useLoadBurst}. */
  const { machineRef, ledRef, portholeRef, burst, popKey, completeBurst } =
    useLoadBurst(units, isWashing);

  const isDoneLit = !isWashing && loadsDone > 0;

  return (
    <div className="relative mx-auto w-full max-w-[17rem]">
      <style>{IDLE_KEYFRAMES}</style>
      {/* Ground shadow — grounds the machine on the page. */}
      <div
        className="absolute inset-x-6 -bottom-3 h-3 rounded-[100%]"
        style={{ background: "radial-gradient(ellipse at center, rgba(6,20,17,.32), transparent 70%)" }}
        aria-hidden="true"
      />

      <motion.div
        ref={machineRef}
        className="relative rounded-[1.9rem] border-2 p-3 pb-0 [--sp-hi:#f8fbfa] [--sp-mid:#e9efec] [--sp-lo:#ccd7d2] [--sp-well:#dfe7e4] [--sp-ink:#33413d] [--sp-seam:rgba(15,28,26,0.18)] [--sp-tophi:rgba(255,255,255,0.55)] [--sp-emboss:rgba(255,255,255,0.45)] dark:[--sp-hi:#36443f] dark:[--sp-mid:#242e2b] dark:[--sp-lo:#141b19] dark:[--sp-well:#1b2422] dark:[--sp-ink:#aebfba] dark:[--sp-seam:rgba(0,0,0,0.5)] dark:[--sp-tophi:rgba(255,255,255,0.09)] dark:[--sp-emboss:rgba(0,0,0,0.55)]"
        style={{
          background: BODY_GRAD,
          borderColor: `color-mix(in oklch, ${TEAL} 25%, var(--sp-lo))`,
          boxShadow: "inset 0 1px 0 var(--sp-tophi), 0 12px 24px rgba(8,22,19,.28)",
        }}
        animate={shake ? { x: [0, -1, 1, -1, 1, 0] } : { x: 0 }}
        transition={shake ? { duration: 0.35, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      >
        {/* Top deck lip — the top slab overhangs the front panel. */}
        <div
          className="-mx-3 -mt-3 h-3 rounded-t-[1.8rem]"
          style={{
            background: `color-mix(in oklch, ${TEAL} 7%, var(--sp-hi))`,
            boxShadow: "inset 0 1px 0 var(--sp-tophi), inset 0 -1px 0 var(--sp-seam)",
          }}
          aria-hidden="true"
        />
        <div
          className="mb-2 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--sp-seam), transparent)" }}
          aria-hidden="true"
        />

        {/* ----- Control panel: drawer · display · status LEDs · knob ----- */}
        <div
          className="rounded-xl p-2"
          style={{
            background: `color-mix(in oklch, ${TEAL} 10%, var(--sp-well))`,
            boxShadow: "inset 0 0 0 1px var(--sp-seam), inset 0 1px 0 var(--sp-tophi)",
          }}
        >
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <DetergentDrawer isWashing={isWashing} reduce={reduce} />
              <div
                className="-mt-1 text-[6px] font-semibold tracking-[0.18em] uppercase"
                style={{ color: "color-mix(in oklch, var(--sp-ink) 55%, transparent)" }}
                aria-hidden="true"
              >
                Detergent
              </div>

              {/* Power · LED display · Start/Pause */}
              <div className="flex items-center gap-1">
                <span
                  className="grid size-4 shrink-0 place-items-center rounded-full"
                  style={{
                    background: KNOB_DOME,
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,.3), 0 1px 0 var(--sp-tophi)",
                    color: "var(--sp-ink)",
                  }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 10 10" className="size-2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                    <path d="M5 1.5v3" />
                    <path d="M2.8 3a3.1 3.1 0 1 0 4.4 0" />
                  </svg>
                </span>

                <div
                  ref={ledRef}
                  className="relative flex h-8 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-md font-mono leading-none"
                  style={{
                    background: "#0c1412",
                    color: LED_INK,
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.4)",
                  }}
                  aria-label={
                    isWashing
                      ? "Washing full load"
                      : `${loadsDone} wash load${loadsDone === 1 ? "" : "s"} counted so far`
                  }
                >
                  {/* Ghost unlit seven-segment underlay. */}
                  <span
                    className="pointer-events-none absolute text-sm font-bold tabular-nums opacity-[0.08]"
                    aria-hidden="true"
                  >
                    88
                  </span>
                  {isWashing ? (
                    <motion.span
                      className="text-[0.6rem] font-bold tracking-[0.25em]"
                      animate={reduce ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
                      transition={reduce ? { duration: 0 } : { duration: 1.4, repeat: Infinity }}
                    >
                      WASH
                    </motion.span>
                  ) : (
                    <>
                      <span className="flex items-baseline gap-0.5">
                        {/* Pops when the +1 LOAD chip lands (popKey bump). */}
                        <motion.span
                          key={popKey}
                          className="text-sm font-bold tabular-nums"
                          animate={popKey > 0 && !reduce ? { scale: [1, 1.6, 1] } : { scale: 1 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                          {loadsDone}
                        </motion.span>
                        <span className="text-[0.45rem] font-semibold opacity-80">LOADS</span>
                      </span>
                      <span className="mt-0.5 text-[0.35rem] font-semibold tracking-[0.15em] opacity-60">
                        SIGNATURE PRO
                      </span>
                    </>
                  )}
                </div>

                <span
                  className="grid h-4 w-5 shrink-0 place-items-center rounded-full"
                  style={{
                    background: KNOB_DOME,
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,.3), 0 1px 0 var(--sp-tophi)",
                    color: "var(--sp-ink)",
                  }}
                  aria-hidden="true"
                >
                  {isWashing ? (
                    <svg viewBox="0 0 10 10" className="size-2" fill="currentColor">
                      <rect x="2.4" y="2" width="1.8" height="6" rx="0.5" />
                      <rect x="5.8" y="2" width="1.8" height="6" rx="0.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 10 10" className="size-2" fill="currentColor">
                      <path d="M3 1.8v6.4L8.2 5z" />
                    </svg>
                  )}
                </span>
              </div>

              {/* Wash-phase LED row — one phase lit at a time (all lit steady
                  under reduced motion). Decorative: the LED display's
                  aria-label already conveys the machine state. */}
              <div className="flex items-start justify-between px-1" aria-hidden="true">
                {WASH_PHASES.map((label, i) => (
                  <PhaseLed
                    key={label}
                    label={label}
                    lit={isWashing && (reduce || phase === i)}
                    breathe={false}
                    reduce={reduce}
                    degraded={degraded}
                  />
                ))}
                <PhaseLed
                  label="DONE"
                  lit={isDoneLit}
                  breathe
                  reduce={reduce}
                  degraded={degraded}
                />
              </div>
            </div>

            <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-0.5">
              <ProgramKnob settleKey={settleKey} reduce={reduce} />
              <div
                className="text-[6px] font-semibold tracking-[0.18em] uppercase"
                style={{ color: "color-mix(in oklch, var(--sp-ink) 55%, transparent)" }}
                aria-hidden="true"
              >
                Program
              </div>
            </div>
          </div>
        </div>

        <div
          className="my-2 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--sp-seam), transparent)" }}
          aria-hidden="true"
        />

        {/* ----- Door: hinge · painted ring · chrome bezel · gasket · drum ----- */}
        <div ref={portholeRef} className="relative">
          {/* Two-piece hinge: plate, screwheads and pivot barrel. */}
          <div
            className="absolute top-1/2 left-[-5px] z-10 flex h-20 w-[9px] -translate-y-1/2 flex-col items-center justify-between rounded-[3px] py-1"
            style={{
              background: "linear-gradient(90deg, #b9c4c0, #98a6a1 60%, #7f8d89)",
              boxShadow: "0 1px 2px rgba(0,0,0,.3)",
            }}
            aria-hidden="true"
          >
            <span className="size-[5px] rounded-full" style={{ background: SCREWHEAD }} />
            <span
              className="h-7 w-[5px] rounded-full"
              style={{ background: "linear-gradient(90deg, #6d7c77, #9aa8a3, #5b6a66)" }}
            />
            <span className="size-[5px] rounded-full" style={{ background: SCREWHEAD }} />
          </div>

          {/* Door-lock: padlock + micro-LED, lit steady while washing. */}
          <div
            className="absolute top-[13%] right-0 z-10 flex flex-col items-center gap-[3px]"
            style={{ color: "var(--sp-ink)" }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 10 10" className="size-2 opacity-70" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" />
              <rect x="2.2" y="4.5" width="5.6" height="4" rx="0.8" fill="currentColor" stroke="none" opacity="0.8" />
            </svg>
            <motion.span
              key={isWashing ? "lock-on" : "lock-off"}
              className="size-1 rounded-full"
              style={
                isWashing
                  ? { background: TEAL, boxShadow: LED_GLOW }
                  : { border: `1px solid color-mix(in oklch, ${TEAL} 40%, var(--sp-ink))` }
              }
              initial={false}
              animate={
                isWashing
                  ? reduce
                    ? { opacity: 1 }
                    : { opacity: [0, 1, 0.6, 1] }
                  : { opacity: 0.3 }
              }
              transition={reduce ? { duration: 0 } : { duration: 0.5 }}
            />
          </div>

          {/* Outer painted ring, flush with the body (seam hairline). */}
          <div
            className="rounded-full p-[5px]"
            style={{
              background: `color-mix(in oklch, ${TEAL} 12%, var(--sp-mid))`,
              boxShadow: "inset 0 0 0 1px var(--sp-seam), 0 1px 0 var(--sp-tophi)",
            }}
          >
            {/* Teal-enamel bezel — painted Signature door ring — carrying a
                single satin-chrome trim ring (no conic chrome, no diagonal
                screwheads, no perf hint: those belong to other drafts). */}
            <div
              className="relative rounded-full p-[5px]"
              style={{
                background: BEZEL_ENAMEL,
                boxShadow:
                  "inset 0 1px 1px rgba(255,255,255,.4), inset 0 -1px 1px rgba(0,0,0,.28), 0 1px 2px rgba(8,22,19,.2)",
              }}
            >
              {/* The one chrome accent on the door: a thin trim ring. */}
              <div
                className="rounded-full p-[2px]"
                style={{
                  background: CHROME_LIP,
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,.5), inset 0 -1px 1px rgba(0,0,0,.2)",
                }}
              >
              {/* Rubber boot gasket with concentric molded ridges. */}
              <div className="relative rounded-full p-[7px]" style={{ background: GASKET }}>
                <Drum
                  units={units}
                  fill={fill}
                  spinCount={spinCount}
                  total={total}
                  loadsDone={loadsDone}
                  pileStyle={pileStyle}
                  isWashing={isWashing}
                />

                {/* Concave glass: hotspot upper-left + curved bowl shading.
                    Top inset kept faint so the Drum's readout chip (pinned at
                    top 14%) stays fully legible in both themes. */}
                <div
                  className="pointer-events-none absolute inset-[7px] rounded-full"
                  style={{
                    background:
                      "radial-gradient(ellipse at 28% 32%, rgba(255,255,255,.28), transparent 38%)",
                    boxShadow:
                      "inset 0 5px 9px rgba(255,255,255,.10), inset 0 -14px 22px rgba(8,30,27,.26)",
                  }}
                  aria-hidden="true"
                />

                {/* Arc reflection streak with an occasional slow sheen drift.
                    CSS keyframes (compositor thread) — see IDLE_KEYFRAMES; the
                    Tailwind rotate property composes over the keyframed
                    translateX exactly like motion's `x` did. Not mounted at
                    all in the degraded compare grid. */}
                {degraded ? null : (
                  <div
                    className="pointer-events-none absolute inset-[7px] overflow-hidden rounded-full"
                    aria-hidden="true"
                  >
                    <span
                      className="absolute top-[6%] left-[8%] block h-[55%] w-[26%] -rotate-[24deg] rounded-full"
                      style={{
                        background:
                          "linear-gradient(105deg, transparent, rgba(255,255,255,.35), transparent)",
                        ...(reduce
                          ? { opacity: 0.2 }
                          : { animation: "d5-sheen 9.1s ease-in-out infinite" }),
                      }}
                    />
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>

          {/* Recessed grip pocket with chrome pull lip. */}
          <div
            className="absolute top-1/2 right-[-4px] z-10 h-16 w-[11px] -translate-y-1/2 rounded-l-lg rounded-r-md"
            style={{
              background: "linear-gradient(270deg, rgba(0,0,0,.05), rgba(0,0,0,.4))",
              boxShadow: "inset 2px 0 4px rgba(0,0,0,.35)",
            }}
            aria-hidden="true"
          >
            <span
              className="absolute top-1/2 right-[2px] h-11 w-[3px] -translate-y-1/2 rounded-full"
              style={{ background: CHROME_PULL, boxShadow: "0 1px 2px rgba(0,0,0,.35)" }}
            />
          </div>
        </div>

        {/* ----- Brand plate flanked by stamped vent louvers ----- */}
        <div className="relative mt-2">
          {["left-1", "right-1"].map((side) => (
            <span
              key={side}
              className={`absolute top-1/2 ${side === "left-1" ? "left-1" : "right-1"} h-7 w-2 -translate-y-1/2 rounded-[3px]`}
              style={{
                background:
                  "repeating-linear-gradient(180deg, var(--sp-seam) 0px, var(--sp-seam) 2px, transparent 2px, transparent 5px)",
                boxShadow: "inset 0 0 0 1px var(--sp-seam)",
              }}
              aria-hidden="true"
            />
          ))}
          <div
            className="mx-auto w-fit rounded-md px-3 py-1 text-center"
            style={{
              background: `color-mix(in oklch, ${TEAL} 9%, var(--sp-mid))`,
              boxShadow: "inset 0 1px 2px rgba(0,0,0,.25), 0 1px 0 var(--sp-tophi)",
            }}
          >
            <div
              className="text-[0.6rem] font-extrabold tracking-[0.3em]"
              style={{ color: "var(--sp-ink)", textShadow: "0 1px 0 var(--sp-emboss)" }}
            >
              SILAYAN
            </div>
            <div
              className="mt-px text-[5px] font-semibold tracking-[0.24em] opacity-60"
              style={{ color: "var(--sp-ink)" }}
            >
              SIGNATURE PRO SERIES
            </div>
          </div>
        </div>

        {/* ----- Kick plate: seam, drain-filter hatch, base vibration ----- */}
        <motion.div
          className="relative -mx-3 mt-2 h-6 overflow-hidden rounded-b-[1.7rem]"
          style={{
            background: `linear-gradient(180deg, color-mix(in oklch, ${TEAL} 16%, var(--sp-lo)), color-mix(in oklch, ${TEAL} 24%, var(--sp-lo)))`,
            boxShadow: "inset 0 1px 0 var(--sp-seam)",
          }}
          animate={shake ? { y: [0, 0.7, -0.7, 0] } : { y: 0 }}
          transition={shake ? { duration: 0.18, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
          aria-hidden="true"
        >
          <span
            className="absolute top-1/2 right-4 grid size-3.5 -translate-y-1/2 place-items-center rounded-full"
            style={{
              background: "radial-gradient(circle at 35% 30%, #d6dedb, #8f9d98)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,.3), 0 1px 1px rgba(255,255,255,.15)",
            }}
          >
            <span className="h-px w-2 rounded" style={{ background: "rgba(15,26,24,.65)" }} />
          </span>
        </motion.div>

        {/* Threaded leveling feet on rubber pads. */}
        {["left-8", "right-8"].map((side) => (
          <span
            key={side}
            className={`absolute -bottom-2.5 ${side} h-3.5 w-6 overflow-hidden rounded-b-md`}
            style={{
              background: `repeating-linear-gradient(180deg, color-mix(in oklch, ${TEAL} 14%, var(--sp-lo)) 0px, color-mix(in oklch, ${TEAL} 14%, var(--sp-lo)) 2px, color-mix(in oklch, ${TEAL} 28%, #10201c) 2px, color-mix(in oklch, ${TEAL} 28%, #10201c) 3px)`,
            }}
            aria-hidden="true"
          >
            <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-b-md bg-[#141b19] dark:bg-[#0b100f]" />
          </span>
        ))}

        {/* "Load banked" celebration: glyphs erupt from the porthole, a +1 LOAD
            chip flies to the LED counter, then the counter pops. */}
        <AnimatePresence>
          {burst ? (
            <LoadBurst
              key={burst.key}
              origin={burst.origin}
              target={burst.target}
              icons={burst.icons}
              onDone={completeBurst}
            />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
