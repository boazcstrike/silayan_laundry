"use client";

/**
 * Draft 6 — "Porcelain Onyx" (client-directed merge).
 *
 * OUTER — Draft 4 "Skeuomorph Glass" wins: porcelain body, bevel edges,
 * ceramic dial, debossed buttons, kick panel, and all its water/glass optics.
 * DOOR — Draft 3 "Smart Onyx" door verbatim (client-directed): conic chrome
 * trim annulus (p-[13px]) around a matte near-black rubber boot (p-[6px]),
 * concealed hinge crease, and the flush recessed pull-handle groove — this
 * replaces Draft 4's masked chrome ring, screws, bellows gasket and scoop
 * handle entirely.
 * INNER — Draft 3 "Smart Onyx": edge-lit LED progress ring seated in the
 * trim/gasket gap showing fill, 30° wash chase orbit, wash-end full-circle
 * sweep, OLED-style emissive accents (LED window glow, lock LED). Every
 * emissive tone derives from color-mix(var(--chart-2)) → all 13 palettes.
 *
 * DOOR GEOMETRY (Draft 3's): the LED SVG viewBox 200 spans the whole door
 * (trim + gasket + glass). Arc + chase orbit at r 89, minute ticks at r 95.5
 * — the lit band sits between the chrome trim's inner lip and the glass edge,
 * so no drum interior (and never the centre readout chip) is occluded.
 */

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Drum } from "@/components/designs/tumble-full/Drum";
import { LoadBurst } from "@/components/designs/tumble-full/LoadBurst";
import { useLoadBurst } from "@/components/designs/tumble-full/useLoadBurst";
import type { WasherDraftProps } from "./DraftProps";

/* --- masks (percentages of each layer's closest-side radius, px math above) */

const BEVEL_MASK = "radial-gradient(closest-side, transparent 81.5%, black 84%, black 90%, transparent 92%)";
const TICK_MASK = "radial-gradient(closest-side, transparent 88%, black 90%, black 100%)";

const BEVEL_CATCHLIGHT =
  "conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0) 102deg, rgba(240,248,245,.85) 128deg, rgba(255,255,255,0) 162deg, rgba(255,255,255,0) 284deg, rgba(255,255,255,.95) 314deg, rgba(255,255,255,0) 344deg)";

/** Onyx emissive family — each tier mixes --chart-2 with white ONLY, so the
 * hue always comes from the active palette (warm themes stay warm). */
const LED = "color-mix(in oklch, var(--chart-2) 75%, white)";
const LED_DEEP = "color-mix(in oklch, var(--chart-2) 88%, white)";
const LED_BRIGHT = "color-mix(in oklch, var(--chart-2) 35%, white)";
const LED_TEXT = "color-mix(in oklch, var(--chart-2) 55%, white)";
/** Faked glow strokes — wide low-alpha twins instead of blur()/drop-shadow. */
const LED_GLOW = `color-mix(in oklch, ${LED} 35%, transparent)`;
const LED_GLOW_SOFT = `color-mix(in oklch, ${LED} 30%, transparent)`;

/** LED ring radius in viewBox units — Draft 3's trim/gasket-gap orbit. */
const RING_R = 89;

/** Foam flecks clinging to the waterline ([left %, bob delay s]). */
const FLECKS: ReadonlyArray<[number, number]> = [[16, 0], [31, 0.4], [47, 0.15], [62, 0.55], [78, 0.3]];

const WAVE_LAYERS = [
  { dur: 11, op: 0.18, cls: "absolute -top-[11px] left-0 h-[12px] w-[200%]" },
  { dur: 7, op: 0.3, cls: "absolute -top-[9px] left-[-14%] h-[10px] w-[200%]" },
] as const;

const LIFTER_ANGLES = [0, 120, 240] as const;
/** Late-wash condensation streaks running down through the fog. */
const STREAKS = [
  { cls: "absolute left-[30%] top-[6%] h-[8px] w-[4px] rounded-full bg-white/60", mid: 34, end: 70, peak: 0.7, dur: 2.2, delay: 3.5, rest: 6 },
  { cls: "absolute left-[58%] top-[4%] h-[7px] w-[3px] rounded-full bg-white/55", mid: 28, end: 62, peak: 0.6, dur: 2.4, delay: 5, rest: 7 },
] as const;
/* -------------------------------------------------------------- pieces --- */

