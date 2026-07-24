"use client";

/**
 * Draft 1 — "Brushed Stainless Pro".
 *
 * Realistic stainless front-loader chrome wrapped around the shared
 * tumble-full {@link Drum}. Identity = fabrication realism: linear brushed
 * grain on the body, spun-metal (engine-turned) door ring, knurled chrome
 * program dial, cool blue segment LCD, rubber gasket torus, screen-fixed
 * glass speculars, vent-slotted kick plate, visible fasteners.
 *
 * Theme-aware via component-scoped --steel-* / --chr-* CSS vars (light +
 * dark: overrides) so the chrome conics darken with the body. The LCD ground
 * AND ink, dial indicator and status LEDs are tinted from the app palette
 * (var(--chart-2)) so the 13-theme color picker reaches the machine without
 * warm inks landing on a fixed cold-blue ground. All brushed-grain pitches
 * are >=2px per band (and >=2.4deg on conics) so Windows fractional-DPI
 * scaling can't moire them flat. Wash end fires a draft-native flourish: a
 * one-shot glint sweep around the spun door ring plus an LCD END strobe.
 * Complex gradient stacks live in inline style objects because they are too
 * long for Tailwind arbitrary classes. Every repeat:Infinity loop is gated
 * behind useReducedMotion.
 *
 * Perf notes: the ticking countdown/RPM state lives in {@link LcdPanel} so the
 * 5x/s interval re-renders ~15 LCD nodes instead of the whole machine; the
 * micro-grain is a baked PNG tile (no per-instance feTurbulence raster); the
 * glass speculars are a SIBLING of the gasket (screen-fixed by design, and the
 * blur filter never sits under an animating ancestor); `degraded` (compare-all
 * grid) stops idle-only loops — the idle frame is identical either way.
 */

import { useEffect, useId, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Drum } from "@/components/designs/tumble-full/Drum";
import { LoadBurst } from "@/components/designs/tumble-full/LoadBurst";
import { useLoadBurst } from "@/components/designs/tumble-full/useLoadBurst";
import { WASH_MS } from "@/components/designs/tumble-full/washTiming";
import type { WasherDraftProps } from "./DraftProps";

/** RPM readout ramps 400 -> 1200 across the (shared-duration) wash. */
const RPM_START = 400;
const RPM_END = 1200;
/** LCD tick interval — smooth RPM ramp; values are aria-hidden content. */
const LCD_TICK_MS = 200;

/**
 * Six programs, one per 60 deg around the dial (index * 60 deg, 0 = top).
 * The knob indicator snaps to a real program angle: idle points at QUICK
 * (-60 deg), a running wash snaps to COTTON (0 deg). Names render in the LCD
 * (legible), not as micro-text around the dial.
 */
const DIAL_PROGRAMS = ["COTTON", "SYNTH", "RINSE", "SPIN", "ECO", "QUICK"] as const;
const DIAL_STEP_DEG = 360 / DIAL_PROGRAMS.length;
const WASH_PROGRAM_INDEX = 0; // COTTON
const IDLE_PROGRAM_INDEX = 5; // QUICK
/** Knob rotation that points the indicator at program `i` (0 deg = top). */
const programAngle = (i: number) => (i === 0 ? 0 : i * DIAL_STEP_DEG - 360);

/* ------------------------------------------------------------------ */
/* Palette-tinted accents (follow the app's 13-theme color picker)     */
/* ------------------------------------------------------------------ */

/** Cool segment-LCD ink, pulled toward the active palette accent. */
const LCD_INK = "color-mix(in oklch, var(--chart-2) 40%, #7fd4ff)";
const LCD_GLOW = "0 0 6px color-mix(in oklch, var(--chart-2) 45%, rgba(90,190,255,0.8))";
/** Door-lock / START LED colors — done-green leans into the palette. */
const LED_AMBER = "#f0a52c";
const LED_DONE = "color-mix(in oklch, var(--chart-2) 60%, #3cc46e)";

/* ------------------------------------------------------------------ */
/* Gradient stacks (too long for Tailwind arbitrary classes)           */
/* ------------------------------------------------------------------ */

/**
 * Horizontal brushing: 2px alternating bands under a broad vertical sheen.
 * Pitch is deliberately coarse (6px period) so Windows fractional-DPI
 * scaling (125/150%) can't moire the grain into flat gray.
 */
