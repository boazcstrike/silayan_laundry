"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LaundryIcon } from "@/components/designs/laundry-icons";
import { DrumPile, type PileStyle } from "./PileStyles";
import type { DrumUnit } from "./types";

const LOAD = 15;

/**
 * Deterministic "sunflower" slot layout used only by the Classic Water style:
 * up to 15 fixed positions spread across the drum so tumbling glyphs never
 * overlap while the water level rises behind them.
 */
const SLOTS: ReadonlyArray<{ left: number; top: number }> = Array.from(
  { length: LOAD },
  (_, i) => {
    const golden = 137.508 * (Math.PI / 180);
    const radius = Math.sqrt((i + 0.5) / LOAD) * 33; // percent of drum radius
    const angle = i * golden;
    return {
      left: 50 + radius * Math.cos(angle),
      top: 50 + radius * Math.sin(angle),
    };
  },
);

interface DrumProps {
  units: DrumUnit[];
  fill: number;
  spinCount: number;
  total: number;
  loadsDone: number;
  pileStyle: PileStyle;
  isWashing: boolean;
}

/** Rising soap bubbles shown only while a full load is washing. */
const SUDS: ReadonlyArray<{ left: number; size: number; delay: number }> = [
  { left: 22, size: 9, delay: 0 },
  { left: 40, size: 6, delay: 0.35 },
  { left: 55, size: 11, delay: 0.15 },
  { left: 70, size: 7, delay: 0.5 },
  { left: 34, size: 5, delay: 0.7 },
  { left: 64, size: 8, delay: 0.9 },
];

function Suds() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {SUDS.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white/70 shadow-sm"
          style={{ left: `${b.left}%`, bottom: "12%", width: b.size, height: b.size }}
          initial={{ y: 0, opacity: 0, scale: 0.6 }}
          animate={{ y: [-4, -78], opacity: [0, 0.9, 0], scale: [0.6, 1, 0.8] }}
          transition={{ duration: 1.6, delay: b.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/**
 * The washing-machine drum (a circular HTML container, NOT nested SVG).
 *
 * - Pile styles ("toss" | "heap" | "stack"): the current load's garments pile up
 *   grounded at the bottom of the drum (see {@link DrumPile}).
 * - "water": the original solid fill that rises on the Y axis while the load's
 *   glyphs tumble on a rotating layer — kept as a comparison option.
 */
export function Drum({ units, fill, spinCount, total, loadsDone, pileStyle, isWashing }: DrumProps) {
  const reduce = useReducedMotion();
  const isWater = pileStyle === "water";
  const shake = isWashing && !reduce;

  return (
    <div
      className="relative aspect-square w-full max-w-[16rem] overflow-hidden rounded-full border-4 bg-[#eef3f1] shadow-inner dark:bg-[#dfe7e3]"
      style={{ borderColor: "color-mix(in oklch, var(--chart-2) 55%, #9aa8a3)" }}
    >
      <motion.div
        className="absolute inset-0"
        animate={
          shake
            ? { x: [0, -6, 6, -5, 5, -3, 3, 0], rotate: [0, -2, 2, -2, 2, -1, 1, 0] }
            : { x: 0, rotate: 0 }
        }
        transition={shake ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
      >
      {isWater ? (
        <>
          {/* Water fill — bottom layer, scales up on the Y axis with fill. */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "var(--chart-2)", opacity: 0.32, transformOrigin: "bottom" }}
            initial={false}
            animate={{ scaleY: fill }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 30 }}
          />

          {/* Tumbling layer — rotates by accumulated spin. */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: reduce ? 0 : spinCount * 32 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 14 }}
          >
            <AnimatePresence initial={false}>
              {units.map((unit, i) => {
                const slot = SLOTS[i % SLOTS.length];
                return (
                  <motion.span
                    key={unit.id}
                    className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/90 shadow-sm"
                    style={{ left: `${slot.left}%`, top: `${slot.top}%`, color: unit.tint }}
                    initial={reduce ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 520, damping: 24 }}
                  >
                    <LaundryIcon name={unit.name} className="size-5" />
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </>
      ) : (
        <DrumPile style={pileStyle} units={units} fill={fill} />
      )}
      </motion.div>

      {/* Wash ceremony: suds + a pulsing rim glow while a full load runs. */}
      <AnimatePresence>
        {isWashing ? (
          <motion.div
            key="wash-fx"
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Suds />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: "inset 0 0 0 3px color-mix(in oklch, var(--chart-2) 60%, transparent)" }}
              animate={reduce ? { opacity: 0.6 } : { opacity: [0.25, 0.7, 0.25] }}
              transition={reduce ? { duration: 0 } : { duration: 0.9, repeat: Infinity }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Readout — pinned to the upper drum so a rising pile never hides it. */}
      <div className="pointer-events-none absolute inset-x-0 top-[14%] grid place-items-center">
        <div className="rounded-2xl bg-white/85 px-3 py-1 text-center shadow-sm backdrop-blur-sm">
          <div
            className="text-2xl font-black tabular-nums leading-none text-[#0f1c1a]"
            aria-live="polite"
          >
            {total}
          </div>
          <div className="mt-0.5 text-[0.6rem] font-semibold tracking-wide text-[#4a5b57] uppercase">
            {total === 1 ? "item" : "items"} · {loadsDone} load{loadsDone === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    </div>
  );
}