/** Drum hardware behind the glass: three ghosted lifter paddles.
 * Lifters tumble ONLY while a wash runs. */
function DrumHardware({ isWashing, reduce, uid }: { isWashing: boolean; reduce: boolean; uid: string }) {
  const tumble = isWashing && !reduce;
  return (
    <div className="pointer-events-none absolute inset-1 overflow-hidden rounded-full" aria-hidden="true">
      {/* Lifters/baffles at 120° spacing — tumbling only during the wash. */}
      <motion.div
        className="absolute inset-0"
        animate={tumble ? { rotate: [0, 360] } : { rotate: 0 }}
        transition={tumble ? { duration: 3.6, repeat: Infinity, ease: "linear" } : { duration: 0.6, ease: "easeOut" }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e8ecea" />
              <stop offset="55%" stopColor="#b9c2be" />
              <stop offset="100%" stopColor="#d5dbd8" />
            </linearGradient>
          </defs>
          {LIFTER_ANGLES.map((a) => (
            <g key={a} transform={`rotate(${a} 50 50)`} opacity="0.3">
              <path
                d="M45.5 1.5 L54.5 1.5 L52.3 13.5 Q50 15.8 47.7 13.5 Z"
                fill={`url(#${uid}-steel)`} stroke="rgba(60,70,66,.4)" strokeWidth="0.4"
              />
              <circle cx="50" cy="5.4" r="0.85" fill="rgba(48,58,54,.55)" />
              <circle cx="50" cy="9.2" r="0.85" fill="rgba(48,58,54,.55)" />
            </g>
          ))}
        </svg>
      </motion.div>
    </div>
  );
}

/** Water tint sloshing behind the glass: parallax waves, meniscus + flecks,
 * counter-tilt inertia. The caustic filter sits on the STATIC water body only
 * (rasterizes once per fill change, not per frame). Drains on wash end. */
function WaterSlosh({ fill, reduce, causticOff, uid }: { fill: number; reduce: boolean; causticOff: boolean; uid: string }) {
  const heightPct = Math.round(16 + Math.min(1, Math.max(0, fill)) * 34);
  const wavePath = "M0 10 Q12.5 2 25 10 T50 10 T75 10 T100 10 T125 10 T150 10 T175 10 T200 10 V22 H0 Z";

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-1 overflow-hidden rounded-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: reduce ? 0 : 1, scaleY: 0 }}
      style={{ transformOrigin: "bottom" }}
      transition={reduce ? { duration: 0 } : { duration: 0.55, ease: "easeIn" }}
    >
      {/* Counter-slosh: lags opposite the drum shake for liquid inertia. */}
      <motion.div
        className="absolute inset-0"
        animate={reduce ? { rotate: 0 } : { rotate: [0, 4, -4, 3, -3, 0] }}
        transition={reduce ? { duration: 0 } : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-x-[-12%] bottom-[-2%]" style={{ height: `${heightPct}%` }}>
          {/* Meniscus — the lighter 1px line where water meets glass. */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "color-mix(in oklch, var(--chart-2) 45%, white)", opacity: 0.7 }}
          />
          {/* Parallax sine waves, slower layer behind. */}
          {WAVE_LAYERS.map((w) => (
            <motion.div
              key={w.dur} className={w.cls}
              animate={reduce ? { x: 0 } : { x: ["0%", "-50%"] }}
              transition={reduce ? { duration: 0 } : { duration: w.dur, repeat: Infinity, ease: "linear" }}
            >
              <svg viewBox="0 0 200 22" preserveAspectRatio="none" className="h-full w-full">
                <path d={wavePath} fill="var(--chart-2)" opacity={w.op} />
              </svg>
            </motion.div>
          ))}
          {/* Water body — the ONLY caustic-filtered layer (static pixels). */}
          <div className="absolute inset-0" style={{ background: "var(--chart-2)", opacity: 0.28, filter: causticOff ? undefined : `url(#${uid}-caustic)` }} />
          {/* Foam flecks bobbing on the meniscus. */}
          {FLECKS.map(([left, delay]) => (
            <motion.span
              key={left}
              className="absolute -top-[3px] size-[4px] rounded-full bg-white/80"
              style={{ left: `${left}%` }}
              animate={reduce ? { y: 0 } : { y: [0, -2, 0, 2, 0] }}
              transition={reduce ? { duration: 0 } : { duration: 1.8, repeat: Infinity, delay, ease: "easeInOut" }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Wash fog at the glass top + late droplet streaks (peak 0.18 — the readout
 * chip beneath only brightens, never loses contrast). */
function Condensation({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-1 overflow-hidden rounded-full"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 2 }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[30%]"
        style={{ background: "radial-gradient(80% 90% at 50% 0%, rgba(255,255,255,.16), rgba(255,255,255,0) 80%)" }}
      />
      {!reduce
        ? STREAKS.map((s) => (
            <motion.span
              key={s.cls} className={s.cls}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [0, s.mid, s.end], opacity: [0, s.peak, 0] }}
              transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, repeatDelay: s.rest, ease: "easeIn" }}
            />
          ))
        : null}
    </motion.div>
  );
}