const STEEL_BODY: CSSProperties = {
  backgroundImage:
    "linear-gradient(180deg, var(--steel-sheen), rgba(255,255,255,0) 30%, rgba(0,0,0,0.14)), repeating-linear-gradient(90deg, var(--steel-hi) 0px, var(--steel-mid) 2px, var(--steel-hi) 4px, var(--steel-lo) 6px)",
};

/**
 * Micro-grain: a pre-baked 128px grayscale noise tile (quantized fractal
 * noise, generated offline) repeated as a background image. Replaces the old
 * per-instance <feTurbulence> SVG filter — identical static grain at opacity
 * .05, but no filter raster per mounted machine (6 in compare mode) and ~5
 * fewer DOM nodes each.
 */
const NOISE_PNG =
  "data:image/png;base64,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";
const NOISE_TILE: CSSProperties = {
  backgroundImage: `url("${NOISE_PNG}")`,
  backgroundRepeat: "repeat",
};

/**
 * Spun-metal (concentric) brushing for the circular door ring. 2.4deg step =
 * ~1.6px segments on the ~250px ring — safe at 125/150% DPI scaling.
 */
const SPUN_RING: CSSProperties = {
  background:
    "repeating-conic-gradient(var(--steel-hi) 0deg, var(--steel-lo) 2.4deg, var(--steel-hi) 4.8deg)",
  boxShadow: "0 6px 14px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.35)",
};

/** One-shot glint band that sweeps the spun ring when a wash finishes. */
const RING_GLINT: CSSProperties = {
  background:
    "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.85) 14deg, rgba(255,255,255,0.25) 26deg, transparent 46deg)",
  maskImage: "radial-gradient(circle, transparent 60%, #000 64%)",
  WebkitMaskImage: "radial-gradient(circle, transparent 60%, #000 64%)",
  mixBlendMode: "screen",
};

/**
 * Classic multi-stop chrome flash. Stops live in --chr-* vars so the dial
 * bezel and door bezel lip darken with the cabinet in dark mode instead of
 * keeping light-mode chrome.
 */
const CHROME_CONIC: CSSProperties = {
  background:
    "conic-gradient(from 210deg, var(--chr-a), var(--chr-b) 25%, var(--chr-c) 40%, var(--chr-d) 60%, var(--chr-e) 75%, var(--chr-f) 90%, var(--chr-a))",
};

/**
 * Knurled grip on the dial's outer edge — same var-driven dark treatment.
 * 6deg step keeps each knurl tooth >2px on the 44px knob at fractional DPI.
 */
const KNURL_RING: CSSProperties = {
  background:
    "repeating-conic-gradient(var(--knurl-hi) 0deg, var(--knurl-lo) 6deg, var(--knurl-hi) 12deg)",
  boxShadow: "0 3px 6px rgba(0,0,0,0.35)",
};

/** Brushed dome for the dial cap and START puck. */
const STEEL_DOME: CSSProperties = {
  background:
    "radial-gradient(circle at 38% 30%, var(--steel-hi), var(--steel-mid) 70%, var(--steel-lo))",
};

/** Folded-rubber gasket torus cross-section. */
const GASKET: CSSProperties = {
  background: "radial-gradient(circle, #383d40 55%, #24282b 100%)",
  boxShadow:
    "inset 0 1px 1px rgba(255,255,255,0.22), inset 0 -2px 3px rgba(0,0,0,0.55), inset 0 0 8px rgba(0,0,0,0.5)",
};

/**
 * Segment-LCD ground. The navy base is pulled ~20% toward the active palette
 * accent so warm/red themes shift the whole panel with the ink — ink stays a
 * fixed 20-point mix ratio above its own ground, so contrast holds across all
 * 13 themes instead of warm ink landing on a fixed cold-blue ground.
 */
const LCD_BG_TOP = "color-mix(in oklch, var(--chart-2) 20%, #0a2f52)";
const LCD_BG_MID = "color-mix(in oklch, var(--chart-2) 20%, #0b3a66)";
const LCD_BG_BOT = "color-mix(in oklch, var(--chart-2) 20%, #0a2c4c)";
const LCD: CSSProperties = {
  background: `linear-gradient(180deg, ${LCD_BG_TOP}, ${LCD_BG_MID} 55%, ${LCD_BG_BOT})`,
  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.08)",
  color: LCD_INK,
  textShadow: LCD_GLOW,
};

