"use client";

/**
 * Draft 4 — "Skeuomorph Glass". White porcelain-enamel front-loader with
 * heavy tempered-glass door optics: focal-offset SVG lens hot-spot, green
 * glass-edge tint, conic chrome door ring with screw heads, rubber boot
 * gasket, perforated drum wall + rotating lifters, sloshing water tint while
 * a wash runs. Highlights stay FIXED while the drum tumbles — the real-glass
 * rule. Chrome appears only on the door ring; the controls are porcelain-
 * native (glazed ceramic dial + debossed enamel button strip), unlike the
 * metal-knob sibling drafts. The existing {@link Drum} renders the porthole
 * interior untouched; every layer here is aria-hidden decoration that never
 * covers the centre readout.
 *
 * RADIAL GEOMETRY (verified at the real 248px porthole: 17rem column − p-3):
 * drum border-box radius 124px, glass interior radius 120px. Outside-in:
 *   chrome ring   119.7–132.6px  (container -inset-[12px] r136, mask 88–97.5%)
 *   boot gasket   112.8–119.7px  (container -inset-[2px]  r126, mask 89.5–96%,
 *                                 chrome hides 119.7+ → ~7px visible band)
 *   bevel light   100.8–108px    (container inset-1 r120, mask 84–90%)
 *   green tint     96.5–99px     (child ring inset-[21px], 2.5px inset stroke)
 * The chrome's opaque inner edge sits ON the glass edge (119.7 ≈ 120): no drum
 * interior is occluded, and the worst-case bottom pile glyph (slot centre
 * r≈117) is grazed only by the translucent gasket rim, never beheaded. Lens
 * hot-spot (0.5 peak) and wash fog (0.18) only brighten the readout chip's
 * white/85 ground — its near-black text keeps its contrast.
 */

import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Drum } from "@/components/designs/tumble-full/Drum";
import { LoadBurst } from "@/components/designs/tumble-full/LoadBurst";
import { useLoadBurst } from "@/components/designs/tumble-full/useLoadBurst";
import { GRAIN_URI, WAVE_PATH, WAVE_PATH_DENSE } from "./draft4Assets";
import type { WasherDraftProps } from "./DraftProps";

/* --- masks (percentages of each layer's closest-side radius, px math above) */

const RING_MASK =
  "radial-gradient(closest-side, transparent 85%, black 88%, black 97.5%, transparent 100%)";
const GASKET_MASK =
  "radial-gradient(closest-side, transparent 87%, black 89.5%, black 96%, transparent 98%)";
const BEVEL_MASK =
  "radial-gradient(closest-side, transparent 81.5%, black 84%, black 90%, transparent 92%)";
const PERF_MASK =
  "radial-gradient(closest-side, transparent 46%, black 64%, black 90%, transparent 99%)";
const TICK_MASK =
  "radial-gradient(closest-side, transparent 88%, black 90%, black 100%)";

const CHROME_CONIC =
  "conic-gradient(from 20deg, #f4f6f5 0deg, #9fa8a4 40deg, #ffffff 72deg, #7e8884 118deg, #eef1f0 158deg, #99a29e 198deg, #fbfdfc 242deg, #838d89 288deg, #f4f6f5 326deg, #c7cecb 344deg, #f4f6f5 360deg)";

const BEVEL_CATCHLIGHT =
  "conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0) 102deg, rgba(240,248,245,.85) 128deg, rgba(255,255,255,0) 162deg, rgba(255,255,255,0) 284deg, rgba(255,255,255,.95) 314deg, rgba(255,255,255,0) 344deg)";

const GASKET_FOLDS =
  "repeating-radial-gradient(circle at 50% 50%, #3c433f 0 2px, #2c322f 2px 4px)";

/** Foam flecks clinging to the waterline ([left %, bob delay s]). */
const FLECKS: ReadonlyArray<[number, number]> = [[16, 0], [47, 0.15], [78, 0.3]];

const SCREW_ANGLES = [45, 135, 225, 315] as const;
const LIFTER_ANGLES = [0, 120, 240] as const;
/** Late-wash condensation streaks running down through the fog. Rest phases
 * are >= 6x the travel duration so each loop duty-cycles mostly idle. */
