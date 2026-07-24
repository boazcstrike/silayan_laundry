"use client";

/**
 * Draft 2 — "Retro Laundromat Deluxe"
 *
 * Coin-op 1970s laundromat washer: cream enamel control fascia over an
 * avocado enamel cabinet, chrome trim ramps, riveted plates, Greenwald-style
 * coin slide + coin return cup, analog timer dial with a sweeping needle,
 * jewel-lens indicator bulbs, "25¢ PER LOAD" price plate and a mechanical
 * odometer load counter. Wraps the existing {@link Drum} untouched inside a
 * chrome porthole bezel with 8 dome bolts, a rubber gasket ring, twin hinge
 * knuckles and a chrome door pull with latch tongue.
 *
 * Palette-aware: the cabinet enamel, timer needle, dial cycle arcs, gasket
 * tint and wash glow are all derived from the app palette token `--chart-2`
 * via color-mix, so the 13-theme picker re-skins the machine while the warm
 * cream fascia + chrome + amber bulbs keep the retro identity. The Drum's own
 * palette border stays visible through the gasket ring (no overlay repaint).
 *
 * All materials are pure CSS gradients + inline SVG (no images, no new deps).
 * A single phase timeline (WASH → RINSE → SPIN) drives the needle, lamps and
 * coin-return rattle together while `isWashing`; when the wash ends the
 * needle spring-sweeps back to OFF ("settling") before the idle escapement
 * tick resumes — no snap. Reduced motion: no infinite loops — lamps swap by
 * opacity, needle jumps discretely, odometer crossfades.
 *
 * Accessibility: the odometer is the single live region (role="status").
 * The lamp cluster carries a static non-live label ("Machine in use" /
 * "Machine vacant") and the current phase is exposed only through the
 * non-live timer-dial aria-label, so nothing re-announces every phase tick.
 */

import { memo, useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Drum } from "@/components/designs/tumble-full/Drum";
import type { WasherDraftProps } from "./DraftProps";

/* ---------------- material recipes (inline-style gradients) ---------------- */

const CHROME_H =
  "linear-gradient(to bottom, #6b7280 0%, #e5e7eb 30%, #ffffff 50%, #cbd5e1 68%, #475569 100%)";
const CHROME_V =
  "linear-gradient(to right, #6b7280 0%, #e5e7eb 30%, #ffffff 50%, #cbd5e1 68%, #475569 100%)";
const CHROME_RING =
  "conic-gradient(from 210deg, #f8fafc, #94a3b8, #e2e8f0, #64748b, #f1f5f9, #94a3b8, #e2e8f0, #64748b, #f8fafc)";
const RIVET_BG = "radial-gradient(circle at 35% 30%, #ffffff, #9ca3af 60%, #374151)";
const RIVET_SHADOW = "0 1px 1px rgba(255,255,255,.5), inset 0 -1px 1px rgba(0,0,0,.35)";
const KNURL = "repeating-conic-gradient(#94a3b8 0deg 6deg, #e2e8f0 6deg 12deg)";
const BULB_AMBER_LIT =
  "radial-gradient(circle at 38% 32%, #fff7d6, #f59e0b 45%, #7a3b00 90%)";
const BULB_AMBER_OFF =
  "radial-gradient(circle at 38% 32%, #8a6430, #4a2c12 55%, #2a160a 90%)";
const BULB_RED_LIT =
  "radial-gradient(circle at 38% 32%, #ffe4e1, #ef4444 45%, #5f1210 90%)";
const BULB_RED_OFF =
  "radial-gradient(circle at 38% 32%, #7a3b3b, #3d1412 55%, #240a09 90%)";
const PLATE_BG = "linear-gradient(175deg, var(--plate-a), var(--plate-b))";
const FASCIA_BG =
  "radial-gradient(120% 90% at 18% 0%, rgba(255,255,255,.35), transparent 45%), linear-gradient(to bottom, rgba(255,255,255,.35) 0%, transparent 16%), linear-gradient(170deg, var(--fa), var(--fb))";
const CABINET_BG =
  "radial-gradient(130% 80% at 20% 4%, rgba(255,255,255,.22), transparent 50%), linear-gradient(to bottom, rgba(255,255,255,.28) 0%, transparent 12%), linear-gradient(168deg, var(--ca), var(--cb))";