const LCD_SCANLINES: CSSProperties = {
  background: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.15) 2px 3px)",
};

/** Darker brushed strip for the kick plate — same DPI-safe 2px band pitch. */
const KICK_STEEL: CSSProperties = {
  backgroundImage:
    "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.28)), repeating-linear-gradient(90deg, var(--steel-lo) 0px, var(--steel-dk) 2px, var(--steel-lo) 4px)",
};

/** Vertical brushing for the hinge plate — 2px pitch, DPI-safe. */
const HINGE_STEEL: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(0deg, var(--steel-hi) 0px, var(--steel-lo) 2px, var(--steel-hi) 4px)",
  boxShadow: "1px 0 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
};

const SCREW_HEAD: CSSProperties = {
  background:
    "radial-gradient(circle at 35% 30%, var(--steel-hi), var(--steel-mid) 70%, var(--steel-dk))",
  boxShadow: "0 1px 1px rgba(0,0,0,0.4)",
};

/* ------------------------------------------------------------------ */
/* Small decorative parts                                              */
/* ------------------------------------------------------------------ */

/**
 * Slotted screw — each caller passes a different slot angle for realism.
 * Only the SLOT rotates; the head's radial specular stays fixed at upper-left
 * so lighting reads consistent across all fasteners. The outer span takes the
 * caller's placement classes; the inner head is always `relative`, so the
 * absolute slot never depends on caller-provided positioning.
 */
function Screw({ angle, className }: { angle: number; className?: string }) {
  return (
    <span aria-hidden="true" className={className ?? "relative"}>
      <span className="relative block size-2 rounded-full" style={SCREW_HEAD}>
        <span
          className="absolute left-1/2 top-1/2 h-[1.5px] w-[70%] rounded-full bg-[#30363a]/80"
          style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
        />
      </span>
    </span>
  );
}

/**
 * Fine tick ring + 6 major ticks + 6 program-marker dots, one per program at
 * 60 deg — geometry matches the knob's snap angles exactly. Program NAMES are
 * shown in the LCD instead of micro-text here (4px labels were illegible at
 * this column width), so the dial stays purely glyph ticks.
 */
function DialTicks({ activeIndex }: { activeIndex: number }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke="var(--steel-dk)"
        strokeWidth="1.4"
        pathLength={96}
        strokeDasharray="0.45 3.55"
        opacity="0.8"
      />
      {DIAL_PROGRAMS.map((program, i) => (
        <g key={program} transform={`rotate(${i * DIAL_STEP_DEG} 50 50)`}>
          <line x1="50" y1="10" x2="50" y2="16" stroke="var(--steel-dk)" strokeWidth="2" />
          <circle
            cx="50"
            cy="5.5"
            r="2"
            fill={
              i === activeIndex
                ? "color-mix(in oklch, var(--chart-2) 75%, #3fa4ff)"
                : "var(--steel-dk)"
            }
            opacity={i === activeIndex ? 1 : 0.55}
          />
        </g>
      ))}
    </svg>
  );
}