const STREAKS = [
  { cls: "absolute left-[30%] top-[6%] h-[8px] w-[4px] rounded-full bg-white/60", mid: 34, end: 70, peak: 0.7, dur: 2.2, delay: 3.5, rest: 14 },
  { cls: "absolute left-[58%] top-[4%] h-[7px] w-[3px] rounded-full bg-white/55", mid: 28, end: 62, peak: 0.6, dur: 2.4, delay: 5, rest: 15 },
] as const;
/** Screw orbit: mid-chrome 126px on the 272px ring container → 46.3%. */
const SCREW_ORBIT = 46.3;

/* -------------------------------------------------------------- pieces --- */

/** Slotted chrome screw head sitting on the door ring. */
function ScrewHead({ angle }: { angle: number }) {
  const rad = (angle * Math.PI) / 180;
  const left = 50 + SCREW_ORBIT * Math.cos(rad);
  const top = 50 + SCREW_ORBIT * Math.sin(rad);
  return (
    <span
      aria-hidden="true"
      className="absolute size-[7px] rounded-full"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(circle at 35% 30%, #ffffff, #b9c2be 55%, #6f7975)",
        boxShadow: "0 0.5px 1.5px rgba(0,0,0,.45)",
      }}
    >
      <span
        className="absolute top-1/2 left-1/2 h-px w-[5px] rounded-full"
        style={{
          background: "rgba(40,48,45,.7)",
          transform: `translate(-50%,-50%) rotate(${angle + 30}deg)`,
        }}
      />
    </span>
  );
}

/**
 * Drum hardware drawn over the porthole: perforated stainless back wall
 * (masked to the outer annulus so it fades under the lens hot-spot) and three
 * ghosted lifter paddles. The lifters tumble ONLY while a wash runs — when the
 * pile sits still between loads the drum wall must not visibly spin behind it.
 */
function DrumHardware({ isWashing, reduce, uid }: { isWashing: boolean; reduce: boolean; uid: string }) {
  const tumble = isWashing && !reduce;
  return (
    <div className="pointer-events-none absolute inset-1 overflow-hidden rounded-full" aria-hidden="true">
      {/* Punched drain perforations — dark hole + 0.5px embossed lip each. */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full opacity-50 dark:opacity-60"
        style={{ maskImage: PERF_MASK, WebkitMaskImage: PERF_MASK }}
      >
        <defs>
          <pattern id={`${uid}-perf`} width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="4" r="1" fill="rgba(255,255,255,.5)" />
            <circle cx="3.5" cy="3.5" r="1" fill="rgba(18,28,25,.42)" />
          </pattern>
        </defs>
        <circle cx="50" cy="50" r="50" fill={`url(#${uid}-perf)`} />
      </svg>

      {/* Lifters/baffles at 120° spacing — tumbling only during the wash. */}
      <motion.div
        className="absolute inset-0"
        animate={tumble ? { rotate: [0, 360] } : { rotate: 0 }}
        transition={
          tumble
            ? { duration: 3.6, repeat: Infinity, ease: "linear" }
            : { duration: 0.6, ease: "easeOut" }
        }
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
                fill={`url(#${uid}-steel)`}
                stroke="rgba(60,70,66,.4)"
                strokeWidth="0.4"
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

/**
 * Water tint that sloshes behind the glass while a wash runs. Two parallax
 * sine-wave layers driven by ONE shared x-loop (see {@link WAVE_PATH_DENSE}),
 * a 1px meniscus line with bobbing foam flecks, a counter-tilt against the
 * drum shake, and a STATIC feTurbulence caustic applied ONLY to the layers
 * that never animate (meniscus + water body) so its displacement raster is
 * computed once and cached; the wave/fleck transforms stay compositor-only
 * and provide the wobble (SMIL renders frozen in Chromium, unreliable in
 * Safari). Off under reduced/degraded. Drains via scaleY collapse on end.
 */
function WaterSlosh(props: { fill: number; reduce: boolean; degraded: boolean; uid: string }) {
  const { fill, reduce, degraded, uid } = props;
  const heightPct = Math.round(16 + Math.min(1, Math.max(0, fill)) * 34);
  const caustic = reduce || degraded ? undefined : `url(#${uid}-caustic)`;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-1 overflow-hidden rounded-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: reduce ? 0 : 1, scaleY: 0 }}
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
          {/* Meniscus — static, so the caustic rasters once and caches. */}
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: "color-mix(in oklch, var(--chart-2) 45%, white)", opacity: 0.7, filter: caustic }}
          />
          {/* Parallax waves — one 11s x-loop, two tile densities = two
              apparent speeds. Unfiltered: transforms stay compositor-only. */}
          <motion.div
            className="absolute -top-[11px] left-0 h-[12px] w-[200%]"
            animate={reduce ? { x: 0 } : { x: ["0%", "-50%"] }}
            transition={reduce ? { duration: 0 } : { duration: 11, repeat: Infinity, ease: "linear" }}
          >
            <svg viewBox="0 0 200 22" preserveAspectRatio="none" className="h-full w-full">
              <path d={WAVE_PATH} fill="var(--chart-2)" opacity={0.18} />
            </svg>
            <svg viewBox="0 0 300 22" preserveAspectRatio="none" className="absolute left-[-7%] top-[2px] h-[10px] w-full">
              <path d={WAVE_PATH_DENSE} fill="var(--chart-2)" opacity={0.3} />
            </svg>
          </motion.div>
          {/* Water body — static, caustic raster computed once and cached. */}
          <div
            className="absolute inset-0"
            style={{ background: "var(--chart-2)", opacity: 0.28, filter: caustic }}
          />
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