/** Convex tempered-glass overlay: drifting lens hot-spot, vignette, green
 * edge tint, bevel catch-light, idle droplet. Highlights never rotate. */
function GlassOverlay({ reduce, uid }: { reduce: boolean; uid: string }) {
  return (
    <div className="pointer-events-none absolute inset-1 overflow-hidden rounded-full" aria-hidden="true">
      {/* Focal-offset lens hot-spot — reads as curved glass. Drifts ~2%. */}
      <motion.div
        className="absolute inset-0"
        animate={reduce ? { x: 0, y: 0 } : { x: ["0%", "2%", "0%"], y: ["0%", "1.5%", "0%"] }}
        transition={reduce ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <defs>
            <radialGradient id={`${uid}-lens`} cx="0.5" cy="0.5" r="0.7" fx="0.3" fy="0.2">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
              <stop offset="20%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="50" fill={`url(#${uid}-lens)`} />
        </svg>
      </motion.div>
      {/* Static convex-thickness vignette + bottom-right counter reflection. */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(closest-side at 50% 50%, rgba(0,0,0,0) 55%, rgba(10,25,22,.28) 100%), radial-gradient(30% 18% at 72% 82%, rgba(255,255,255,.18), rgba(255,255,255,0) 70%)" }}
      />
      {/* Extra dark-theme highlight lift so glass still reads on charcoal. */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{ background: "radial-gradient(36% 24% at 26% 18%, rgba(255,255,255,.2), rgba(255,255,255,0) 70%)" }}
      />
      {/* Green soda-lime edge tint — inside the bevel band, never covered. */}
      <div className="absolute inset-[21px] rounded-full" style={{ boxShadow: "inset 0 0 0 2.5px rgba(120,175,160,.45)" }} />
      {/* Beveled rim catch-light at 10–11 and 4–5 o'clock. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: BEVEL_CATCHLIGHT, maskImage: BEVEL_MASK, WebkitMaskImage: BEVEL_MASK, opacity: 0.8 }}
      />
      {/* Idle stray droplet running down the inside of the glass. */}
      {!reduce ? (
        <motion.span
          className="absolute left-[38%] top-[16%] h-[7px] w-[5px] rounded-full"
          style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,.95), rgba(210,230,225,.4) 60%, rgba(180,200,195,.12))" }}
          initial={{ y: 0, x: 0, opacity: 0 }}
          animate={{ y: [0, 46, 104], x: [0, 4, -3], opacity: [0, 0.9, 0] }}
          transition={{ duration: 2.8, delay: 4, repeat: Infinity, repeatDelay: 17, ease: "easeIn" }}
        />
      ) : null}
    </div>
  );
}

/** Glazed ceramic program dial: fired porcelain dome, off-centre glaze
 * specular, debossed tick ring, painted underglaze index line. */