const SEAM_SHADOW =
  "inset 0 1px 0 rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.3)";
const SLOT_SHADOW =
  "inset 0 2px 4px rgba(0,0,0,.65), inset 0 -1px 0 rgba(255,255,255,.15), 0 1px 0 rgba(255,255,255,.35)";
const VENTS_BG =
  "repeating-linear-gradient(to bottom, rgba(0,0,0,.4) 0 2px, rgba(255,255,255,.18) 2px 3px, transparent 3px 6px)";

/* -------- palette-derived accents (all flow from the picker's --chart-2) --- */

const NEEDLE_COLOR = "color-mix(in oklch, var(--chart-2) 78%, #7f1d1d)";
const ARC_WASH = "color-mix(in oklch, var(--chart-2) 75%, #c2504f)";
const ARC_RINSE = "color-mix(in oklch, var(--chart-2) 55%, #4f7ba6)";
const ARC_SPIN = "color-mix(in oklch, var(--chart-2) 40%, #5a6355)";
const GASKET_BG = "color-mix(in oklch, var(--chart-2) 24%, #23251f)";
const WASH_GLOW =
  "0 0 18px 4px color-mix(in srgb, color-mix(in oklch, var(--chart-2) 60%, #f59e0b) 42%, transparent)";
const RIM_PULSE =
  "inset 0 0 0 2px color-mix(in srgb, var(--chart-2) 55%, transparent)";

/* ---------------- wash-phase timeline (single source of truth) ------------- */

const PHASES = [
  { label: "WASH", angle: -46 },
  { label: "RINSE", angle: 0 },
  { label: "SPIN", angle: 44 },
] as const;
const OFF_ANGLE = 150;
const PHASE_MS = 1500;
/** Time the needle takes to spring back to OFF before idle ticking resumes. */
const SETTLE_MS = 1200;

type NeedleMode = "washing" | "settling" | "idle";

/* ---------------- dial geometry (precomputed, deterministic) --------------- */

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

function arcPath(startDeg: number, endDeg: number, r: number) {
  const s = polar(r, startDeg);
  const e = polar(r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
}

const DIAL_TICKS = Array.from({ length: 24 }, (_, i) => {
  const a = i * 15;
  const p1 = polar(38, a);
  const p2 = polar(44, a);
  return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
});

const BOLT_POSITIONS = Array.from({ length: 8 }, (_, i) => polar(47.5, i * 45 + 22.5));

/* ---------------- small stamped-metal parts -------------------------------- */

function Screw({ left, top, rotate }: { left: string; top: string; rotate: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute size-[6px] rounded-full"
      style={{ left, top, background: RIVET_BG, boxShadow: RIVET_SHADOW }}
    >
      <span
        className="absolute left-1/2 top-1/2 h-px w-[4px] bg-[#1f2937]/70"
        style={{ transform: `translate(-50%,-50%) rotate(${rotate}deg)` }}
      />
    </span>
  );
}

interface BulbProps {
  lit: boolean;
  label: string;
  red?: boolean;
  reduce: boolean;
}

/** Jewel-lens indicator bulb in a knurled chrome bezel. */
const Bulb = memo(function Bulb({ lit, label, red = false, reduce }: BulbProps) {
  const litBg = red ? BULB_RED_LIT : BULB_AMBER_LIT;
  const offBg = red ? BULB_RED_OFF : BULB_AMBER_OFF;
  const bloom = red
    ? "0 0 10px 2px rgba(239,68,68,.55)"
    : "0 0 10px 2px rgba(251,191,36,.55)";
  return (
    <span className="flex flex-col items-center gap-[2px]">
      <span
        aria-hidden="true"
        className="grid place-items-center rounded-full p-[2px]"
        style={{ background: KNURL, boxShadow: "0 1px 1px rgba(0,0,0,.4)" }}
      >
        <motion.span
          className="block size-[11px] rounded-full"
          style={{ background: lit ? litBg : offBg, boxShadow: lit ? bloom : "inset 0 1px 2px rgba(0,0,0,.5)" }}
          animate={lit && !reduce ? { opacity: [0.92, 1, 0.95, 1] } : { opacity: 1 }}
          transition={lit && !reduce ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.25 }}
        />
      </span>
      <span className="text-[0.33rem] font-bold tracking-[0.1em]" style={{ color: "var(--ink)" }}>
        {label}
      </span>
    </span>
  );
});

