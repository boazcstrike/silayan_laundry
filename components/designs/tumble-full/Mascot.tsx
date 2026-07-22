"use client";

import { motion, useReducedMotion } from "motion/react";

interface MascotProps {
  total: number;
  fill: number;
}

type Mood = "empty" | "filling" | "half" | "full";

function moodOf(total: number, fill: number): Mood {
  if (total === 0) return "empty";
  if (fill >= 1) return "full";
  if (fill >= 0.5) return "half";
  return "filling";
}

const COPY: Record<Mood, string> = {
  empty: "Ready when you are",
  filling: "Filling up…",
  half: "Halfway there!",
  full: "Load complete!",
};

/**
 * A tiny CSS-shape mascot (a soap-bubble face) that reacts to the load state.
 * No emoji — eyes and mouth are pure divs so it themes cleanly in dark/light.
 */
export function Mascot({ total, fill }: MascotProps) {
  const reduce = useReducedMotion();
  const mood = moodOf(total, fill);

  return (
    <div className="flex items-center gap-2">
      <motion.div
        aria-hidden="true"
        className="relative grid size-11 place-items-center rounded-full border"
        style={{ background: "color-mix(in oklch, var(--chart-2) 22%, var(--card))" }}
        animate={reduce ? undefined : { y: mood === "full" ? [0, -3, 0] : 0 }}
        transition={{ duration: 0.6, repeat: mood === "full" ? Infinity : 0, repeatDelay: 0.8 }}
      >
        {/* eyes */}
        <div className="absolute top-3.5 flex w-full justify-center gap-2">
          <span
            className="rounded-full bg-foreground"
            style={{
              width: 4,
              height: mood === "empty" ? 2 : 4,
            }}
          />
          <span
            className="rounded-full bg-foreground"
            style={{
              width: 4,
              height: mood === "empty" ? 2 : 4,
            }}
          />
        </div>
        {/* mouth */}
        <div
          className="absolute bottom-3 rounded-full"
          style={{
            width: mood === "full" ? 12 : mood === "half" ? 9 : 6,
            height: mood === "empty" ? 2 : mood === "filling" ? 3 : 5,
            background: "var(--foreground)",
            borderBottomLeftRadius: 999,
            borderBottomRightRadius: 999,
          }}
        />
      </motion.div>

      <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
        {COPY[mood]}
      </span>
    </div>
  );
}