function CeramicDial() {
  return (
    <div className="relative size-11 shrink-0" aria-hidden="true">
      {/* Debossed tick marks stamped into the fascia enamel. */}
      <div
        className="absolute -inset-0.5 rounded-full"
        style={{
          background: "repeating-conic-gradient(rgba(0,0,0,.28) 0deg 2deg, transparent 2deg 30deg)",
          maskImage: TICK_MASK, WebkitMaskImage: TICK_MASK,
        }}
      />
      {/* Fired-porcelain dome, light theme. */}
      <div
        className="absolute inset-0 rounded-full dark:hidden"
        style={{
          background: "radial-gradient(circle at 34% 26%, #ffffff, #f2f1ec 42%, #d9d8d0 76%, #c3c2b9)",
          boxShadow: "0 1.5px 3px rgba(20,30,27,.3), inset 0 -2px 3px rgba(90,95,88,.28), inset 0 1px 0 rgba(255,255,255,.9)",
        }}
      />
      {/* Charcoal-porcelain dome, dark theme. */}
      <div
        className="absolute inset-0 hidden rounded-full dark:block"
        style={{
          background: "radial-gradient(circle at 34% 26%, #4c534f, #3a403d 42%, #2c312e 76%, #242826)",
          boxShadow: "0 1.5px 3px rgba(0,0,0,.5), inset 0 -2px 3px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.16)",
        }}
      />
      {/* Wet glaze specular — small hard ellipse high-left. */}
      <span className="absolute left-[26%] top-[18%] h-[6px] w-[9px] -rotate-[24deg] rounded-[50%] bg-white/85 blur-[0.5px] dark:bg-white/40" />
      {/* Painted underglaze index line — soft brush stroke under the glaze. */}
      <span
        className="absolute left-1/2 top-[4px] h-[11px] w-[3px] -translate-x-1/2 rounded-full"
        style={{
          background: "color-mix(in oklch, var(--chart-2) 85%, #0f1c1a)",
          boxShadow: "0 0 1.5px color-mix(in oklch, var(--chart-2) 60%, transparent)",
        }}
      />
    </div>
  );
}

/** Onyx edge-lit LED ring on Draft 3's door geometry: arc at r {@link RING_R}
 * seats in the gap between the chrome trim's inner lip and the rubber boot,
 * minute ticks etched into the trim at r 95.5 (Draft 3's precision bezel).
 * Fill when idle, 30° chase while washing, one bright sweep on wash end.
 * No filters in loops (glow faked with wide low-alpha twin strokes); `calm`
 * = reduce/compare-grid/off-screen, and stills the idle halo pulse only. */
