"use client";

/**
 * Draft 3 — "Smart Onyx".
 *
 * Modern premium smart washer: near-black glass fascia inside a machined
 * aluminum frame, edge-lit LED progress ring seated between the chrome door
 * trim and the rubber gasket, capacitive touch-glyph strip with an OLED
 * status window, flush recessed handle, concealed hinge, and a soft ambient
 * underglow while a full load washes. Realism is carried by seams, gaskets
 * and reflections (gradients + inline SVG only — no images, no new deps).
 *
 * The existing {@link Drum} renders untouched as the porthole interior; all
 * chrome here frames it without covering its upper-center readout. Wash
 * completion fires the shared {@link LoadBurst} ceremony — glyphs erupt from
 * the porthole and the "+1 LOAD" chip flies into the OLED strip — plus an
 * onyx-native full-ring bright sweep.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Drum } from "@/components/designs/tumble-full/Drum";
import { LoadBurst } from "@/components/designs/tumble-full/LoadBurst";
import { useLoadBurst } from "@/components/designs/tumble-full/useLoadBurst";
import type { WasherDraftProps } from "./DraftProps";

/**
 * Emissive light family — every LED, glyph glow, OLED character, comet and
 * chase segment derives from --chart-2 (like Drum's border) so all 13 palette
 * themes retint the whole machine, not just the ring. Each tier mixes the
 * accent with plain white ONLY (no fixed cyan hexes) — the hue always comes
 * from the palette, white just sets the emissive brightness tier, so warm/red
 * themes read warm instead of being dragged back toward blue.
 */
const LED = "color-mix(in oklch, var(--chart-2) 75%, white)";
const LED_DEEP = "color-mix(in oklch, var(--chart-2) 88%, white)";
const LED_BRIGHT = "color-mix(in oklch, var(--chart-2) 35%, white)";
const LED_TEXT = "color-mix(in oklch, var(--chart-2) 55%, white)";

/** OLED ticker swap cadence while washing. */
const TICKER_MS = 3000;

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Touch-strip glyphs — inline SVG, currentColor so tint is one style */
/* ------------------------------------------------------------------ */

type GlyphState = "idle" | "dim" | "live";

const GLYPH_CLASS = "size-3.5 transition-colors duration-300";

function glyphStyle(state: GlyphState): CSSProperties {
  if (state === "live") {
    return { color: LED_TEXT, filter: `drop-shadow(0 0 5px ${LED})` };
  }
  if (state === "dim") return { color: "rgba(255,255,255,0.15)" };
  return { color: "rgba(255,255,255,0.25)" };
}

type GlyphProps = { className: string; style?: CSSProperties };

function PowerGlyph({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 3v8" />
      <path d="M7.2 6.6a7 7 0 1 0 9.6 0" />
    </svg>
  );
}

function TempGlyph({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 4a2 2 0 0 1 2 2v7.2a4.2 4.2 0 1 1-4 0V6a2 2 0 0 1 2-2Z" />
      <path d="M12 11v5" />
    </svg>
  );
}

function SpinGlyph({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1" />
      <path d="M17.5 3.5v3.6h-3.6" />
      <path d="M19.5 12a7.5 7.5 0 0 1-13 5.1" />
      <path d="M6.5 20.5v-3.6h3.6" />
    </svg>
  );
}

function TimerGlyph({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 10v3.5l2.3 2.3" />
      <path d="M9.5 3h5" />
    </svg>
  );
}