/** Wash fog at the glass top + late droplet streaks. Kept weak (peak 0.18,
 * gone by 30% height) so the readout chip beneath only brightens. */
function Condensation({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-1 overflow-hidden rounded-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 2 }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[30%] blur-[6px]"
        style={{
          background:
            "radial-gradient(80% 90% at 50% 0%, rgba(255,255,255,.18), rgba(255,255,255,0) 75%)",
        }}
      />
      {!reduce
        ? STREAKS.map((s) => (
            <motion.span
              key={s.cls}
              className={s.cls}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [0, s.mid, s.end], opacity: [0, s.peak, 0] }}
              transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, repeatDelay: s.rest, ease: "easeIn" }}
            />
          ))
        : null}
    </motion.div>
  );
}

/** Convex tempered-glass overlay: drifting focal-offset lens hot-spot (peak
 * 0.5 so the readout chip beneath never washes out), static vignette +
 * counter-highlight arc, green edge tint, bevel catch-light, idle droplet.
 * Highlights never rotate — they belong to the glass, not the drum. */
function GlassOverlay({ reduce, degraded, uid }: { reduce: boolean; degraded: boolean; uid: string }) {
  const still = reduce || degraded;
  return (
    <div className="pointer-events-none absolute inset-1 overflow-hidden rounded-full" aria-hidden="true">
      {/* Focal-offset lens hot-spot — reads as curved glass. Drifts ~2%
          (held at rest when degraded/reduced). */}
      <motion.div
        className="absolute inset-0"
        animate={still ? { x: 0, y: 0 } : { x: ["0%", "2%", "0%"], y: ["0%", "1.5%", "0%"] }}
        transition={still ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: "easeInOut" }}
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
        style={{
          background:
            "radial-gradient(closest-side at 50% 50%, rgba(0,0,0,0) 55%, rgba(10,25,22,.28) 100%), radial-gradient(30% 18% at 72% 82%, rgba(255,255,255,.18), rgba(255,255,255,0) 70%)",
        }}
      />
      {/* Extra dark-theme highlight lift so glass still reads on charcoal. */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "radial-gradient(36% 24% at 26% 18%, rgba(255,255,255,.2), rgba(255,255,255,0) 70%)",
        }}
      />
      {/* Green soda-lime edge tint — its own ring INSIDE the bevel band so the
          chrome/gasket stack can never cover it (see geometry table above). */}
      <div
        className="absolute inset-[21px] rounded-full"
        style={{ boxShadow: "inset 0 0 0 2.5px rgba(120,175,160,.45)" }}
      />
      {/* Beveled rim catch-light at 10–11 and 4–5 o'clock. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: BEVEL_CATCHLIGHT,
          maskImage: BEVEL_MASK,
          WebkitMaskImage: BEVEL_MASK,
          opacity: 0.8,
        }}
      />
      {/* Idle stray droplet running down the inside of the glass. */}
      {!still ? (
        <motion.span
          className="absolute left-[38%] top-[16%] h-[7px] w-[5px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, rgba(255,255,255,.95), rgba(210,230,225,.4) 60%, rgba(180,200,195,.12))",
          }}
          initial={{ y: 0, x: 0, opacity: 0 }}
          animate={{ y: [0, 46, 104], x: [0, 4, -3], opacity: [0, 0.9, 0] }}
          transition={{ duration: 2.8, delay: 4, repeat: Infinity, repeatDelay: 17, ease: "easeIn" }}
        />
      ) : null}
    </div>
  );
}