/** Tiny status glyphs for the LCD: door lock, water tap, cold. */
function LcdIcons() {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      <svg viewBox="0 0 10 10" className="size-2">
        <path d="M3.2 4.5V3a1.8 1.8 0 0 1 3.6 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <rect x="2" y="4.5" width="6" height="4.5" rx="1" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 10 10" className="size-2">
        <path d="M5 1C3 3.8 2.2 5.2 2.2 6.6a2.8 2.8 0 0 0 5.6 0C7.8 5.2 7 3.8 5 1Z" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 10 10" className="size-2" stroke="currentColor" strokeWidth="1">
        <line x1="5" y1="1" x2="5" y2="9" />
        <line x1="1.5" y1="3" x2="8.5" y2="7" />
        <line x1="8.5" y1="3" x2="1.5" y2="7" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* LCD panel — owns the ticking countdown/RPM state                    */
/* ------------------------------------------------------------------ */

interface LcdPanelProps {
  isWashing: boolean;
  loadsDone: number;
  total: number;
  /** Bumped by the parent when a wash ends — replays the END strobe. */
  finishKey: number;
  /** Bumped by the shared LoadBurst handshake — pops the loads counter. */
  popKey: number;
  /** LoadBurst target ref (the burst chip flies to this panel). */
  ledRef: RefObject<HTMLDivElement | null>;
}

/**
 * Blue segment LCD. Owns elapsedMs + the 200ms tick interval so the 5x/s
 * re-render during a wash touches only this ~15-node subtree instead of the
 * whole ~200-node machine (Drum is additionally memoized). Announces ONCE per
 * phase (static label while washing); the per-tick countdown/RPM digits are
 * aria-hidden.
 */
function LcdPanel({ isWashing, loadsDone, total, finishKey, popKey, ledRef }: LcdPanelProps) {
  const reduce = useReducedMotion();

  // Countdown + RPM ramp derived from the SAME WASH_MS the TumbleFull
  // container uses for the ceremony timer — the display cannot desync.
  // State-driven content updates: reduced-motion safe by construction.
  const [elapsedMs, setElapsedMs] = useState(0);
  // Reset the clock the moment a wash starts — the sanctioned
  // "adjust state when a prop changes" render pattern (no effect needed).
  const [prevWashing, setPrevWashing] = useState(isWashing);
  if (prevWashing !== isWashing) {
    setPrevWashing(isWashing);
    if (isWashing) setElapsedMs(0);
  }
  useEffect(() => {
    if (!isWashing) return;
    const startedAt = performance.now();
    const id = setInterval(
      () => setElapsedMs(Math.min(WASH_MS, performance.now() - startedAt)),
      LCD_TICK_MS,
    );
    return () => clearInterval(id);
  }, [isWashing]);

  const progress = Math.min(1, elapsedMs / WASH_MS);
  const secondsLeft = Math.max(0, Math.ceil((WASH_MS - elapsedMs) / 1000));
  const rpm = Math.round(RPM_START + progress * (RPM_END - RPM_START));
  const clockSeconds = String(secondsLeft % 60).padStart(2, "0");
  const clockMinutes = Math.floor(secondsLeft / 60);
  const programName = DIAL_PROGRAMS[isWashing ? WASH_PROGRAM_INDEX : IDLE_PROGRAM_INDEX];

  return (
    <div
      ref={ledRef}
      role="status"
      aria-label={
        isWashing
          ? "Washing full load"
          : `${loadsDone} wash load${loadsDone === 1 ? "" : "s"} done, ${total} items total`
      }
      className="relative h-14 min-w-0 flex-1 overflow-hidden rounded-md border border-black/40 px-2 py-1 font-mono"
      style={LCD}
    >
      {isWashing ? (
        <div className="flex h-full flex-col justify-between" aria-hidden="true">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold leading-none tabular-nums">
              {clockMinutes}
              <motion.span
                animate={reduce ? { opacity: 1 } : { opacity: [1, 0.2, 1] }}
                transition={reduce ? { duration: 0 } : { duration: 1, repeat: Infinity, times: [0, 0.5, 1] }}
              >
                :
              </motion.span>
              {clockSeconds}
            </span>
            <span className="text-[0.5rem] font-bold tabular-nums">{rpm} RPM</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[0.5rem] font-bold tracking-[0.25em]">
              {programName} · WASH
            </span>
            <LcdIcons />
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between" aria-hidden="true">
          <div className="flex items-baseline justify-between">
            <span className="flex items-baseline gap-1">
              <motion.span
                key={popKey}
                className="text-base font-bold leading-none tabular-nums"
                animate={popKey > 0 && !reduce ? { scale: [1, 1.5, 1] } : { scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {loadsDone}
              </motion.span>
              <span className="text-[0.5rem] font-bold opacity-80">LOADS</span>
            </span>
            <span className="text-[0.5rem] font-bold tabular-nums opacity-80">
              {total} ITM
            </span>
          </div>
          {/* Wash-end flourish (LCD half): END line strobes a few times right
              as the ring glint sweeps. Finite blink, and it degrades to a
              static line under reduced motion. */}
          <motion.span
            key={finishKey}
            className="text-[0.5rem] font-bold tracking-[0.25em] opacity-70"
            animate={
              finishKey > 0 && !reduce
                ? { opacity: [0.7, 0.1, 0.7, 0.1, 0.7] }
                : { opacity: 0.7 }
            }
            transition={{ duration: 1.2, times: [0, 0.25, 0.5, 0.75, 1] }}
          >
            {loadsDone > 0 ? "END · " : ""}
            {programName} · READY
          </motion.span>
        </div>
      )}
      {/* Scanlines over the whole panel. */}
      <span className="pointer-events-none absolute inset-0" style={LCD_SCANLINES} aria-hidden="true" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Draft1({
  units,
  fill,
  spinCount,
  total,
  loadsDone,
  pileStyle,
  isWashing,
  degraded,
}: WasherDraftProps) {
  const reduce = useReducedMotion();
  const jitter = isWashing && !reduce;
  // Idle-only decorative loops (sheen sweep, idle LED breathe) also stop in
  // the compare-all grid — their resting frame is identical to any loop frame.
  const idleStill = reduce || degraded;
  const specularId = useId();

  // Draft-native wash-end flourish key: bumping it replays the one-shot ring
  // glint sweep + LCD END flash the instant a wash completes (alongside the
  // shared LoadBurst, which stays untouched). The ticking countdown state
  // lives in {@link LcdPanel} so it never re-renders this tree.
  const [finishKey, setFinishKey] = useState(0);
  const [prevWashing, setPrevWashing] = useState(isWashing);
  if (prevWashing !== isWashing) {
    setPrevWashing(isWashing);
    if (!isWashing) setFinishKey(finishKey + 1);
  }

  const programIndex = isWashing ? WASH_PROGRAM_INDEX : IDLE_PROGRAM_INDEX;

  // --- "load banked" burst: fires the instant a wash finishes. Shared
  // handshake with the baseline WashingMachine — see {@link useLoadBurst}.
  const { machineRef, ledRef, portholeRef, burst, popKey, completeBurst } =
    useLoadBurst(units, isWashing);

  return (
    <div className="mx-auto w-full max-w-[17rem] [--steel-hi:#dfe3e5] [--steel-mid:#c3c9cc] [--steel-lo:#adb4b8] [--steel-dk:#7d868b] [--steel-sheen:rgba(255,255,255,0.55)] [--chr-a:#f4f6f7] [--chr-b:#8e969a] [--chr-c:#e9edee] [--chr-d:#71797d] [--chr-e:#fdfdfe] [--chr-f:#9aa2a6] [--knurl-hi:#cdd2d5] [--knurl-lo:#82898e] dark:[--steel-hi:#4d545a] dark:[--steel-mid:#3b4247] dark:[--steel-lo:#2c3236] dark:[--steel-dk:#1d2226] dark:[--steel-sheen:rgba(255,255,255,0.12)] dark:[--chr-a:#9ba2a6] dark:[--chr-b:#4f565a] dark:[--chr-c:#8f969a] dark:[--chr-d:#33393d] dark:[--chr-e:#adb4b8] dark:[--chr-f:#565d61] dark:[--knurl-hi:#71787c] dark:[--knurl-lo:#3a4045]">
      {/* Body: brushed-stainless cabinet. High-frequency low-amplitude jitter
          while washing (drum keeps its own stronger local shake). */}
      <motion.div
        ref={machineRef}
        className="relative rounded-[1.9rem] border border-black/20 p-3 pb-4 shadow-lg dark:border-black/50"
        style={STEEL_BODY}
        animate={jitter ? { x: [0, -0.7, 0.7, 0] } : { x: 0 }}
        transition={jitter ? { duration: 0.16, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      >
        {/* Surface FX: baked micro-grain tile + idle sheen sweep (clipped to
            body). repeatDelay 14.4s keeps the glint's ~14% duty inside the
            idle-loop budget without changing the sweep itself. */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.85rem]"
          aria-hidden="true"
        >
          <div className="absolute inset-0 opacity-[0.05]" style={NOISE_TILE} />
          {!idleStill ? (
            <motion.div
              className="absolute inset-y-0 left-0 w-14 -skew-x-12 bg-white/30 mix-blend-soft-light"
              animate={{ x: [-90, 360] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 14.4, ease: "easeInOut" }}
            />
          ) : null}
        </div>

        {/* Fascia corner fasteners — slots at odd angles on purpose. */}
        <Screw angle={24} className="absolute left-2 top-2 z-10" />
        <Screw angle={131} className="absolute right-2 top-2 z-10" />

        {/* Control fascia: detergent drawer · blue LCD · chrome dial */}
        <div className="relative mt-2 flex items-center gap-2">
          {/* Detergent drawer: finger-pull cutout + compartment seam ticks. */}
          <div
            className="relative h-10 w-12 shrink-0 rounded-[4px] border border-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(0,0,0,0.25)]"
            style={STEEL_BODY}
            aria-hidden="true"
          >
            <span className="absolute left-3 top-1.5 h-2.5 w-px bg-black/25" />
            <span className="absolute left-6 top-1.5 h-2.5 w-px bg-black/25" />
            <span className="absolute left-9 top-1.5 h-2.5 w-px bg-black/25" />
            <span
              className="absolute inset-x-1.5 bottom-1 h-2.5 rounded-[3px]"
              style={{
                background: "linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.12))",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.55), inset 0 -1px 0 rgba(255,255,255,0.25)",
              }}
            />
          </div>

          {/* Blue segment LCD — owns its own ticking state, see LcdPanel. */}
          <LcdPanel
            isWashing={isWashing}
            loadsDone={loadsDone}
            total={total}
            finishKey={finishKey}
            popKey={popKey}
            ledRef={ledRef}
          />

          {/* Chrome program dial: knurled edge, chrome flash bezel, brushed
              cap. 6 glyph ticks at 60 deg = 6 programs; the indicator SNAPS
              between real program angles (QUICK idle -> COTTON washing). */}
          <div className="relative grid size-[4.4rem] shrink-0 place-items-center" aria-hidden="true">
            <DialTicks activeIndex={programIndex} />
            <motion.div
              className="relative size-11 rounded-full"
              style={KNURL_RING}
              animate={{ rotate: programAngle(programIndex) }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 15 }}
            >
              <span className="absolute inset-[4px] rounded-full" style={CHROME_CONIC} />
              <span className="absolute inset-[9px] rounded-full" style={STEEL_DOME} />
              <span
                className="absolute left-1/2 top-[4px] h-2.5 w-[3px] -translate-x-1/2 rounded-full shadow-[0_1px_0_rgba(255,255,255,0.5)]"
                style={{ background: "color-mix(in oklch, var(--chart-2) 55%, #2f3538)" }}
              />
            </motion.div>
          </div>
        </div>

        {/* Membrane buttons + START/PAUSE cycle indicator (decorative — the
            LCD status label carries the cycle state for screen readers). */}
        <div className="relative mt-2 flex items-center gap-1.5">
          {["TEMP", "SPIN", "OPTION"].map((label) => (
            <span
              key={label}
              className="rounded-full border border-black/20 px-2 py-0.5 text-[0.45rem] font-bold tracking-wider text-[#4c565b] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_1px_rgba(0,0,0,0.2)] [text-shadow:0_1px_0_rgba(255,255,255,0.7)] dark:text-[#aeb8bd] dark:[text-shadow:0_-1px_0_rgba(0,0,0,0.6)]"
              style={STEEL_BODY}
              aria-hidden="true"
            >
              {label}
            </span>
          ))}
          <span className="flex-1" aria-hidden="true" />
          <span className="relative grid size-8 shrink-0 place-items-center" aria-hidden="true">
            <motion.span
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: isWashing ? LED_AMBER : LED_DONE }}
              animate={
                jitter
                  ? { scale: [1, 1.06, 1], opacity: [0.5, 1, 0.5] }
                  : { scale: 1, opacity: isWashing ? 1 : 0.85 }
              }
              transition={jitter ? { duration: 1.1, repeat: Infinity } : { duration: 0.2 }}
            />
            {/* Legible play/pause glyph instead of 5px "START" micro-text. */}
            <span className="grid size-6 place-items-center rounded-full" style={STEEL_DOME}>
              {isWashing ? (
                <svg viewBox="0 0 10 10" className="size-2.5 fill-[#3a4145] dark:fill-[#c8cfd3]">
                  <rect x="2" y="1.5" width="2.2" height="7" rx="0.6" />
                  <rect x="5.8" y="1.5" width="2.2" height="7" rx="0.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 10 10" className="size-2.5 fill-[#3a4145] dark:fill-[#c8cfd3]">
                  <path d="M3 1.6a.6.6 0 0 1 .92-.5l5 3.4a.6.6 0 0 1 0 1l-5 3.4A.6.6 0 0 1 3 8.4Z" />
                </svg>
              )}
            </span>
          </span>
        </div>

        {/* Engraved seam groove: dark line over light line reads as recessed. */}
        <div className="mt-2.5" aria-hidden="true">
          <div className="h-px bg-black/25" />
          <div className="h-px bg-white/45 dark:bg-white/10" />
        </div>

        {/* Door assembly */}
        <div ref={portholeRef} className="relative mt-2.5">
          {/* Hinge plate: brushed rectangle with two fasteners. */}
          <div
            className="absolute -left-1.5 top-1/2 z-10 flex h-16 w-3.5 -translate-y-1/2 flex-col items-center justify-between rounded-sm py-1"
            style={HINGE_STEEL}
            aria-hidden="true"
          >
            <Screw angle={15} className="relative" />
            <Screw angle={78} className="relative" />
          </div>

          {/* Spun-metal outer ring — concentric brushing, distinct from body. */}
          <div className="relative rounded-full p-[9px]" style={SPUN_RING}>
            {/* Chrome bezel lip. */}
            <div className="relative rounded-full p-[3px]" style={CHROME_CONIC}>
              {/* Rubber gasket torus with fold line. Its old 0.8% scale pulse
                  is gone — under the cabinet's 0.7px shake it was below
                  perception, and dropping it removes an infinite loop. */}
              <div className="relative rounded-full p-[6px]" style={GASKET}>
                <span
                  className="pointer-events-none absolute inset-[3px] rounded-full border border-white/10"
                  aria-hidden="true"
                />

                <Drum
                  units={units}
                  fill={fill}
                  spinCount={spinCount}
                  total={total}
                  loadsDone={loadsDone}
                  pileStyle={pileStyle}
                  isWashing={isWashing}
                />
              </div>

              {/* Glass pane: convexity, edge vignette, low-iron tint, and
                  screen-fixed specular arcs that do NOT rotate with the
                  drum — the key realism cue for a separate glass layer.
                  Deliberately a SIBLING of the gasket (inset = 3px bezel +
                  6px gasket): the speculars are screen-fixed by design, and
                  the blurred SVG never sits under an animating ancestor. */}
              <div className="pointer-events-none absolute inset-[9px] z-10 rounded-full" aria-hidden="true">
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28), transparent 45%), radial-gradient(circle at 50% 50%, transparent 62%, rgba(0,0,0,0.28) 100%)",
                    boxShadow: "inset 0 0 0 2px rgba(140,180,175,0.25)",
                  }}
                />
                <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
                  <defs>
                    <filter id={specularId}>
                      <feGaussianBlur stdDeviation="1.5" />
                    </filter>
                  </defs>
                  <g filter={`url(#${specularId})`} stroke="#ffffff" fill="none" strokeLinecap="round">
                    <path d="M 17 35 A 39 39 0 0 1 33 15" strokeWidth="4" opacity="0.5" />
                    <path d="M 13 47 A 41 41 0 0 1 16 37" strokeWidth="2.5" opacity="0.25" />
                  </g>
                </svg>
                {/* Condensation mist near the bottom of the glass during a
                    wash — opacity-only crossfade, safe under reduce. */}
                <AnimatePresence>
                  {isWashing ? (
                    <motion.span
                      key="mist"
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.42), rgba(255,255,255,0.12) 42%, transparent 65%)",
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduce ? 0.3 : 1.2 }}
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* Wash-end flourish (ring half): a one-shot specular glint
                sweeps once around the spun ring the moment the wash ends,
                masked to the ring band so it never crosses the glass. Under
                reduced motion it degrades to a single opacity flash of the
                whole band — no rotation, no loop (finite either way). */}
            {finishKey > 0 ? (
              <motion.span
                key={finishKey}
                className="pointer-events-none absolute inset-0 z-20 rounded-full"
                style={RING_GLINT}
                initial={{ opacity: 0, rotate: 0 }}
                animate={
                  reduce
                    ? { opacity: [0, 0.7, 0], rotate: 0 }
                    : { opacity: [0, 1, 1, 0], rotate: 360 }
                }
                transition={{ duration: reduce ? 0.9 : 1.2, ease: "easeInOut" }}
                aria-hidden="true"
              />
            ) : null}

            {/* Crescent door-handle recess at 3 o'clock. */}
            <span
              className="absolute -right-0.5 top-1/2 z-10 h-14 w-2.5 -translate-y-1/2 rounded-full"
              style={{
                background: "linear-gradient(90deg, rgba(0,0,0,0.45), rgba(0,0,0,0.12))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.5)",
              }}
              aria-hidden="true"
            />

            {/* Door-lock LED: amber while washing, breathing green when idle. */}
            <motion.span
              className="absolute bottom-[8%] right-[9%] z-20 size-1.5 rounded-full"
              style={{
                background: isWashing ? LED_AMBER : LED_DONE,
                boxShadow: isWashing
                  ? "0 0 6px rgba(240,165,44,0.9)"
                  : `0 0 6px color-mix(in oklch, var(--chart-2) 55%, rgba(60,196,110,0.8))`,
              }}
              animate={
                isWashing
                  ? reduce
                    ? { opacity: 0.8 }
                    : { opacity: [0.6, 1, 0.6] }
                  : idleStill
                    ? { opacity: 0.8 }
                    : { opacity: [0.5, 1, 0.5] }
              }
              transition={
                (isWashing ? reduce : idleStill)
                  ? { duration: 0 }
                  : { duration: isWashing ? 0.8 : 3, repeat: Infinity }
              }
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Etched brand plate — stamped-into-metal text treatment. */}
        <div className="mt-2.5 text-center" aria-hidden="true">
          <div className="text-[0.6rem] font-extrabold tracking-[0.32em] text-[#596368] [text-shadow:0_1px_0_rgba(255,255,255,0.7)] dark:text-[#9aa4a9] dark:[text-shadow:0_-1px_0_rgba(0,0,0,0.6)]">
            SILAYAN
          </div>
          <div className="text-[0.42rem] font-bold tracking-[0.4em] text-[#7d868b] [text-shadow:0_1px_0_rgba(255,255,255,0.6)] dark:text-[#79838a] dark:[text-shadow:0_-1px_0_rgba(0,0,0,0.6)]">
            INOX SERIES
          </div>
        </div>

        {/* Seam above the kick plate. */}
        <div className="mt-2" aria-hidden="true">
          <div className="h-px bg-black/25" />
          <div className="h-px bg-white/45 dark:bg-white/10" />
        </div>

        {/* Kick plate: vent slots, drain-pump cap, serial plate, fasteners. */}
        <div
          className="relative mt-1.5 h-10 overflow-hidden rounded-md border border-black/25"
          style={KICK_STEEL}
          aria-hidden="true"
        >
          <span
            className="absolute left-3 right-11 top-1.5 h-3 rounded-sm"
            style={{
              background: "repeating-linear-gradient(90deg, transparent 0 10px, rgba(0,0,0,0.45) 10px 13px)",
              boxShadow: "inset 0 2px 3px rgba(0,0,0,0.45)",
            }}
          />
          {/* Drain-pump access cap with two notches. */}
          <span
            className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full border border-black/30"
            style={{
              background: "radial-gradient(circle at 38% 32%, var(--steel-hi), var(--steel-lo) 78%)",
              boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.4)",
            }}
          >
            <span className="flex gap-1">
              <span className="h-1.5 w-[2px] rounded-full bg-black/50" />
              <span className="h-1.5 w-[2px] rounded-full bg-black/50" />
            </span>
          </span>
          {/* Serial/rating plate with a barcode tick pattern. */}
          <span className="absolute bottom-1 left-3 h-2.5 w-10 rounded-[2px] bg-[#e7eaeb] shadow-[inset_0_1px_1px_rgba(0,0,0,0.25)] dark:bg-[#c7ccce]">
            <span
              className="absolute inset-y-0.5 left-1 right-1"
              style={{ background: "repeating-linear-gradient(90deg, #3a4045 0 1px, transparent 1px 3px)" }}
            />
          </span>
          <Screw angle={64} className="absolute bottom-1 right-10" />
        </div>

        {/* Adjustable leveling feet: threaded stems + flat pads. */}
        <span className="absolute -bottom-3 left-7 flex flex-col items-center" aria-hidden="true">
          <span
            className="h-2 w-2.5"
            style={{ background: "repeating-linear-gradient(0deg, #454b4f 0 2px, #24282b 2px 4px)" }}
          />
          <span className="h-1.5 w-5 rounded-b-md bg-[#2b2f32] shadow-md dark:bg-[#16191b]" />
        </span>
        <span className="absolute -bottom-3 right-7 flex flex-col items-center" aria-hidden="true">
          <span
            className="h-2 w-2.5"
            style={{ background: "repeating-linear-gradient(0deg, #454b4f 0 2px, #24282b 2px 4px)" }}
          />
          <span className="h-1.5 w-5 rounded-b-md bg-[#2b2f32] shadow-md dark:bg-[#16191b]" />
        </span>

        {/* "Load banked" burst: glyphs erupt from the porthole, a +1 chip
            flies to the LCD loads counter, then the counter pops. */}
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