function WifiGlyph({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4.5 11.5a11 11 0 0 1 15 0" />
      <path d="M8 15a6.5 6.5 0 0 1 8 0" />
      <circle cx="12" cy="18.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LockGlyph({ className, style }: GlyphProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="5.5" y="11" width="13" height="9" rx="2" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */

const OLED_TEXT_CLASS =
  "font-light text-[0.55rem] leading-none tracking-[0.35em] tabular-nums whitespace-nowrap opacity-90";

export function Draft3({
  units,
  fill,
  spinCount,
  total,
  loadsDone,
  pileStyle,
  isWashing,
  degraded = false,
}: WasherDraftProps) {
  const reduce = useReducedMotion();
  const shake = isWashing && !reduce;
  // Compare-all grid: treat idle-only infinite loops like reduced motion
  // (static variants) while keeping every wash animation.
  const calmIdle = reduce || degraded;

  // OLED wash ticker — interval runs only while a wash runs (and never under
  // reduced motion), resetting each cycle. Alternates "WASHING · FULL LOAD"
  // with a live elapsed-time frame every {@link TICKER_MS}.
  const [tick, setTick] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!isWashing || reduce) return;
    const start = Date.now();
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setElapsedMs(Date.now() - start);
    }, TICKER_MS);
    return () => {
      clearInterval(id);
      setTick(0);
      setElapsedMs(0);
    };
  }, [isWashing, reduce]);

  // Comet flash at the LED arc tip whenever fill rises (fade-only — fine
  // under reduced motion since it is event-driven, not a loop).
  const prevFill = useRef(fill);
  const [comet, setComet] = useState<{ key: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const rose = fill > prevFill.current;
    prevFill.current = fill;
    if (!rose) return;
    const a = ((fill * 360 - 90) * Math.PI) / 180;
    const next = {
      key: Date.now(),
      x: 100 + 89 * Math.cos(a),
      y: 100 + 89 * Math.sin(a),
    };
    const frame = requestAnimationFrame(() => setComet(next));
    return () => cancelAnimationFrame(frame);
  }, [fill]);

  // --- "load banked" ceremony: fires the instant a wash finishes (isWashing
  // true -> false). Glyphs erupt from the porthole, a "+1 LOAD" chip flies
  // into the OLED strip (which then pops), and the LED ring does one bright
  // full-circle sweep. Shared handshake with the baseline WashingMachine —
  // see {@link useLoadBurst}. Never fires under reduced motion. The machine
  // frame takes machineRef, the OLED strip takes ledRef.
  const { machineRef, ledRef, portholeRef, burst, popKey, completeBurst } =
    useLoadBurst(units, isWashing);

  // Offscreen machines stop paying for the roaming sheen loop — the static
  // sheen (the reduce branch) renders instead, pixel-identical at rest.
  const inView = useInView(machineRef);

  // Onyx-native full-ring bright sweep, keyed off the same burst the hook
  // fires so ring and ceremony always trigger together. Uses the sanctioned
  // "adjust state when a prop changes" render pattern (no effect needed).
  const [ringSweep, setRingSweep] = useState(0);
  const [prevBurstKey, setPrevBurstKey] = useState(0);
  if (burst && burst.key !== prevBurstKey) {
    setPrevBurstKey(burst.key);
    setRingSweep(burst.key);
  }

  // Round strokeLinecap renders a lone glowing cap dot at 12 o'clock even at
  // pathLength ~0 — hide both arc layers entirely while the drum is empty.
  const arcVisible = isWashing || fill > 0;

  const statusText = isWashing
    ? reduce
      ? "WASHING"
      : tick % 2 === 1
        ? `CYCLE ${formatElapsed(elapsedMs)}`
        : "WASHING · FULL LOAD"
    : `READY · ${loadsDone} ${loadsDone === 1 ? "LOAD" : "LOADS"}`;

  return (
    <div className="relative mx-auto w-full max-w-[17rem] pb-2">
      {/* Ambient wash underglow — the machine feels lit from within. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-3 left-1/2 h-6 w-3/4 -translate-x-1/2 rounded-full blur-2xl"
        style={{ background: LED_DEEP }}
        animate={
          isWashing && !reduce
            ? { opacity: [0.25, 0.6, 0.25], scaleX: [0.9, 1.05, 0.9] }
            : isWashing
              ? { opacity: 0.4, scaleX: 1 }
              : { opacity: 0.12, scaleX: 1 }
        }
        transition={
          isWashing && !reduce
            ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.4 }
        }
      />
      {/* Contact shadow so the feet carry weight (distinct from the glow). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-1 inset-x-6 h-3 rounded-full bg-black/40 blur-md"
      />

      {/* Machined aluminum frame — 2px gradient wrap, no borders. */}
      <motion.div
        ref={machineRef}
        className="relative rounded-[2rem] p-[2px] bg-[linear-gradient(180deg,#e8eaee,#9ba1a8_18%,#565b62_50%,#8b9198_82%,#dfe2e6)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_24px_rgba(0,0,0,0.35)] dark:bg-[linear-gradient(180deg,#f4f6f9,#aab0b7_18%,#666b72_50%,#9aa0a7_82%,#eceff3)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_28px_rgba(0,0,0,0.6)]"
        animate={
          shake
            ? { x: [0, -1.5, 1.5, -1.5, 1.5, 0], y: [0, 1, -1, 1, -1, 0] }
            : { x: 0, y: 0 }
        }
        transition={
          shake
            ? { duration: 0.35, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      >
        {/* Onyx glass fascia: base gradient + diagonal specular band.
            DELIBERATE: the fascia stays near-black in BOTH themes — that is
            the "Onyx" statement (like a black-stainless appliance on a white
            wall). Theme awareness lives in the frame/glow instead: light mode
            keeps a slightly darker aluminum + soft drop shadow so the black
            body reads as an object on pale cards, while dark: variants
            brighten the aluminum stops and deepen the shadow so the machine
            doesn't vanish into a dark page. LEDs retint via --chart-2 across
            all 13 palettes. */}
        <div className="relative overflow-hidden rounded-[calc(2rem-2px)] bg-[linear-gradient(165deg,#1b1e23_0%,#0b0d11_45%,#12151a_100%)] px-3 pb-5 pt-2">
          {/* Roaming specular sheen — one light source across the sheet.
              Static variant under reduced motion, in the compare-all grid,
              and whenever the machine is offscreen (no idle rAF/GPU layer). */}
          {calmIdle || !inView ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-[-50%] w-[200%] bg-[linear-gradient(115deg,transparent_32%,rgba(255,255,255,0.055)_44%,rgba(255,255,255,0.02)_52%,transparent_64%)]"
            />
          ) : (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-[-50%] w-[200%] bg-[linear-gradient(115deg,transparent_32%,rgba(255,255,255,0.055)_44%,rgba(255,255,255,0.02)_52%,transparent_64%)]"
              animate={{ x: ["-28%", "28%", "-28%"] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Top plate: lighter charcoal lid strip + recessed panel seam. */}
          <div aria-hidden="true" className="relative -mx-3 -mt-2 mb-2">
            <div className="h-[7px] rounded-t-[calc(2rem-2px)] bg-[linear-gradient(180deg,#2d3238,#1e2227)]" />
            <div className="h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]" />
            <div className="h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.6),transparent)]" />
          </div>

          {/* Detergent drawer — flush panel a notch lighter than the fascia
              so the recessed seam actually reads, with a finger notch.
              Geometry note: top-4 + h-4 puts its bottom at y=32; the OLED
              strip's top edge sits at ~y=34 (9px top plate + 8px gap + 10.8px
              badge + 6px gap), leaving ~2px clearance at the 17rem width in
              both themes — keep top/h in sync with the badge stack above. */}
          <div
            aria-hidden="true"
            className="absolute left-3 top-4 h-4 w-12 rounded-[3px] bg-[linear-gradient(180deg,#1e2227,#14171b)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.05)]"
          >
            <span className="absolute bottom-[2px] left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full bg-black/70 shadow-[0_1px_0_rgba(255,255,255,0.08)]" />
          </div>

          {/* Model badge — etched, not printed. */}
          <div className="relative mb-1.5 pr-0.5 text-right text-[0.45rem] font-medium tracking-[0.3em] text-white/30 [text-shadow:0_1px_0_rgba(0,0,0,0.8)]">
            ONYX&nbsp;9
          </div>

          {/* Screen-reader status: text depends ONLY on isWashing so it
              announces wash start / completion and nothing else — per-item
              counts live in the Drum's own live region and the OLED label,
              and repeating them here would double-announce every item add. */}
          <span role="status" className="sr-only">
            {isWashing ? "Washing full load" : "Washer ready"}
          </span>

          {/* Capacitive touch strip: OLED window + backlit glyph row. */}
          <div className="relative mb-1 flex items-center gap-2">
            {/* OLED status window — labelled, but NOT a live region: the
                ticker swaps every 3s during a wash and must not re-announce. */}
            <motion.div
              ref={ledRef}
              role="img"
              aria-label={
                isWashing
                  ? `Washing full load. ${loadsDone} loads completed, ${total} items total.`
                  : `Ready. ${loadsDone} wash ${loadsDone === 1 ? "load" : "loads"} completed, ${total} items total.`
              }
              className="relative flex h-6 flex-1 items-center overflow-hidden rounded-[4px] bg-black px-2 shadow-[inset_0_0_6px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.05)]"
              key={`oled-pop-${popKey}`}
              animate={popKey > 0 && !reduce ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              {/* one-shot glow flash when the +1 chip lands */}
              {popKey > 0 && !reduce ? (
                <motion.span
                  key={`oled-glow-${popKey}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[4px]"
                  style={{ boxShadow: `0 0 12px ${LED}, inset 0 0 8px ${LED}` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.9, 0] }}
                  transition={{ duration: 0.6, times: [0, 0.3, 1], ease: "easeOut" }}
                />
              ) : null}
              <span aria-hidden="true" className="contents">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={statusText}
                    className={OLED_TEXT_CLASS}
                    style={{ color: LED_TEXT }}
                    initial={reduce ? { opacity: 0.9 } : { opacity: 0 }}
                    animate={{ opacity: 0.9 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.35 }}
                  >
                    {statusText}
                  </motion.span>
                </AnimatePresence>
                {/* blinking cursor (solid under reduce / compare grid) */}
                <motion.span
                  className="ml-1 inline-block h-[7px] w-[4px] opacity-80"
                  style={{ background: LED_TEXT }}
                  animate={calmIdle ? { opacity: 0.8 } : { opacity: [0.8, 0.8, 0, 0] }}
                  transition={calmIdle ? { duration: 0 } : { duration: 1.2, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
                />
                {/* droplet fill micro-icon */}
                <svg
                  viewBox="0 0 24 24"
                  className="ml-auto size-3 opacity-70"
                  style={{ color: LED_TEXT }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 3.5c3.4 4.2 6 7.2 6 10.3a6 6 0 1 1-12 0c0-3.1 2.6-6.1 6-10.3Z" />
                </svg>
                <span
                  className="ml-0.5 font-light text-[0.5rem] leading-none tabular-nums opacity-70"
                  style={{ color: LED_TEXT }}
                >
                  {Math.round(fill * 100)}%
                </span>
                {/* faint scanlines */}
                <span className="pointer-events-none absolute inset-0 opacity-60 bg-[repeating-linear-gradient(0deg,transparent_0_2px,rgba(0,0,0,0.25)_2px_3px)]" />
              </span>
            </motion.div>

            {/* Glyph row — decorative capacitive icons. */}
            <div aria-hidden="true" className="flex items-center gap-1.5">
              <TempGlyph className={GLYPH_CLASS} style={glyphStyle(isWashing ? "dim" : "idle")} />
              {isWashing && !reduce ? (
                <motion.span
                  className="relative inline-flex"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* static radial halo replaces drop-shadow so the infinite
                      opacity pulse never animates a filtered element */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${LED} 0%, transparent 70%)`,
                      opacity: 0.6,
                    }}
                  />
                  <SpinGlyph className={GLYPH_CLASS} style={{ color: LED_TEXT }} />
                </motion.span>
              ) : (
                <SpinGlyph className={GLYPH_CLASS} style={glyphStyle(isWashing ? "live" : "idle")} />
              )}
              <TimerGlyph className={GLYPH_CLASS} style={glyphStyle(isWashing ? "dim" : "idle")} />
              <WifiGlyph className={GLYPH_CLASS} style={glyphStyle("idle")} />
              {/* door-lock lights once at wash start (single-shot fade) */}
              <motion.span
                className="inline-flex"
                initial={false}
                animate={{ opacity: isWashing ? 1 : 0.6 }}
                transition={{ duration: 0.5 }}
              >
                <LockGlyph className={GLYPH_CLASS} style={glyphStyle(isWashing ? "live" : "idle")} />
              </motion.span>
              {/* slim power glyph set apart with its own halo */}
              <span className="ml-0.5 h-3.5 w-px bg-white/10" />
              <PowerGlyph className={GLYPH_CLASS} style={glyphStyle("live")} />
            </div>
          </div>

          {/* Micro-perforated speaker/vent grille under the touch strip. */}
          <div
            aria-hidden="true"
            className="mb-2 ml-auto h-[7px] w-16 rounded-[2px] bg-[radial-gradient(circle,rgba(255,255,255,0.14)_0.5px,transparent_0.6px)] bg-[size:5px_5px]"
          />

          {/* ------------------------------ Door ------------------------------ */}
          <div ref={portholeRef} className="relative">
            {/* Concealed hinge — a short vertical shadow crease sized to the
                door's chord at its left edge so it hugs the trim circle. */}
            <span
              aria-hidden="true"
              className="absolute left-[2px] top-1/2 z-10 h-10 w-[2px] -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.55)_30%,rgba(0,0,0,0.55)_70%,transparent)]"
            />
            {/* Flush recessed pull-handle groove, right edge of the door. */}
            <span
              aria-hidden="true"
              className="absolute right-[4px] top-1/2 z-10 h-16 w-[5px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(0,0,0,0.55),rgba(0,0,0,0.2))] shadow-[inset_0_-1px_0_rgba(255,255,255,0.16),inset_0_1px_1px_rgba(0,0,0,0.8)]"
            />

            {/* Chrome door trim — conic annulus with a settle pulse at lock. */}
            <motion.div
              className="relative rounded-full p-[13px] bg-[conic-gradient(from_210deg,#3a3f46,#c8cdd3_18%,#4a4f56_35%,#181b1f_52%,#9ea4ab_70%,#31353b_88%,#3a3f46)] shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_4px_10px_rgba(0,0,0,0.45)]"
              animate={isWashing && !reduce ? { scale: [1, 1.008, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Rubber gasket / boot — matte near-black ring. */}
              <div className="rounded-full bg-[#101215] p-[6px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.9),inset_0_-1px_1px_rgba(255,255,255,0.04)]">
                <div className="relative overflow-hidden rounded-full shadow-[inset_0_0_18px_rgba(0,0,0,0.22)]">
                  <Drum
                    units={units}
                    fill={fill}
                    spinCount={spinCount}
                    total={total}
                    loadsDone={loadsDone}
                    pileStyle={pileStyle}
                    isWashing={isWashing}
                  />
                  {/* Convex glass: bottom occlusion (curvature, edge-only). */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(90%_40%_at_50%_100%,rgba(0,0,0,0.28),transparent_70%)]"
                  />
                  {/* Curved specular arc — porthole window reflection. */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 100 100"
                    className="pointer-events-none absolute inset-0 h-full w-full opacity-30 [filter:blur(0.5px)]"
                  >
                    <defs>
                      <linearGradient id="onyx-arc" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0" stopColor="#fff" stopOpacity="0" />
                        <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
                        <stop offset="1" stopColor="#fff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 9.4 39.1 A 42 42 0 0 1 35.6 10.5"
                      fill="none"
                      stroke="url(#onyx-arc)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Edge-lit LED progress ring + minute ticks, seated in the
                trim/gasket gap. Labelled as the fill readout. */}
            <div
              role="img"
              aria-label={`Drum fill ${Math.round(fill * 100)} percent`}
              className="pointer-events-none absolute inset-0"
            >
              <svg viewBox="0 0 200 200" className="h-full w-full">
                {/* minute ticks — precision instrument bezel */}
                <circle
                  cx="100"
                  cy="100"
                  r="95.5"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2.5"
                  pathLength={60}
                  strokeDasharray="0.1 0.9"
                />
                {/* unlit track */}
                <circle
                  cx="100"
                  cy="100"
                  r="89"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="2.5"
                />
                <g transform="rotate(-90 100 100)">
                  {/* emissive halo — stacked strokes fake the soft glow with
                      zero Gaussian per frame: a wide faint underlay beneath
                      the original halo stroke, opacity pulsed on the shared
                      group exactly as the blurred twin used to pulse. */}
                  <motion.g
                    initial={false}
                    animate={{
                      opacity: !arcVisible
                        ? 0
                        : reduce
                          ? 0.5
                          : isWashing
                            ? [0.5, 0.95, 0.5]
                            : degraded
                              ? 0.5
                              : [0.35, 0.6, 0.35],
                    }}
                    transition={{
                      opacity:
                        reduce || !arcVisible || (degraded && !isWashing)
                          ? { duration: 0 }
                          : {
                              duration: isWashing ? 1.8 : 5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            },
                    }}
                  >
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="89"
                      fill="none"
                      stroke={LED}
                      strokeWidth="10"
                      strokeOpacity="0.35"
                      strokeLinecap="round"
                      initial={false}
                      animate={{ pathLength: isWashing ? 1 : Math.max(fill, 0.001) }}
                      transition={{
                        pathLength: reduce
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 220, damping: 30 },
                      }}
                    />
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="89"
                      fill="none"
                      stroke={LED}
                      strokeWidth="5"
                      strokeLinecap="round"
                      initial={false}
                      animate={{ pathLength: isWashing ? 1 : Math.max(fill, 0.001) }}
                      transition={{
                        pathLength: reduce
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 220, damping: 30 },
                      }}
                    />
                  </motion.g>
                  {/* crisp arc */}
                  <motion.circle
                    cx="100"
                    cy="100"
                    r="89"
                    fill="none"
                    stroke={LED_DEEP}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    initial={false}
                    animate={{
                      pathLength: isWashing ? 1 : Math.max(fill, 0.001),
                      opacity: arcVisible ? 1 : 0,
                    }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 220, damping: 30 }
                    }
                  />
                  {/* wash-complete: one bright full-circle sweep, then gone */}
                  {ringSweep > 0 ? (
                    <motion.circle
                      key={`sweep-${ringSweep}`}
                      cx="100"
                      cy="100"
                      r="89"
                      fill="none"
                      stroke={LED_BRIGHT}
                      strokeWidth="4"
                      strokeLinecap="round"
                      style={{ filter: `drop-shadow(0 0 5px ${LED})` }}
                      initial={{ pathLength: 0, opacity: 1 }}
                      animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                      transition={{
                        pathLength: { duration: 0.6, ease: "easeInOut" },
                        opacity: { duration: 0.9, times: [0, 0.65, 1] },
                      }}
                      // Unmount once faded — never leave an invisible
                      // filtered node in the tree between washes.
                      onAnimationComplete={() => setRingSweep(0)}
                    />
                  ) : null}
                </g>
                {/* comet flash at the new arc tip when fill rises */}
                {comet ? (
                  <motion.circle
                    key={comet.key}
                    cx={comet.x}
                    cy={comet.y}
                    r="3.2"
                    fill={LED_BRIGHT}
                    style={{ filter: "blur(0.5px)" }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    // Unmount once faded — never leave an invisible filtered
                    // SVG node lingering in the tree between fills.
                    onAnimationComplete={() => setComet(null)}
                  />
                ) : null}
              </svg>
            </div>

            {/* Washing — 30° chase segment orbiting the lit ring. */}
            <AnimatePresence>
              {isWashing && !reduce ? (
                <motion.div
                  key="chase"
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, rotate: 360 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    opacity: { duration: 0.4 },
                    rotate: { duration: 2.4, repeat: Infinity, ease: "linear" },
                  }}
                >
                  <svg viewBox="0 0 200 200" className="h-full w-full">
                    {/* halo underlay — wide faint twin replaces the
                        drop-shadow filter inside this rotating subtree */}
                    <circle
                      cx="100"
                      cy="100"
                      r="89"
                      fill="none"
                      stroke={LED}
                      strokeWidth="7"
                      strokeOpacity="0.35"
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray="0.085 0.915"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="89"
                      fill="none"
                      stroke={LED_BRIGHT}
                      strokeWidth="3"
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray="0.085 0.915"
                    />
                  </svg>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          {/* ---------------------------- /Door ------------------------------ */}

          {/* Brand — thin wide-tracked pale silver, etched into the glass. */}
          <div className="mt-3 text-center text-[0.6rem] font-light tracking-[0.45em] text-[#aeb6bd]/70 [text-shadow:0_1px_0_rgba(0,0,0,0.9)]">
            SILAYAN
          </div>

          {/* Drain-pump service hatch with coin slot, bottom-right — panel a
              notch lighter than the fascia so its seam reads. */}
          <div
            aria-hidden="true"
            className="absolute bottom-2 right-3 grid h-5 w-6 place-items-center rounded-[3px] bg-[linear-gradient(180deg,#1e2227,#14171b)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.7),0_1px_0_rgba(255,255,255,0.05)]"
          >
            <span className="h-[2px] w-3 rounded-full bg-black/70 shadow-[0_1px_0_rgba(255,255,255,0.08)]" />
          </div>
        </div>

        {/* "Load banked" ceremony: glyphs erupt from the porthole, a +1 chip
            flies into the OLED strip, then the strip pops. */}
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

      {/* Adjustable leveling feet — dark cylinders with a thread line. */}
      <span
        aria-hidden="true"
        className="absolute -bottom-0.5 left-8 h-2.5 w-5 rounded-b-[4px] bg-[#17191c] shadow-[inset_0_2px_2px_rgba(0,0,0,0.8)]"
      >
        <span className="absolute inset-x-0.5 top-[3px] h-px bg-white/15" />
      </span>
      <span
        aria-hidden="true"
        className="absolute -bottom-0.5 right-8 h-2.5 w-5 rounded-b-[4px] bg-[#17191c] shadow-[inset_0_2px_2px_rgba(0,0,0,0.8)]"
      >
        <span className="absolute inset-x-0.5 top-[3px] h-px bg-white/15" />
      </span>
    </div>
  );
}