/** Glazed ceramic program dial — porcelain-native (no knurl, no brushed cap,
 * unlike the metal-knob siblings): fired porcelain dome, off-centre glaze
 * specular, debossed enamel tick ring, painted underglaze index line. */
function CeramicDial() {
  return (
    <div className="relative size-11 shrink-0" aria-hidden="true">
      {/* Debossed tick marks stamped into the fascia enamel. */}
      <div
        className="absolute -inset-0.5 rounded-full"
        style={{
          background:
            "repeating-conic-gradient(rgba(0,0,0,.28) 0deg 2deg, transparent 2deg 30deg)",
          maskImage: TICK_MASK,
          WebkitMaskImage: TICK_MASK,
        }}
      />
      {/* Fired-porcelain dome, light theme. */}
      <div
        className="absolute inset-0 rounded-full dark:hidden"
        style={{
          background:
            "radial-gradient(circle at 34% 26%, #ffffff, #f2f1ec 42%, #d9d8d0 76%, #c3c2b9)",
          boxShadow:
            "0 1.5px 3px rgba(20,30,27,.3), inset 0 -2px 3px rgba(90,95,88,.28), inset 0 1px 0 rgba(255,255,255,.9)",
        }}
      />
      {/* Charcoal-porcelain dome, dark theme. */}
      <div
        className="absolute inset-0 hidden rounded-full dark:block"
        style={{
          background:
            "radial-gradient(circle at 34% 26%, #4c534f, #3a403d 42%, #2c312e 76%, #242826)",
          boxShadow:
            "0 1.5px 3px rgba(0,0,0,.5), inset 0 -2px 3px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.16)",
        }}
      />
      {/* Wet glaze specular — small hard ellipse high-left. */}
      <span
        className="absolute left-[26%] top-[18%] h-[6px] w-[9px] -rotate-[24deg] rounded-[50%] bg-white/85 blur-[0.5px] dark:bg-white/40"
      />
      {/* Painted underglaze index line — palette accent, soft edge like a
          brush stroke under the glaze rather than a machined metal slot. */}
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

/* ---------------------------------------------------------------- main --- */

export function Draft4({
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
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const shake = isWashing && !reduce;
  // Decoration-only quiet flag: degraded (compare-all grid) drops idle loops +
  // filter rasters but keeps the wash choreography (shake, water rise, suds).
  const still = reduce || degraded;

  // "Load banked" burst — shared handshake, see {@link useLoadBurst}.
  const { machineRef, ledRef, portholeRef, burst, popKey, completeBurst } =
    useLoadBurst(units, isWashing);

  return (
    <div className="relative mx-auto w-full max-w-[17rem]">
      {/* Hidden SVG defs: static caustic displacement, referenced only by the
          non-animating water layers (raster caches). Skipped when degraded or
          reduced. (No SMIL on purpose — see the WaterSlosh doc comment.) */}
      {!still ? (
        <svg className="absolute h-0 w-0" aria-hidden="true">
          <defs>
            <filter id={`${uid}-caustic`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="1" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="6" />
            </filter>
          </defs>
        </svg>
      ) : null}

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
            background:
              "radial-gradient(120% 60% at 30% 0%, rgba(255,255,255,.7), transparent 60%), linear-gradient(178deg, #f7f6f2, #e9e8e2 55%, #dddcd5)",
            boxShadow:
              "inset 0 1.5px 0 rgba(255,255,255,.9), inset 0 -2px 3px rgba(90,95,88,.18), inset 0 0 0 1px rgba(120,128,122,.25)",
          }}
        />
        <div
          className="absolute inset-0 hidden rounded-[1.9rem] dark:block"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(120% 60% at 30% 0%, rgba(255,255,255,.12), transparent 60%), linear-gradient(178deg, #343a37, #2b2f2d 55%, #232725)",
            boxShadow:
              "inset 0 1.5px 0 rgba(255,255,255,.18), inset 0 -2px 3px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.08)",
          }}
        />
        {/* Enamel micro-grain — baked tiled noise PNG (no feTurbulence). */}
        <div
          className="absolute inset-0 rounded-[1.9rem] opacity-[0.04]"
          aria-hidden="true"
          style={{ backgroundImage: `url(${GRAIN_URI})`, backgroundRepeat: "repeat" }}
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
          style={{
            boxShadow:
              "inset 0 2px 4px rgba(40,50,46,.22), inset 0 -1px 0 rgba(255,255,255,.35)",
          }}
        >
          {/* Detergent drawer with finger recess + hairline panel gaps. */}
          <div
            className="relative h-9 w-14 shrink-0 rounded-md border border-[rgba(110,120,114,.35)] bg-[#eceeeb] dark:border-[rgba(0,0,0,.45)] dark:bg-[#333937]"
            aria-hidden="true"
          >
            <span
              className="absolute inset-x-2 bottom-1 h-2.5 rounded-b-md rounded-t-[60%]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(60,70,66,.35), rgba(30,38,35,.15)), radial-gradient(60% 40% at 50% 0%, rgba(255,255,255,.4), transparent 70%)",
              }}
            />
            <span className="absolute inset-y-1 left-0 w-px bg-[rgba(70,80,75,.3)] dark:bg-black/40" />
            <span className="absolute inset-y-1 right-0 w-px bg-[rgba(70,80,75,.3)] dark:bg-black/40" />
            <span className="absolute inset-x-1 top-0 h-px bg-[rgba(70,80,75,.3)] dark:bg-black/40" />
          </div>

          {/* LED window recessed behind smoked plastic — loads readout. */}
          <div
            ref={ledRef}
            className="relative flex h-9 flex-1 flex-col items-center justify-center overflow-hidden rounded-md bg-[#0c1311] font-mono leading-none"
            style={{
              color: "color-mix(in oklch, var(--chart-2) 65%, white)",
              boxShadow: "inset 0 2px 5px rgba(0,0,0,.75), inset 0 0 0 1px rgba(0,0,0,.6)",
            }}
            aria-label={
              isWashing
                ? "Washing full load"
                : `${loadsDone} wash load${loadsDone === 1 ? "" : "s"} completed`
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
                <span className="mt-0.5 text-[0.4rem] font-semibold tracking-[0.2em] opacity-60">
                  DONE
                </span>
              </>
            )}
            {/* Diagonal glare stripe across the smoked window (always on). */}
            <span
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
              style={{
                background:
                  "linear-gradient(115deg, transparent 30%, rgba(255,255,255,.09) 42%, rgba(255,255,255,.16) 48%, rgba(255,255,255,.09) 54%, transparent 66%)",
              }}
            />
            {/* Wash-time glare boost — a second stripe fading 0..1 on top. */}
            <motion.span
              className="pointer-events-none absolute inset-0"
              aria-hidden="true"
              style={{
                background:
                  "linear-gradient(115deg, transparent 30%, rgba(255,255,255,.05) 42%, rgba(255,255,255,.1) 48%, rgba(255,255,255,.05) 54%, transparent 66%)",
              }}
              initial={false}
              animate={{ opacity: isWashing ? 1 : 0 }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <CeramicDial />
        </div>

        {/* Debossed enamel button strip — program names pressed straight into
            the porcelain (recess shadow + reversed emboss on the lettering),
            not add-on hardware. Porcelain-native control vocabulary. */}
        <div className="relative mb-3 flex items-center justify-center gap-2" aria-hidden="true">
          {["ECO", "RINSE", "SPIN"].map((label) => (
            <span
              key={label}
              className="rounded-full px-2.5 py-[3px] text-[0.45rem] font-bold tracking-[0.18em] text-[#7d8a84] dark:text-[#8d9a94]"
              style={{
                boxShadow:
                  "inset 0 1.5px 2.5px rgba(40,50,46,.28), inset 0 -1px 0 rgba(255,255,255,.35)",
                textShadow: "0 -1px 0 rgba(0,0,0,.2), 0 1px 0 rgba(255,255,255,.45)",
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Door assembly */}
        <div ref={portholeRef} className="relative">
          {/* Cast two-piece hinge with pivot pin + shadow gap — peeks out past
              the chrome ring's outer edge (~9px beyond the porthole box). */}
          <div
            className="pointer-events-none absolute left-[-13px] top-1/2 z-20 -translate-y-1/2"
            aria-hidden="true"
          >
            {["block h-7 w-[7px] rounded-l-md", "mt-4 block h-7 w-[7px] rounded-l-md"].map((cls) => (
              <span
                key={cls}
                className={cls}
                style={{
                  background: "linear-gradient(90deg, #cdd4d1, #9aa8a3 70%, #7e8884)",
                  boxShadow: "1px 0 1.5px rgba(20,30,27,.35)",
                }}
              />
            ))}
            <span
              className="absolute inset-y-1 left-[2px] w-[2px] rounded-full"
              style={{ background: "linear-gradient(180deg, #f2f5f4, #8b958f)" }}
            />
          </div>

          {/* Door-ring drop shadow onto the enamel (separate unmasked disc). */}
          <div
            className="pointer-events-none absolute -inset-[12px] rounded-full"
            aria-hidden="true"
            style={{ boxShadow: "0 6px 18px rgba(15,28,26,.28)" }}
          />
          {/* Chrome door ring — conic sheen wedges masked to a NARROW annulus
              whose opaque inner edge (119.7px) sits on the glass edge (120px):
              it laps only the drum's own border, so gasket, bevel light, green
              tint, and the pile all stay visible inside it. */}
          <div
            className="pointer-events-none absolute -inset-[12px] z-10 rounded-full"
            aria-hidden="true"
            style={{
              background: CHROME_CONIC,
              maskImage: RING_MASK,
              WebkitMaskImage: RING_MASK,
            }}
          />
          {/* Occasional glint sweeping around the chrome ring. */}
          {!still ? (
            <motion.div
              className="pointer-events-none absolute -inset-[12px] z-10 rounded-full"
              aria-hidden="true"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,.85) 8deg, transparent 22deg)",
                maskImage: RING_MASK,
                WebkitMaskImage: RING_MASK,
                mixBlendMode: "screen",
              }}
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: [0, 360], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 19, ease: "easeInOut" }}
            />
          ) : null}
          {/* Screw heads on the ring. */}
          <div className="pointer-events-none absolute -inset-[12px] z-10" aria-hidden="true">
            {SCREW_ANGLES.map((a) => (
              <ScrewHead key={a} angle={a} />
            ))}
          </div>

          {/* Rubber boot gasket — concentric bellows folds, darker at bottom.
              Visible band 112.8–119.7px: a ~7px rubber rim between the glass
              edge and the chrome's inner lip. Translucent, so the outermost
              corner of an edge pile glyph dims slightly but is never cut off. */}
          <div
            className="pointer-events-none absolute -inset-[2px] z-[5] rounded-full"
            aria-hidden="true"
            style={{
              background: `linear-gradient(0deg, rgba(0,0,0,.28), transparent 40%), ${GASKET_FOLDS}`,
              maskImage: GASKET_MASK,
              WebkitMaskImage: GASKET_MASK,
              opacity: 0.85,
            }}
          />

          {/* The porthole interior — untouched contract. */}
          <Drum
            units={units}
            fill={fill}
            spinCount={spinCount}
            total={total}
            loadsDone={loadsDone}
            pileStyle={pileStyle}
            isWashing={isWashing}
          />

          {/* Recessed cavity depth shadows over the drum edge. */}
          <div
            className="pointer-events-none absolute inset-1 z-[4] rounded-full"
            aria-hidden="true"
            style={{
              boxShadow:
                "inset 0 16px 26px rgba(8,20,17,.38), inset 0 -8px 16px rgba(255,255,255,.14), inset 0 0 0 1px rgba(0,0,0,.15)",
            }}
          />

          {/* Stainless hardware behind the glass. */}
          <div className="pointer-events-none absolute inset-0 z-[3]">
            <DrumHardware isWashing={isWashing} reduce={reduce} uid={uid} />
          </div>

          {/* Wash water + condensation, draining on wash end. */}
          <div className="pointer-events-none absolute inset-0 z-[4]">
            <AnimatePresence>
              {isWashing ? <WaterSlosh key="water" fill={fill} reduce={reduce} degraded={degraded} uid={uid} /> : null}
            </AnimatePresence>
            <AnimatePresence>
              {isWashing ? <Condensation key="fog" reduce={reduce} /> : null}
            </AnimatePresence>
          </div>

          {/* Fixed glass optics — always the top transparent layer. */}
          <div className="pointer-events-none absolute inset-0 z-[6]">
            <GlassOverlay reduce={reduce} degraded={degraded} uid={uid} />
          </div>

          {/* Recessed door-handle scoop at 3 o'clock with fingertip catch-light. */}
          <div
            className="pointer-events-none absolute right-[-11px] top-1/2 z-20 h-14 w-[11px] -translate-y-1/2 rounded-full"
            aria-hidden="true"
            style={{
              background:
                "linear-gradient(90deg, rgba(30,40,36,.45), rgba(15,24,21,.6) 55%, rgba(40,50,46,.4)), linear-gradient(180deg, rgba(255,255,255,.5), transparent 22%)",
              boxShadow:
                "inset 0 2px 3px rgba(0,0,0,.5), inset 0 -1px 1px rgba(255,255,255,.15), 0 1px 2px rgba(255,255,255,.25)",
            }}
          />
          {/* Door-lock LED — amber, pulsing during a wash. */}
          <motion.span
            className="pointer-events-none absolute right-[-6px] top-[24%] z-20 size-[5px] rounded-full"
            aria-hidden="true"
            style={{
              background: isWashing ? "#f0a83c" : "#5c5346",
              boxShadow: isWashing ? "0 0 6px 1px rgba(240,168,60,.7)" : "none",
            }}
            animate={isWashing && !reduce ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
            transition={isWashing && !reduce ? { duration: 1.4, repeat: Infinity } : { duration: 0 }}
          />
        </div>

        {/* Embossed stamped-enamel nameplate — soft emboss on dark charcoal. */}
        <div className="relative mt-3 text-center text-[0.6rem] font-extrabold tracking-[0.3em] text-[#6d7a74] [text-shadow:0_1px_0_rgba(255,255,255,.85),0_-1px_0_rgba(0,0,0,.25)] dark:text-[#9aa8a2] dark:[text-shadow:0_1px_0_rgba(255,255,255,.1),0_-1px_0_rgba(0,0,0,.55)]">
          SILAYAN
        </div>

        {/* Kick panel with service hatch + screw dots. */}
        <div
          className="relative mt-2 h-3 rounded-b-xl"
          aria-hidden="true"
          style={{
            background: "linear-gradient(180deg, rgba(60,70,65,.14), rgba(40,48,44,.22))",
            boxShadow: "inset 0 1px 1px rgba(0,0,0,.15)",
          }}
        >
          <span className="absolute left-3 top-1/2 size-[3px] -translate-y-1/2 rounded-full bg-[rgba(50,60,55,.5)]" />
          <span className="absolute right-3 top-1/2 size-[3px] -translate-y-1/2 rounded-full bg-[rgba(50,60,55,.5)]" />
          <span className="absolute left-1/2 top-1/2 h-[6px] w-9 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-[rgba(35,44,40,.18)]" />
        </div>

        {/* "Load banked" burst: glyphs erupt from the porthole, a +1 chip flies
            to the LED counter, then the counter pops. */}
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

      {/* Adjustable feet with rubber pads. */}
      {["absolute -bottom-2 left-7 h-3 w-6 rounded-b-md", "absolute -bottom-2 right-7 h-3 w-6 rounded-b-md"].map((cls) => (
        <span
          key={cls}
          className={cls}
          aria-hidden="true"
          style={{
            background: "linear-gradient(180deg, #aab4af 0%, #8b958f 60%, #2c322f 78%, #232825 100%)",
          }}
        />
      ))}
      {/* Breathing elliptical contact shadow — pre-blurred radial gradient
          (no CSS filter, scale is pure compositor); breathes only while
          washing (a 2% scale change at rest is invisible). */}
      <motion.span
        className="absolute -bottom-3 left-1/2 h-2.5 w-[82%] -translate-x-1/2 rounded-[50%] [background:radial-gradient(50%_50%,rgba(0,0,0,.28),rgba(0,0,0,0)_70%)] dark:[background:radial-gradient(50%_50%,rgba(0,0,0,.55),rgba(0,0,0,0)_70%)]"
        aria-hidden="true"
        animate={!still && isWashing ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={
          !still && isWashing
            ? { duration: 6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      />
    </div>
  );
}
