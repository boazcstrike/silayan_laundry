"use client";

/**
 * Pile renderers for the drum porthole — the "clothes piling up" alternatives to
 * the original solid water fill. Each renderer takes the current load's glyph
 * units (already sliced to the current cycle, max 15) and draws them as
 * a growing heap grounded at the bottom of the drum. Selectable live via the
 * "Pile style" toggle so the client can pick a direction.
 *
 * Motion personality: Playful — each garment is a light element that drops from
 * above with a squash-settle spring (bouncy overshoot), the pile itself has
 * weight (grounded, no tumble-spin). Honors prefers-reduced-motion.
 */

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { LaundryIcon } from "@/components/designs/laundry-icons";
import type { DrumUnit } from "./types";

export type PileStyle = "toss" | "heap" | "stack" | "water";

export const PILE_LABELS: Record<PileStyle, string> = {
  toss: "Tumble Toss",
  heap: "Soft Heap",
  stack: "Folded Stack",
  water: "Classic Water",
};

/** Toggle order (A · B · C · D) shown in the picker. */
export const PILE_ORDER: readonly PileStyle[] = ["toss", "heap", "stack", "water"];

// --- deterministic mound geometry (shared by Toss + Heap) ----------------------

type Slot = { left: number; bottom: number; rot: number };

/** Rows from the ground up: a 5-4-3-2-1 triangular mound = 15 slots. */
const MOUND_ROWS = [5, 4, 3, 2, 1] as const;
const COL_GAP = 15; // horizontal % between slot centers
const ROW_GAP = 12; // vertical % between rows
const ROW_BASE = 16; // bottom % of the first (ground) row

/** Small deterministic wobble so the heap reads organic, never a neat grid. */
const jitter = (i: number, span: number, salt: number) =>
  (((i * salt) % (span * 2 + 1)) - span);

const MOUND_SLOTS: readonly Slot[] = (() => {
  const slots: Slot[] = [];
  let i = 0;
  MOUND_ROWS.forEach((count, row) => {
    const rowWidth = (count - 1) * COL_GAP;
    const startLeft = 50 - rowWidth / 2;
    for (let c = 0; c < count; c += 1) {
      slots.push({
        left: startLeft + c * COL_GAP + jitter(i, 3, 37),
        bottom: ROW_BASE + row * ROW_GAP + jitter(i, 2, 29),
        rot: jitter(i, 12, 53),
      });
      i += 1;
    }
  });
  return slots;
})();

const springDrop = { type: "spring", stiffness: 300, damping: 17 } as const;

// --- A · Tumble Toss -----------------------------------------------------------

function TossPile({ units, reduce }: { units: DrumUnit[]; reduce: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {units.map((unit, i) => {
        const slot = MOUND_SLOTS[i % MOUND_SLOTS.length];
        return (
          <motion.span
            key={unit.id}
            className="absolute grid size-9 -translate-x-1/2 place-items-center rounded-2xl border border-black/10 bg-white/95 shadow-md dark:bg-white/90"
            style={{ left: `${slot.left}%`, bottom: `${slot.bottom}%`, color: unit.tint, zIndex: i }}
            initial={reduce ? false : { y: -46, scale: 0.6, opacity: 0, rotate: slot.rot - 18 }}
            animate={{ y: 0, scale: 1, opacity: 1, rotate: slot.rot }}
            exit={reduce ? { opacity: 0 } : { y: 14, scale: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : springDrop}
          >
            <LaundryIcon name={unit.name} className="size-5" />
          </motion.span>
        );
      })}
    </AnimatePresence>
  );
}

// --- B · Soft Heap -------------------------------------------------------------

function HeapPile({ units, reduce }: { units: DrumUnit[]; reduce: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {units.map((unit, i) => {
        const slot = MOUND_SLOTS[i % MOUND_SLOTS.length];
        return (
          <motion.span
            key={unit.id}
            className="absolute size-11 -translate-x-1/2 shadow-sm"
            style={{
              left: `${slot.left}%`,
              bottom: `${slot.bottom}%`,
              background: `color-mix(in oklch, ${unit.tint} 78%, white)`,
              // Squishy folded-cloth silhouette (asymmetric superellipse-ish).
              borderRadius: "62% 38% 55% 45% / 55% 60% 40% 45%",
              boxShadow: "inset 0 -3px 6px rgba(0,0,0,0.12), inset 0 3px 5px rgba(255,255,255,0.45)",
              zIndex: i,
            }}
            initial={reduce ? false : { y: -46, scale: 0.5, opacity: 0, rotate: slot.rot - 14 }}
            animate={{ y: 0, scale: 1, opacity: 1, rotate: slot.rot }}
            exit={reduce ? { opacity: 0 } : { y: 14, scale: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : springDrop}
          />
        );
      })}
    </AnimatePresence>
  );
}

// --- C · Folded Stack ----------------------------------------------------------

const STACK_STEP = 5; // bottom-% gained per folded bar
const STACK_BASE = 12;

function StackPile({ units, reduce }: { units: DrumUnit[]; reduce: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {units.map((unit, i) => {
        const fromLeft = i % 2 === 0;
        return (
          <motion.span
            key={unit.id}
            className="absolute left-1/2 h-[7%] w-[58%] -translate-x-1/2 rounded-md shadow-sm"
            style={{
              bottom: `${STACK_BASE + i * STACK_STEP}%`,
              background: `color-mix(in oklch, ${unit.tint} ${70 + (i % 3) * 8}%, white)`,
              boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.14), inset 0 2px 3px rgba(255,255,255,0.4)",
              zIndex: i,
            }}
            initial={reduce ? false : { x: fromLeft ? -70 : 70, opacity: 0, scaleX: 0.6 }}
            animate={{ x: 0, opacity: 1, scaleX: 1 }}
            exit={reduce ? { opacity: 0 } : { x: fromLeft ? -50 : 50, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 26 }}
          >
            {/* fold crease */}
            <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-black/10" />
          </motion.span>
        );
      })}
    </AnimatePresence>
  );
}

// --- shared base shadow (secondary layer: grounds the heap, widens with fill) --

function BaseShadow({ fill }: { fill: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[6%] mx-auto h-3 rounded-[50%]"
      style={{
        width: `${28 + fill * 46}%`,
        // Soft contact-shadow ellipse painted as a gradient instead of
        // `bg-black/15 blur-[3px]` — same look, no CSS filter living inside
        // the drum's shaking subtree.
        background:
          "radial-gradient(ellipse at center, rgba(0,0,0,0.15), rgba(0,0,0,0.10) 55%, transparent 75%)",
      }}
      aria-hidden="true"
    />
  );
}

// --- public renderer -----------------------------------------------------------

interface DrumPileProps {
  style: Exclude<PileStyle, "water">;
  units: DrumUnit[];
  fill: number;
}

/** Renders the chosen clothes-pile inside the drum (grounded at the bottom). */
export function DrumPile({ style, units, fill }: DrumPileProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <div className="absolute inset-0">
      {units.length > 0 ? <BaseShadow fill={fill} /> : null}
      {style === "toss" ? <TossPile units={units} reduce={reduce} /> : null}
      {style === "heap" ? <HeapPile units={units} reduce={reduce} /> : null}
      {style === "stack" ? <StackPile units={units} reduce={reduce} /> : null}
    </div>
  );
}