/** One odometer digit column — rolls with a spring, crossfade-free carry. */
function OdoDigit({ digit, reduce }: { digit: number; reduce: boolean }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
      <motion.span
        className="absolute left-0 top-0 flex w-full flex-col items-center"
        animate={{ y: `${-digit}em` }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 130, damping: 16 }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="h-[1em] leading-[1em]">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/* ---------------- main draft ----------------------------------------------- */

export function Draft2({
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
  // Compare-all grid: treat like reduced motion for IDLE-ONLY decorative loops
  // (glint sweep, escapement tick, flap blink, bulb flicker) — the idle look is
  // identical between loop iterations, so no visible change.
  const calm = reduce || degraded;
  const noiseId = useId();
  const shake = isWashing && !reduce;

  // Single wash timeline: WASH → RINSE → SPIN, looping while the wash runs.
  // Phase + needle mode reset during render (React's "adjust state while
  // rendering" pattern) so effects only own their timer subscriptions.
  const [phase, setPhase] = useState(0);
  const [needleMode, setNeedleMode] = useState<NeedleMode>(isWashing ? "washing" : "idle");
  const [prevWashing, setPrevWashing] = useState(isWashing);
  if (isWashing !== prevWashing) {
    setPrevWashing(isWashing);
    setPhase(0);
    // Wash end: spring-sweep the needle home first, then resume idle ticking.
    setNeedleMode(isWashing ? "washing" : "settling");
  }
  useEffect(() => {
    if (!isWashing) return;
    const id = setInterval(() => setPhase((p) => (p + 1) % PHASES.length), PHASE_MS);
    return () => clearInterval(id);
  }, [isWashing]);
  useEffect(() => {
    if (needleMode !== "settling") return;
    const id = setTimeout(() => setNeedleMode("idle"), SETTLE_MS);
    return () => clearTimeout(id);
  }, [needleMode]);

  // Bulb celebration: one flash cascade right after a load banks.
  const [celebrate, setCelebrate] = useState(false);
  const [prevLoads, setPrevLoads] = useState(loadsDone);
  if (loadsDone !== prevLoads) {
    setPrevLoads(loadsDone);
    if (loadsDone > 0) setCelebrate(true);
  }
  useEffect(() => {
    if (!celebrate) return;
    const id = setTimeout(() => setCelebrate(false), 900);
    return () => clearTimeout(id);
  }, [celebrate]);

  const digits = String(Math.min(loadsDone, 999)).padStart(3, "0").split("").map(Number);
  const spinRattle = shake && phase === 2;

  // Needle: spring between phase angles while washing, spring back to OFF
  // while settling, then a repeating escapement tick that STARTS at OFF (the
  // settled position) so the loop never snaps from a stale angle.
  const isIdleTicking = needleMode === "idle" && !calm;
  const needleAnimate = isIdleTicking
    ? { rotate: [OFF_ANGLE, OFF_ANGLE - 0.9] }
    : { rotate: isWashing ? PHASES[phase].angle : OFF_ANGLE };
  const needleTransition = reduce
    ? { duration: 0 }
    : isIdleTicking
      ? { duration: 0.12, repeat: Infinity, repeatDelay: 4, repeatType: "reverse" as const }
      : { type: "spring" as const, stiffness: 55, damping: 11 };

  return (
    <div
      className="mx-auto w-full max-w-[17rem] [--fa:#f6efdd] [--fb:#e5d9bc] [--ca:color-mix(in_oklch,var(--chart-2)_36%,#a3ad70)] [--cb:color-mix(in_oklch,var(--chart-2)_36%,#727e47)] [--ink:#41391f] [--plate-a:#e8ebef] [--plate-b:#b9c0c9] [--paper-a:#f5edd8] [--paper-b:#e6dabb] [--dial-a:#fbf6e8] [--dial-b:#ece2c8] dark:[--fa:#383325] dark:[--fb:#2a251a] dark:[--ca:color-mix(in_oklch,var(--chart-2)_30%,#3a412b)] dark:[--cb:color-mix(in_oklch,var(--chart-2)_30%,#262c1b)] dark:[--ink:#ddd5b8] dark:[--plate-a:#5b616b] dark:[--plate-b:#343941] dark:[--paper-a:#4c4634] dark:[--paper-b:#3a352a] dark:[--dial-a:#cdc19c] dark:[--dial-b:#a3946c]"
    >
      <motion.div
        className="relative rounded-[1.1rem] pb-2 shadow-xl"
        style={{ background: CABINET_BG, boxShadow: "0 10px 24px rgba(0,0,0,.28), inset 0 0 0 1px rgba(0,0,0,.22)" }}
        animate={shake ? { x: [0, -1.5, 1.5, -1.5, 1.5, 0], y: [0, 1, -1, 1, -1, 0] } : { x: 0, y: 0 }}
        transition={shake ? { duration: 0.35, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      >
        {/* enamel orange-peel wear — barely-there noise across the whole body.
            Plain alpha overlay (no mix-blend) so the shake wrapper never
            re-composites a blend stacking context; reads the same at 4%. */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full rounded-[1.1rem] opacity-[0.04]">
          <filter id={noiseId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${noiseId})`} />
        </svg>

        {/* vertical chrome corner trim strips with rivet lines */}
        <span aria-hidden="true" className="absolute inset-y-4 left-[3px] w-[3px] rounded-full" style={{ background: CHROME_RING, boxShadow: "0 0 2px rgba(0,0,0,.4)" }} />
        <span aria-hidden="true" className="absolute inset-y-4 right-[3px] w-[3px] rounded-full" style={{ background: CHROME_RING, boxShadow: "0 0 2px rgba(0,0,0,.4)" }} />
        {["14%", "32%", "50%", "68%", "86%"].map((top) => (
          <span key={top} aria-hidden="true">
            <span className="absolute left-[9px] size-[5px] rounded-full" style={{ top, background: RIVET_BG, boxShadow: RIVET_SHADOW }} />
            <span className="absolute right-[9px] size-[5px] rounded-full" style={{ top, background: RIVET_BG, boxShadow: RIVET_SHADOW }} />
          </span>
        ))}

        {/* ------------------- control fascia (cream enamel) -------------------
            No shake loop of its own: it rides the cabinet wrapper's shake
            (a duplicate 0.06s-delayed jitter was imperceptible at 1-2px). */}
        <div
          className="relative m-1.5 rounded-t-[0.9rem] rounded-b-[0.35rem] px-2.5 pt-2 pb-2"
          style={{ background: FASCIA_BG, boxShadow: "0 2px 4px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.18)" }}
        >
          {/* chrome script brand badge + serial plate */}
          <div className="flex items-center justify-between">
            <span
              className="text-[0.8rem] font-bold italic tracking-tight"
              style={{
                backgroundImage: CHROME_H,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 1px 0 rgba(0,0,0,.45))",
                fontFamily: "Georgia, 'Times New Roman', serif",
              }}
            >
              Silayan
            </span>
            <span
              aria-hidden="true"
              className="rounded-[2px] px-1 py-[1px] text-[0.3rem] font-semibold tracking-[0.08em] text-[#2c3138] dark:text-[#d5dae2]"
              style={{ background: PLATE_BG, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.3)", textShadow: "0 1px 0 rgba(255,255,255,.35)" }}
            >
              MODEL SL-1974 · 115V
            </span>
          </div>

          {/* dial · lamps + rocker keys · coin slide */}
          <div className="mt-1.5 flex items-stretch gap-2">
            {/* analog timer dial — the ONLY place the current phase is exposed
                to assistive tech, and it is not a live region by design */}
            <div
              className="relative size-[4.4rem] shrink-0 rounded-full p-[3px]"
              style={{ background: KNURL, boxShadow: "0 2px 3px rgba(0,0,0,.35)" }}
              role="img"
              aria-label={isWashing ? `Timer dial: ${PHASES[phase].label.toLowerCase()} cycle` : "Timer dial: off"}
            >
              <div
                className="relative h-full w-full rounded-full"
                style={{ background: "radial-gradient(circle at 40% 30%, var(--dial-a), var(--dial-b) 75%)", boxShadow: "inset 0 1px 3px rgba(0,0,0,.35)" }}
              >
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  {DIAL_TICKS.map((t, i) => (
                    <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#6b5f3f" strokeWidth={i % 6 === 0 ? 2 : 1} opacity="0.7" />
                  ))}
                  <path d={arcPath(-70, -22, 31)} style={{ stroke: ARC_WASH }} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.85" />
                  <path d={arcPath(-18, 22, 31)} style={{ stroke: ARC_RINSE }} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.85" />
                  <path d={arcPath(26, 68, 31)} style={{ stroke: ARC_SPIN }} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.85" />
                  <text x="50" y="14" textAnchor="middle" fontSize="8" fontWeight="700" fill="#4a4128">R</text>
                  <text x="24" y="28" textAnchor="middle" fontSize="8" fontWeight="700" fill="#4a4128">W</text>
                  <text x="77" y="28" textAnchor="middle" fontSize="8" fontWeight="700" fill="#4a4128">S</text>
                  <text x="64" y="80" textAnchor="middle" fontSize="7" fontWeight="700" fill="#4a4128">OFF</text>
                </svg>
                {/* needle — phase spring while washing, spring-home settle after
                    the wash, escapement tick only once it has settled at OFF */}
                <motion.div
                  className="pointer-events-none absolute inset-0"
                  style={{ transformOrigin: "50% 50%" }}
                  animate={needleAnimate}
                  transition={needleTransition}
                  aria-hidden="true"
                >
                  <span
                    className="absolute left-1/2 top-[13%] h-[37%] w-[2.5px] -translate-x-1/2 rounded-full"
                    style={{ background: NEEDLE_COLOR, boxShadow: "0 1px 1px rgba(0,0,0,.4)" }}
                  />
                </motion.div>
                {/* domed chrome center cap */}
                <span aria-hidden="true" className="absolute left-1/2 top-1/2 size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: RIVET_BG, boxShadow: RIVET_SHADOW }} />
              </div>
            </div>

            {/* jewel lamps + temperature rocker keys — static non-live label so
                the phase cadence never spams screen readers */}
            <div className="flex min-w-0 flex-1 flex-col items-center justify-between py-0.5">
              <div
                className="flex items-start gap-1.5"
                role="img"
                aria-label={isWashing ? "Machine in use" : "Machine vacant"}
              >
                <Bulb lit={isWashing || celebrate} label="IN USE" red reduce={calm} />
                <Bulb lit={(isWashing && phase === 0) || celebrate} label="WASH" reduce={calm} />
                <Bulb lit={(isWashing && phase === 1) || celebrate} label="RINSE" reduce={calm} />
                <Bulb lit={(isWashing && phase === 2) || celebrate} label="SPIN" reduce={calm} />
              </div>
              <div className="flex gap-[3px]" aria-hidden="true">
                <span className="rounded-[3px] px-1.5 py-[3px] text-[0.32rem] font-bold text-[#4a4128] dark:text-[#d9d2b8]" style={{ background: "linear-gradient(to bottom, var(--fa), var(--fb))", boxShadow: "0 1.5px 0 rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.4)" }}>
                  HOT
                </span>
                <span className="translate-y-[1.5px] rounded-[3px] px-1.5 py-[3px] text-[0.32rem] font-bold text-[#4a4128] dark:text-[#d9d2b8]" style={{ background: "linear-gradient(to bottom, var(--fb), var(--fb))", boxShadow: "inset 0 1px 2px rgba(0,0,0,.35)" }}>
                  WARM
                </span>
                <span className="rounded-[3px] px-1.5 py-[3px] text-[0.32rem] font-bold text-[#4a4128] dark:text-[#d9d2b8]" style={{ background: "linear-gradient(to bottom, var(--fa), var(--fb))", boxShadow: "0 1.5px 0 rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.4)" }}>
                  COLD
                </span>
              </div>
            </div>

            {/* coin slide + price plate */}
            <div className="flex w-[3.6rem] shrink-0 flex-col gap-1">
              <motion.div
                className="relative rounded-[3px] px-1 pb-1 pt-[3px]"
                style={{ background: PLATE_BG, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.3)" }}
                animate={shake ? { x: [0, 2.5, 0] } : { x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                aria-hidden="true"
              >
                <span className="block text-center text-[0.26rem] font-bold tracking-[0.04em] text-[#2c3138] dark:text-[#d5dae2]" style={{ textShadow: "0 1px 0 rgba(255,255,255,.35)" }}>
                  INSERT COIN
                </span>
                <span className="relative mx-auto mt-[2px] block h-[14px] w-[3px] rounded-[1px] bg-[#0d0f12]" style={{ boxShadow: SLOT_SHADOW }}>
                  {/* coin drop ceremony at wash start */}
                  {isWashing && !reduce ? (
                    <motion.span
                      className="absolute left-1/2 top-[-12px] size-[9px] -translate-x-1/2 rounded-full text-center text-[0.28rem] font-bold leading-[9px] text-[#3f4650]"
                      style={{ background: RIVET_BG, boxShadow: RIVET_SHADOW }}
                      initial={{ y: -8, opacity: 0, rotate: -20 }}
                      animate={{ y: [-8, 4, 12], opacity: [0, 1, 0], scaleY: [1, 1, 0.35], rotate: [-20, 0, 0] }}
                      transition={{ duration: 0.8, ease: "easeIn" }}
                    >
                      ¢
                    </motion.span>
                  ) : null}
                </span>
                <span className="mx-auto mt-[2px] block h-[3px] w-[70%] rounded-full" style={{ background: CHROME_H }} />
              </motion.div>
              {/* riveted price plate, debossed lettering, 4 corner screws */}
              <div
                className="relative rounded-[3px] px-1 py-[3px] text-center"
                style={{ background: PLATE_BG, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.3)" }}
              >
                <Screw left="1px" top="1px" rotate={20} />
                <Screw left="calc(100% - 7px)" top="1px" rotate={65} />
                <Screw left="1px" top="calc(100% - 7px)" rotate={-40} />
                <Screw left="calc(100% - 7px)" top="calc(100% - 7px)" rotate={100} />
                <span className="text-[0.32rem] font-extrabold tracking-[0.06em] text-[#2c3138] dark:text-[#e2e6ec]" style={{ textShadow: "0 1px 0 rgba(255,255,255,.4)" }}>
                  25¢ PER LOAD
                </span>
              </div>
            </div>
          </div>

          {/* full-width chrome trim strip with periodic glint sweep —
              transform-only (static `left`, animated x): the blurred span
              rasterizes once and just translates on the compositor */}
          <span aria-hidden="true" className="relative mt-1.5 block h-[3px] w-full overflow-hidden rounded-full" style={{ background: CHROME_H, boxShadow: "0 0.5px 0 rgba(255,255,255,.5)" }}>
            {!calm ? (
              <motion.span
                className="absolute inset-y-0 w-8 bg-white/70 blur-[2px]"
                style={{ left: "-15%" }}
                animate={{ x: ["0%", "850%"] }}
                transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 7, ease: "easeInOut" }}
              />
            ) : null}
          </span>
          {/* pressed pinstripe seam under the fascia */}
          <span aria-hidden="true" className="absolute inset-x-2 -bottom-[3px] block h-[2px] rounded-full" style={{ boxShadow: SEAM_SHADOW }} />
        </div>

        {/* ------------------- porthole: chrome bezel + gasket + Drum --------- */}
        <div className="relative px-3 pt-1.5">
          <div className="relative mx-auto w-full max-w-[15.2rem]">
            <div
              className="relative rounded-full p-[9px]"
              style={{ background: CHROME_RING, boxShadow: "0 3px 8px rgba(0,0,0,.35), inset 0 1px 1px rgba(255,255,255,.6)" }}
            >
              {/* 8 dome-head bolts around the bezel */}
              {BOLT_POSITIONS.map((p, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, background: RIVET_BG, boxShadow: RIVET_SHADOW }}
                />
              ))}
              {/* rubber door gasket between bezel and glass — palette-tinted
                  dark rubber. The Drum keeps its own --chart-2 border (no
                  overlay repaint, no coupling to Drum's border width). */}
              <div className="relative rounded-full p-[4px]" style={{ background: GASKET_BG, boxShadow: "inset 0 1px 2px rgba(255,255,255,.18), inset 0 -1px 2px rgba(0,0,0,.6)" }}>
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
              {/* glass rim specular — edge-only, never covers the drum readout */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-[10px] rounded-full" style={{ boxShadow: "inset 0 6px 8px -7px rgba(255,255,255,.65)" }} />
              {/* door hinge stubs — twin chrome knuckles on the left edge */}
              {["31%", "58%"].map((top) => (
                <span
                  key={top}
                  aria-hidden="true"
                  className="absolute -left-[5px] h-[11px] w-[8px] rounded-l-[3px]"
                  style={{ top, background: CHROME_V, boxShadow: "0 1px 2px rgba(0,0,0,.45), inset 0 0 0 0.5px rgba(0,0,0,.25)" }}
                >
                  <span className="absolute left-[2px] top-1/2 size-[3px] -translate-y-1/2 rounded-full" style={{ background: RIVET_BG, boxShadow: RIVET_SHADOW }} />
                </span>
              ))}
              {/* chrome door pull + thumb latch on the right of the bezel */}
              <span
                aria-hidden="true"
                className="absolute -right-[7px] top-1/2 h-[30px] w-[10px] -translate-y-1/2 rounded-r-[6px] rounded-l-[2px]"
                style={{ background: CHROME_V, boxShadow: "0 1px 3px rgba(0,0,0,.5), inset 0 0 0 0.5px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.6)" }}
              >
                {/* finger recess */}
                <span className="absolute left-[3px] top-1/2 h-[16px] w-[3px] -translate-y-1/2 rounded-full bg-[#171a1f]/75" style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,.8), 0 0.5px 0 rgba(255,255,255,.35)" }} />
                {/* latch tongue biting into the bezel */}
                <span className="absolute -left-[4px] top-1/2 h-[6px] w-[5px] -translate-y-1/2 rounded-[1px]" style={{ background: CHROME_H, boxShadow: "0 1px 1px rgba(0,0,0,.5)" }} />
              </span>
              {/* warm palette-shifted wash glow hugging the bezel while running */}
              <AnimatePresence>
                {isWashing ? (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-[2px] rounded-full"
                    style={{ boxShadow: `${WASH_GLOW}, ${RIM_PULSE}` }}
                    initial={{ opacity: 0 }}
                    animate={reduce ? { opacity: 0.6 } : { opacity: [0.25, 0.7, 0.25] }}
                    exit={{ opacity: 0 }}
                    transition={reduce ? { duration: 0.3 } : { duration: 1.1, repeat: Infinity }}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ------------------- lower cabinet row ------------------------------ */}
        <div className="mt-2 flex items-stretch gap-1.5 px-3">
          {/* coin return cup: recessed cavity + chrome trapezoid flap */}
          <div
            className="relative h-9 w-12 shrink-0 rounded-[4px] p-[3px]"
            style={{ background: PLATE_BG, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.35)" }}
            aria-hidden="true"
          >
            <div className="relative h-full w-full overflow-hidden rounded-[3px] bg-[#101210]" style={{ boxShadow: "inset 0 3px 5px rgba(0,0,0,.8), inset 0 -1px 0 rgba(255,255,255,.08)" }}>
              <motion.span
                className="absolute inset-x-[3px] top-[4px] h-[18px]"
                style={{
                  background: CHROME_H,
                  clipPath: "polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%)",
                  transformOrigin: "top center",
                  boxShadow: "0 1px 2px rgba(0,0,0,.6)",
                }}
                animate={
                  spinRattle
                    ? { rotateX: [0, 8, 0, 5, 0] }
                    : !isWashing && !calm
                      ? { rotateX: [0, 6, 0] }
                      : { rotateX: 0 }
                }
                transition={
                  spinRattle
                    ? { duration: 0.25, repeat: Infinity, ease: "easeInOut" }
                    : !isWashing && !calm
                      ? { duration: 0.3, repeat: Infinity, repeatDelay: 11, ease: "easeOut" }
                      : { duration: 0.2 }
                }
              />
              <span className="absolute inset-x-[3px] top-[3px] h-px bg-black/60" />
            </div>
            <span className="absolute inset-x-0 -bottom-[7px] text-center text-[0.26rem] font-semibold tracking-[0.08em]" style={{ color: "var(--ink)" }}>
              COIN RETURN
            </span>
          </div>

          {/* mechanical odometer load counter (white-on-black drum wheels) —
              the single live region for this machine */}
          <div
            className="flex h-9 flex-1 flex-col items-center justify-center rounded-[4px] p-[3px]"
            style={{ background: PLATE_BG, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.25)" }}
            role="status"
            aria-label={
              isWashing
                ? "Washing full load"
                : `${loadsDone} wash load${loadsDone === 1 ? "" : "s"} completed`
            }
          >
            <div className="flex items-center gap-[2px] rounded-[2px] bg-[#0c0d0f] px-1.5 py-[2px] font-mono text-[0.72rem] font-bold text-[#f2f4f0]" style={{ boxShadow: "inset 0 2px 3px rgba(0,0,0,.9), inset 0 -1px 0 rgba(255,255,255,.12)" }}>
              {digits.map((d, i) => (
                <OdoDigit key={i} digit={d} reduce={reduce} />
              ))}
            </div>
            <span className="mt-[2px] text-[0.28rem] font-bold tracking-[0.14em]" style={{ color: "var(--ink)" }}>
              {isWashing ? "CYCLE RUNNING" : "LOADS COMPLETED"}
            </span>
          </div>

          {/* acrylic instruction card with plastic glare streak */}
          <div
            className="relative h-9 w-[4.6rem] shrink-0 overflow-hidden rounded-[3px] px-1 py-[3px]"
            style={{ background: "linear-gradient(165deg, var(--paper-a), var(--paper-b))", boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.3)" }}
            aria-hidden="true"
          >
            <span className="block text-[0.26rem] font-bold tracking-[0.04em]" style={{ color: "var(--ink)" }}>
              OPERATING INSTRUCTIONS
            </span>
            <span className="mt-[2px] block text-[0.24rem] leading-[1.5]" style={{ color: "var(--ink)" }}>
              1. LOAD CLOTHES · CLOSE DOOR
              <br />
              2. ADD SOAP · SET TEMP
              <br />
              3. PUSH COIN SLIDE SLOWLY
            </span>
            <span className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,.35) 45%, transparent 52%)" }} />
          </div>
        </div>

        {/* louvered ventilation slots above the kick plate */}
        <div className="mx-4 mt-2 h-[12px] rounded-[3px]" style={{ background: VENTS_BG, boxShadow: "inset 0 1px 3px rgba(0,0,0,.4)" }} aria-hidden="true" />

        {/* leveling feet: chrome threaded stubs + rubber pads */}
        <span aria-hidden="true" className="absolute -bottom-[10px] left-8 flex flex-col items-center">
          <span className="h-[5px] w-[6px]" style={{ background: CHROME_H }} />
          <span className="h-[5px] w-[14px] rounded-b-[3px] bg-[#1d1e1b] dark:bg-[#0e0f0d]" />
        </span>
        <span aria-hidden="true" className="absolute -bottom-[10px] right-8 flex flex-col items-center">
          <span className="h-[5px] w-[6px]" style={{ background: CHROME_H }} />
          <span className="h-[5px] w-[14px] rounded-b-[3px] bg-[#1d1e1b] dark:bg-[#0e0f0d]" />
        </span>
      </motion.div>

      {/* floor shadow — pulses with the shake so the machine reads planted.
          Paint-once gradient ellipse (no blur filter on an animated element). */}
      <motion.div
        aria-hidden="true"
        className="mx-auto mt-3 h-2.5 w-[78%] rounded-[50%] [background:radial-gradient(50%_50%,rgba(0,0,0,.25),transparent_70%)] dark:[background:radial-gradient(50%_50%,rgba(0,0,0,.55),transparent_70%)]"
        animate={shake ? { scaleX: [1, 1.05, 1], opacity: [0.8, 1, 0.8] } : { scaleX: 1, opacity: 0.8 }}
        transition={shake ? { duration: 0.35, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      />
    </div>
  );
}