function OnyxRing({
  fill, isWashing, reduce, calm, sweepKey, onSweepDone,
}: {
  fill: number; isWashing: boolean; reduce: boolean; calm: boolean; sweepKey: number; onSweepDone: () => void;
}) {
  // Comet flash at the LED arc tip whenever fill rises — event one-shot, not
  // a loop; "adjust state during render", no effect/rAF (same as ringSweep).
  const [comet, setComet] = useState<{ key: number; x: number; y: number } | null>(null);
  const [prevFill, setPrevFill] = useState(fill);
  if (fill !== prevFill) {
    setPrevFill(fill);
    if (fill > prevFill) {
      const a = ((fill * 360 - 90) * Math.PI) / 180;
      setComet((c) => ({ key: (c?.key ?? 0) + 1, x: 100 + RING_R * Math.cos(a), y: 100 + RING_R * Math.sin(a) }));
    }
  }

  // Round strokeLinecap renders a lone glowing cap dot at 12 o'clock even at
  // pathLength ~0 — hide both arc layers entirely while the drum is empty.
  const arcVisible = isWashing || fill > 0;

  return (
    <>
      <div
        role="img"
        aria-label={`Drum fill ${Math.round(fill * 100)} percent`}
        className="pointer-events-none absolute inset-0 z-[7]"
      >
        <svg viewBox="0 0 200 200" className="h-full w-full">
          {/* Minute ticks — precision instrument bezel on the chrome trim. */}
          <circle
            cx="100" cy="100" r="95.5" fill="none" stroke="rgba(255,255,255,0.1)"
            strokeWidth="2.5" pathLength={60} strokeDasharray="0.1 0.9"
          />
          {/* Unlit track in the trim/gasket gap. */}
          <circle cx="100" cy="100" r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
          <g transform="rotate(-90 100 100)">
            {/* Emissive halo — wide low-alpha stroke fakes the bleed, no blur(). */}
            <motion.circle
              cx="100" cy="100" r={RING_R} fill="none" stroke={LED_GLOW}
              strokeWidth="10" strokeLinecap="round"
              initial={false}
              animate={{
                pathLength: isWashing ? 1 : Math.max(fill, 0.001),
                opacity: !arcVisible ? 0 : reduce ? 0.5 : isWashing ? [0.5, 0.95, 0.5] : calm ? 0.5 : [0.35, 0.6, 0.35],
              }}
              transition={{
                pathLength: reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 30 },
                opacity:
                  !arcVisible || (isWashing ? reduce : calm)
                    ? { duration: 0 }
                    : { duration: isWashing ? 1.8 : 5, repeat: Infinity, ease: "easeInOut" },
              }}
            />
            {/* Crisp arc. */}
            <motion.circle
              cx="100" cy="100" r={RING_R} fill="none" stroke={LED_DEEP}
              strokeWidth="2.5" strokeLinecap="round" initial={false}
              animate={{ pathLength: isWashing ? 1 : Math.max(fill, 0.001), opacity: arcVisible ? 1 : 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 30 }}
            />
            {/* Wash-complete: one bright full-circle sweep, then unmounts. */}
            {sweepKey > 0 ? (
              <motion.circle
                key={`sweep-${sweepKey}`}
                cx="100" cy="100" r={RING_R} fill="none" stroke={LED_BRIGHT}
                strokeWidth="3.4" strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 5px ${LED})` }}
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                transition={{
                  pathLength: { duration: 0.6, ease: "easeInOut" },
                  opacity: { duration: 0.9, times: [0, 0.65, 1] },
                }}
                onAnimationComplete={onSweepDone}
              />
            ) : null}
          </g>
          {/* Comet flash at the new arc tip when fill rises — unmounts once
              faded. */}
          {comet ? (
            <motion.circle
              key={comet.key}
              cx={comet.x} cy={comet.y} r="3" fill={LED_BRIGHT}
              style={{ filter: "blur(0.5px)" }}
              initial={{ opacity: 1 }} animate={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              onAnimationComplete={() => setComet(null)}
            />
          ) : null}
        </svg>
      </div>

      {/* Washing — 30° chase segment orbiting the lit ring (transform loop). */}
      <AnimatePresence>
        {isWashing && !reduce ? (
          <motion.div
            key="chase"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[7]"
            initial={{ opacity: 0 }} animate={{ opacity: 1, rotate: 360 }} exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.4 }, rotate: { duration: 2.4, repeat: Infinity, ease: "linear" } }}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full">
              {/* Underlaid glow twin — replaces drop-shadow in the rotate loop. */}
              <circle cx="100" cy="100" r={RING_R} fill="none" stroke={LED_GLOW_SOFT} strokeWidth="7" strokeLinecap="round" pathLength={1} strokeDasharray="0.085 0.915" />
              <circle cx="100" cy="100" r={RING_R} fill="none" stroke={LED_BRIGHT} strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray="0.085 0.915" />
            </svg>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/* ---------------------------------------------------------------- main --- */

export function Draft6({
  units, fill, spinCount, total, loadsDone, pileStyle, isWashing, degraded = false,
}: WasherDraftProps) {
  const reduce = useReducedMotion() ?? false;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  // Idle-only loops + caustic sleep in compare grid / off-screen / reduce.
  const calm = reduce || degraded || !inView;
  const shake = isWashing && !reduce;

  // "Load banked" burst — shared handshake, see {@link useLoadBurst}.
  const { machineRef, ledRef, portholeRef, burst, popKey, completeBurst } =
    useLoadBurst(units, isWashing);

  // Onyx wash-end ring sweep, keyed off the same burst so ring and ceremony
  // always fire together ("adjust state during render" pattern, no effect).
  const [ringSweep, setRingSweep] = useState(0);
  const [prevBurstKey, setPrevBurstKey] = useState(0);
  if (burst && burst.key !== prevBurstKey) {
    setPrevBurstKey(burst.key);
    setRingSweep(burst.key);
  }

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-[19rem]">
      {/* Hidden defs — the ONE feTurbulence in this draft (water caustic). */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id={`${uid}-caustic`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="1" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="6" />
          </filter>
        </defs>
      </svg>

      {/* Porcelain body */}
      <motion.div
        ref={machineRef}
        className="relative overflow-visible rounded-[1.9rem] p-3 pb-5"
        style={{ boxShadow: "0 14px 30px -12px rgba(15,28,26,.45)" }}
        animate={shake ? { x: [0, -1.5, 1.5, -1.5, 1.5, 0], y: [0, 1, -1, 1, -1, 0] } : { x: 0, y: 0 }}
        transition={shake ? { duration: 0.35, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      >
        {/* Enamel layers — eggshell in light, charcoal-porcelain in dark. */}
        <div
          className="absolute inset-0 rounded-[1.9rem] dark:hidden"
          aria-hidden="true"
          style={{
            background: "radial-gradient(120% 60% at 30% 0%, rgba(255,255,255,.7), transparent 60%), linear-gradient(178deg, #f7f6f2, #e9e8e2 55%, #dddcd5)",
            boxShadow: "inset 0 1.5px 0 rgba(255,255,255,.9), inset 0 -2px 3px rgba(90,95,88,.18), inset 0 0 0 1px rgba(120,128,122,.25)",
          }}
        />
        <div
          className="absolute inset-0 hidden rounded-[1.9rem] dark:block"
          aria-hidden="true"
          style={{
            background: "radial-gradient(120% 60% at 30% 0%, rgba(255,255,255,.12), transparent 60%), linear-gradient(178deg, #343a37, #2b2f2d 55%, #232725)",
            boxShadow: "inset 0 1.5px 0 rgba(255,255,255,.18), inset 0 -2px 3px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.08)",
          }}
        />
        {/* Front-panel seam grooves. */}
        {[
          "absolute inset-y-4 left-[5px] w-px rounded-full bg-[rgba(90,100,95,.22)] dark:bg-[rgba(0,0,0,.4)]",
          "absolute inset-y-4 right-[5px] w-px rounded-full bg-[rgba(90,100,95,.22)] dark:bg-[rgba(0,0,0,.4)]",
        ].map((cls) => (
          <span key={cls} className={cls} aria-hidden="true" />
        ))}

        {/* Inset control fascia: detergent drawer · LED window · ceramic dial */}
        <div
          className="relative mb-1.5 flex items-center gap-2 rounded-xl px-2 py-1.5"
          style={{ boxShadow: "inset 0 2px 4px rgba(40,50,46,.22), inset 0 -1px 0 rgba(255,255,255,.35)" }}
        >
          {/* Detergent drawer with finger recess + hairline panel gaps. */}
          <div
            className="relative h-9 w-14 shrink-0 rounded-md border border-[rgba(110,120,114,.35)] bg-[#eceeeb] dark:border-[rgba(0,0,0,.45)] dark:bg-[#333937]"
            aria-hidden="true"
          >
            <span
              className="absolute inset-x-2 bottom-1 h-2.5 rounded-b-md rounded-t-[60%]"
              style={{ background: "linear-gradient(180deg, rgba(60,70,66,.35), rgba(30,38,35,.15)), radial-gradient(60% 40% at 50% 0%, rgba(255,255,255,.4), transparent 70%)" }}
            />
            <span className="absolute inset-y-1 left-0 w-px bg-[rgba(70,80,75,.3)] dark:bg-black/40" />
            <span className="absolute inset-y-1 right-0 w-px bg-[rgba(70,80,75,.3)] dark:bg-black/40" />
            <span className="absolute inset-x-1 top-0 h-px bg-[rgba(70,80,75,.3)] dark:bg-black/40" />
          </div>

          {/* LED window — Onyx emissive text. aria-label only, NOT a live
              region: the single live region is the Drum's centre readout. */}
          <div
            ref={ledRef}
            className="relative flex h-9 flex-1 flex-col items-center justify-center overflow-hidden rounded-md bg-[#0c1311] font-mono leading-none"
            style={{ color: LED_TEXT, boxShadow: "inset 0 2px 5px rgba(0,0,0,.75), inset 0 0 0 1px rgba(0,0,0,.6)" }}
            aria-label={
              isWashing ? "Washing full load" : `${loadsDone} wash load${loadsDone === 1 ? "" : "s"} completed`
            }
          >
            {isWashing ? (
              <motion.span
                className="text-[0.65rem] font-bold tracking-[0.3em]"
                animate={reduce ? { opacity: 1 } : { opacity: [1, 0.3, 1] }}
                transition={reduce ? { duration: 0 } : { duration: 0.7, repeat: Infinity }}
              >
                WASH
              </motion.span>
            ) : (
              <>
                <span className="flex items-baseline gap-1">
                  <motion.span
                    key={popKey}
                    className="text-sm font-bold tabular-nums"
                    animate={popKey > 0 && !reduce ? { scale: [1, 1.6, 1] } : { scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    {loadsDone}
                  </motion.span>
                  <span className="text-[0.5rem] font-semibold opacity-80">LOADS</span>
                </span>
                <span className="mt-0.5 text-[0.4rem] font-semibold tracking-[0.2em] opacity-60">DONE</span>
              </>
            )}
            {/* Onyx one-shot flash when the +1 chip lands (opacity anim over
                a static box-shadow — cheap on weak GPUs). */}
            {popKey > 0 && !reduce ? (
              <motion.span
                key={`led-glow-${popKey}`}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-md"
                style={{ boxShadow: `0 0 12px ${LED}, inset 0 0 8px ${LED}` }}
                initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.6, times: [0, 0.3, 1], ease: "easeOut" }}
              />
            ) : null}
            {/* Diagonal glare stripe across the smoked window (always on). */}
            <span
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
              style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,.09) 42%, rgba(255,255,255,.16) 48%, rgba(255,255,255,.09) 54%, transparent 66%)" }}
            />
            {/* Wash-time glare boost — a second stripe fading 0..1 on top. */}
            <motion.span
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
              style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,.05) 42%, rgba(255,255,255,.1) 48%, rgba(255,255,255,.05) 54%, transparent 66%)" }}
              initial={false} animate={{ opacity: isWashing ? 1 : 0 }} transition={{ duration: 0.4 }}
            />
          </div>

          <CeramicDial />
        </div>

        {/* Debossed enamel button strip — program names pressed straight into
            the porcelain, not add-on hardware. */}
        <div className="relative mb-3 flex items-center justify-center gap-2" aria-hidden="true">
          {["ECO", "RINSE", "SPIN"].map((label) => (
            <span
              key={label}
              className="rounded-full px-2.5 py-[3px] text-[0.45rem] font-bold tracking-[0.18em] text-[#7d8a84] dark:text-[#8d9a94]"
              style={{
                boxShadow: "inset 0 1.5px 2.5px rgba(40,50,46,.28), inset 0 -1px 0 rgba(255,255,255,.35)",
                textShadow: "0 -1px 0 rgba(0,0,0,.2), 0 1px 0 rgba(255,255,255,.45)",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Door assembly — Draft 3 "Smart Onyx" door: concealed hinge crease,
            conic chrome trim + rubber boot rings, flush recessed pull-handle. */}
        <div ref={portholeRef} className="relative">
          {/* Concealed hinge — vertical shadow crease hugging the trim edge. */}
          <span
            aria-hidden="true"
            className="absolute left-[2px] top-1/2 z-10 h-10 w-[2px] -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.55)_30%,rgba(0,0,0,0.55)_70%,transparent)]"
          />
          {/* Flush recessed pull-handle groove, right edge of the door. */}
          <span
            aria-hidden="true"
            className="absolute right-[4px] top-1/2 z-10 h-16 w-[5px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(0,0,0,0.55),rgba(0,0,0,0.2))] shadow-[inset_0_-1px_0_rgba(255,255,255,0.16),inset_0_1px_1px_rgba(0,0,0,0.8)]"
          />
          {/* Door-lock LED — Onyx emissive during a wash (static shadow,
              opacity pulse only), dull grey when idle. */}
          <motion.span
            className="pointer-events-none absolute right-[12px] top-[26%] z-10 size-[5px] rounded-full"
            aria-hidden="true"
            style={{
              background: isWashing ? LED_BRIGHT : "#4d5450",
              boxShadow: isWashing ? `0 0 6px 1px ${LED}` : "none",
            }}
            animate={isWashing && !reduce ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
            transition={isWashing && !reduce ? { duration: 1.4, repeat: Infinity } : { duration: 0 }}
          />

          {/* Door drop shadow onto the enamel. */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            aria-hidden="true"
            style={{ boxShadow: "0 6px 18px rgba(15,28,26,.28)" }}
          />

          {/* Chrome door trim — conic annulus with a settle pulse at lock. */}
          <motion.div
            className="relative rounded-full p-[13px] bg-[conic-gradient(from_210deg,#3a3f46,#c8cdd3_18%,#4a4f56_35%,#181b1f_52%,#9ea4ab_70%,#31353b_88%,#3a3f46)] shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_4px_10px_rgba(0,0,0,0.45)]"
            animate={isWashing && !reduce ? { scale: [1, 1.008, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Rubber boot gasket — matte near-black ring. */}
            <div className="rounded-full bg-[#101215] p-[6px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9),inset_0_-1px_1px_rgba(255,255,255,0.04)]">
              <div className="relative overflow-hidden rounded-full shadow-[inset_0_0_18px_rgba(0,0,0,0.22)]">
                {/* The porthole interior — untouched contract. */}
                <Drum
                  units={units} fill={fill} spinCount={spinCount} total={total}
                  loadsDone={loadsDone} pileStyle={pileStyle} isWashing={isWashing}
                />

                {/* Recessed cavity depth shadows over the drum edge. */}
                <div
                  className="pointer-events-none absolute inset-1 z-[4] rounded-full"
                  aria-hidden="true"
                  style={{ boxShadow: "inset 0 16px 26px rgba(8,20,17,.38), inset 0 -8px 16px rgba(255,255,255,.14), inset 0 0 0 1px rgba(0,0,0,.15)" }}
                />

                {/* Stainless hardware behind the glass. */}
                <div className="pointer-events-none absolute inset-0 z-[3]">
                  <DrumHardware isWashing={isWashing} reduce={reduce} uid={uid} />
                </div>

                {/* Wash water + condensation, draining on wash end. */}
                <div className="pointer-events-none absolute inset-0 z-[4]">
                  <AnimatePresence>
                    {isWashing ? <WaterSlosh key="water" fill={fill} reduce={reduce} causticOff={calm} uid={uid} /> : null}
                  </AnimatePresence>
                  <AnimatePresence>
                    {isWashing ? <Condensation key="fog" reduce={reduce} /> : null}
                  </AnimatePresence>
                </div>

                {/* Fixed glass optics — idle-only loops (lens drift, droplet)
                    → calm. */}
                <div className="pointer-events-none absolute inset-0 z-[6]">
                  <GlassOverlay reduce={calm} uid={uid} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Onyx edge-lit LED ring seated in the trim/gasket gap. */}
          <OnyxRing
            fill={fill} isWashing={isWashing} reduce={reduce} calm={calm}
            sweepKey={ringSweep} onSweepDone={() => setRingSweep(0)}
          />
        </div>

        {/* Embossed stamped-enamel nameplate. */}
        <div className="relative mt-3 text-center text-[0.6rem] font-extrabold tracking-[0.3em] text-[#6d7a74] [text-shadow:0_1px_0_rgba(255,255,255,.85),0_-1px_0_rgba(0,0,0,.25)] dark:text-[#9aa8a2] dark:[text-shadow:0_1px_0_rgba(255,255,255,.1),0_-1px_0_rgba(0,0,0,.55)]">
          SILAYAN
        </div>

        {/* Kick panel with service hatch + screw dots. */}
        <div
          className="relative mt-2 h-3 rounded-b-xl"
          aria-hidden="true"
          style={{ background: "linear-gradient(180deg, rgba(60,70,65,.14), rgba(40,48,44,.22))", boxShadow: "inset 0 1px 1px rgba(0,0,0,.15)" }}
        >
          <span className="absolute left-3 top-1/2 size-[3px] -translate-y-1/2 rounded-full bg-[rgba(50,60,55,.5)]" />
          <span className="absolute right-3 top-1/2 size-[3px] -translate-y-1/2 rounded-full bg-[rgba(50,60,55,.5)]" />
          <span className="absolute left-1/2 top-1/2 h-[6px] w-9 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-[rgba(35,44,40,.18)]" />
        </div>

        {/* "Load banked" burst: glyphs erupt from the porthole, a +1 chip
            flies to the LED counter, then the counter pops. */}
        <AnimatePresence>
          {burst ? (
            <LoadBurst
              key={burst.key} origin={burst.origin} target={burst.target}
              icons={burst.icons} onDone={completeBurst}
            />
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Adjustable feet with rubber pads. */}
      {["absolute -bottom-2 left-7 h-3 w-6 rounded-b-md", "absolute -bottom-2 right-7 h-3 w-6 rounded-b-md"].map((cls) => (
        <span
          key={cls} className={cls} aria-hidden="true"
          style={{ background: "linear-gradient(180deg, #aab4af 0%, #8b958f 60%, #2c322f 78%, #232825 100%)" }}
        />
      ))}
      {/* Breathing floor shadow — pre-blurred gradient, compositor-only loop. */}
      <motion.span
        className="absolute -bottom-3 left-1/2 h-2.5 w-[82%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,.28),rgba(0,0,0,.12)_55%,transparent_78%)] dark:bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,.55),rgba(0,0,0,.24)_55%,transparent_78%)]"
        aria-hidden="true"
        animate={calm ? { scale: 1 } : { scale: [1, 1.02, 1] }}
        transition={calm ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
