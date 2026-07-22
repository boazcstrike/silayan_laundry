"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";

/**
 * Analytics motion system.
 *
 * Personality: Corporate (dashboard) with a Premium accent on the forecast hero.
 * One signature curve for ~80% of motion, a 3-step duration palette, and a
 * single entrance pattern (rise + fade) so the whole page reads as one system.
 * Everything degrades to no-motion under `prefers-reduced-motion`.
 */

/** Signature decelerate curve (MD3 snappy) — entrances land here. */
export const EASE_OUT = [0.2, 0, 0, 1] as const;
/** Emphasized decelerate — hero/attention moments. */
export const EASE_EMPHASIZED = [0.05, 0.7, 0.1, 1] as const;

/** Duration palette: quick / standard / slow (seconds). */
export const DUR = { quick: 0.18, standard: 0.32, slow: 0.5 } as const;

/** Stagger container: children cascade in under the 500ms budget. */
export const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

/** Entrance pattern shared by every item: 12px rise + fade. */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.standard, ease: EASE_EMPHASIZED },
  },
};

/** Tight cascade for chips/list cells (micro stagger, < 200ms). */
export const microContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export const microItemVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DUR.quick, ease: EASE_OUT },
  },
};

/**
 * Number that counts up from 0 to `value` the first time it scrolls into view.
 * Formats with `Math.round`; honours reduced motion by snapping to the value.
 */
export function CountUp({
  value,
  suffix = "",
  className,
  duration = 0.9,
}: {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce || !inView) {
      node.textContent = `${value}${suffix}`;
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => {
        node.textContent = `${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [value, suffix, duration, inView, reduce]);

  return (
    <span ref={ref} className={className}>
      {`${value}${suffix}`}
    </span>
  );
}
