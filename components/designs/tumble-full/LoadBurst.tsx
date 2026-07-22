"use client";

/**
 * Game "load banked" celebration. When a full load finishes washing the drum
 * empties — at that instant this overlay fires: a handful of the load's garment
 * glyphs BURST up and out of the porthole (rendered here, above the drum's
 * `overflow-hidden` clip, so they visibly escape the machine), then a "+1 LOAD"
 * chip flies from the porthole up to the LED loads counter and is absorbed into
 * it. The counter then pops (handled by the parent via {@link onDone}).
 *
 * Coordinates are supplied by {@link WashingMachine} in pixels relative to the
 * machine body, measured the moment the burst fires. Snappy-arcade timing:
 * fast outward pop with overshoot, tight per-particle stagger, ~0.7s total.
 * Never mounted under reduced motion.
 */

import { motion } from "motion/react";
import { LaundryIcon } from "@/components/designs/laundry-icons";
import type { DrumUnit } from "./types";

/** A point in pixels relative to the machine body's top-left. */
export interface BurstPoint {
  x: number;
  y: number;
}

interface LoadBurstProps {
  /** Porthole centre — where garments erupt and the chip departs. */
  origin: BurstPoint;
  /** LED loads-counter centre — where the "+1 LOAD" chip lands. */
  target: BurstPoint;
  /** Snapshot of the load's glyphs to throw (capped by the parent). */
  icons: DrumUnit[];
  /** Fired when the chip has been absorbed into the counter (pop + cleanup). */
  onDone: () => void;
}

// Upward fan: particles spray across the top hemisphere out of the door.
const FAN_SPREAD = 2.4; // radians, centred on straight-up
const BASE_ANGLE = -Math.PI / 2; // -90° = up (y grows downward)

export function LoadBurst({ origin, target, icons, onDone }: LoadBurstProps) {
  const n = icons.length;
  const chipDX = target.x - origin.x;
  const chipDY = target.y - origin.y;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-visible"
      aria-hidden="true"
    >
      {/* Garment glyphs erupting out of the porthole. */}
      {icons.map((unit, i) => {
        const frac = n > 1 ? i / (n - 1) - 0.5 : 0;
        const angle = BASE_ANGLE + frac * FAN_SPREAD;
        const dist = 66 + (i % 3) * 14;
        const bx = Math.cos(angle) * dist;
        const by = Math.sin(angle) * dist; // negative = upward
        const twist = (i % 2 === 0 ? 1 : -1) * 55;

        return (
          <motion.span
            key={unit.id}
            className="absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white/90 shadow-sm"
            style={{ left: origin.x, top: origin.y, color: unit.tint }}
            initial={{ x: 0, y: 0, scale: 0.3, opacity: 0, rotate: 0 }}
            animate={{
              x: [0, bx * 0.7, bx],
              y: [0, by, by + 16],
              scale: [0.3, 1.05, 0.65],
              opacity: [0, 1, 0],
              rotate: [0, twist],
            }}
            transition={{
              duration: 0.72,
              delay: i * 0.04,
              times: [0, 0.45, 1],
              ease: [0.2, 0.85, 0.3, 1],
            }}
          >
            <LaundryIcon name={unit.name} className="size-4" />
          </motion.span>
        );
      })}

      {/* "+1 LOAD" chip: departs the porthole, arcs up to the LED counter, and
          is absorbed (shrink + fade) as it lands. onDone drives the pop. */}
      <motion.span
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[0.6rem] font-black tracking-wide whitespace-nowrap text-white shadow-md"
        style={{ left: origin.x, top: origin.y, background: "var(--load-pop)" }}
        initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
        animate={{
          x: [0, chipDX * 0.5, chipDX],
          y: [0, chipDY - 20, chipDY],
          scale: [0, 1.15, 1, 0.5],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 1.5,
          delay: 0.28,
          times: [0, 0.42, 0.8, 1],
          ease: [0.34, 1.4, 0.64, 1],
        }}
        onAnimationComplete={onDone}
      >
        +1 LOAD
      </motion.span>
    </div>
  );
}
