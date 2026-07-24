"use client";

/**
 * Shared demo driver for the /proposed-designs galleries. Both the washer-draft
 * gallery and the legacy-machine gallery feed one machine with the same
 * add/reset/wash state so a proposal can be judged against the real ceremony.
 *
 * Event-driven (mirrors TumbleFull): crossing a 15-item boundary inside the add
 * handler starts the wash — no state-sync effects.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getItemTint } from "@/components/designs/laundry-icons";
import type { DrumUnit } from "@/components/designs/tumble-full/types";

export const LOAD = 15;
const WASH_MS = 1900;

/** Sample garments cycled through as the user adds demo items. */
const SAMPLE: ReadonlyArray<{ name: string; category: string }> = [
  { name: "T-shirts", category: "Regular Laundry" },
  { name: "Pants", category: "Regular Laundry" },
  { name: "Towels / Face Towels", category: "Home Items" },
  { name: "Dresses", category: "Regular Laundry" },
  { name: "Socks (per pc. not pair)", category: "Regular Laundry" },
  { name: "Bed Sheets", category: "Home Items" },
  { name: "Blouses", category: "Regular Laundry" },
  { name: "Shorts", category: "Regular Laundry" },
];

export interface WasherDemo {
  units: DrumUnit[];
  fill: number;
  spinCount: number;
  total: number;
  loadsDone: number;
  isWashing: boolean;
  add: (n: number) => void;
  reset: () => void;
}

export function useWasherDemo(): WasherDemo {
  const [total, setTotal] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [isWashing, setIsWashing] = useState(false);
  const [washedBoundary, setWashedBoundary] = useState(-1);
  const washTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalRef = useRef(0);

  const loadsDone = Math.floor(total / LOAD);
  const cycle = total % LOAD;
  const cycleTotal = total > 0 && cycle === 0 ? LOAD : cycle;
  const fill = cycleTotal / LOAD;

  useEffect(
    () => () => {
      if (washTimer.current) clearTimeout(washTimer.current);
    },
    [],
  );

  const startWash = useCallback(() => {
    setIsWashing(true);
    if (washTimer.current) clearTimeout(washTimer.current);
    washTimer.current = setTimeout(() => {
      setIsWashing(false);
      setWashedBoundary(Math.floor(totalRef.current / LOAD) * LOAD);
    }, WASH_MS);
  }, []);

  const units = useMemo<DrumUnit[]>(
    () =>
      Array.from({ length: cycleTotal }, (_, i) => {
        const idx = (total - cycleTotal + i) % SAMPLE.length;
        const sample = SAMPLE[idx];
        return {
          id: `demo#${total - cycleTotal + i}`,
          name: sample.name,
          tint: getItemTint(sample.category),
        };
      }),
    [cycleTotal, total],
  );

  const drumReset =
    !isWashing && total > 0 && total % LOAD === 0 && washedBoundary === total;

  const add = useCallback(
    (n: number) => {
      const prev = totalRef.current;
      const next = Math.max(0, prev + n);
      totalRef.current = next;
      setTotal(next);
      setSpinCount((s) => s + 1);
      if (n > 0 && Math.floor(next / LOAD) > Math.floor(prev / LOAD)) {
        startWash();
      }
    },
    [startWash],
  );
  const reset = useCallback(() => {
    totalRef.current = 0;
    setTotal(0);
    setSpinCount(0);
    setWashedBoundary(-1);
    setIsWashing(false);
    if (washTimer.current) clearTimeout(washTimer.current);
  }, []);

  return {
    units: drumReset ? [] : units,
    fill: drumReset ? 0 : fill,
    spinCount,
    total,
    loadsDone,
    isWashing,
    add,
    reset,
  };
}
