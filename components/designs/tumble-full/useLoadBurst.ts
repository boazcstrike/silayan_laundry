"use client";

/**
 * Shared "load banked" burst handshake used by the production
 * {@link WashingMachine} and every washer draft.
 *
 * The instant a wash finishes (isWashing true -> false) glyphs erupt from the
 * porthole and a "+1 LOAD" chip flies to the loads readout, which then pops.
 * Coordinates are measured against the machine body at fire time via the three
 * refs this hook hands out — attach them to the machine root, the loads
 * display, and the porthole wrapper. Never fires under reduced motion.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { BurstPoint } from "./LoadBurst";
import type { DrumUnit } from "./types";

/** Snappy arcade burst throws a handful of glyphs — more clutters the pop. */
export const BURST_ICON_CAP = 8;

export interface LoadBurstState {
  key: number;
  origin: BurstPoint;
  target: BurstPoint;
  icons: DrumUnit[];
}

export function useLoadBurst(units: DrumUnit[], isWashing: boolean) {
  const reduce = useReducedMotion();
  const machineRef = useRef<HTMLDivElement>(null);
  const ledRef = useRef<HTMLDivElement>(null);
  const portholeRef = useRef<HTMLDivElement>(null);
  const wasWashing = useRef(isWashing);
  const burstUnits = useRef<DrumUnit[]>(units);
  const burstSeq = useRef(0);
  const [popKey, setPopKey] = useState(0);
  const [burst, setBurst] = useState<LoadBurstState | null>(null);

  // Keep a snapshot of the load's glyphs while it washes — by the time the
  // wash ends the drum has already emptied its `units`.
  useEffect(() => {
    if (isWashing && units.length > 0) burstUnits.current = units;
  }, [isWashing, units]);

  useEffect(() => {
    const finishedWash = wasWashing.current && !isWashing;
    wasWashing.current = isWashing;
    if (!finishedWash || reduce) return;

    const body = machineRef.current?.getBoundingClientRect();
    const led = ledRef.current?.getBoundingClientRect();
    const port = portholeRef.current?.getBoundingClientRect();
    if (!body || !led || !port) return;

    burstSeq.current += 1;
    setBurst({
      key: burstSeq.current,
      origin: {
        x: port.left + port.width / 2 - body.left,
        y: port.top + port.height / 2 - body.top,
      },
      target: {
        x: led.left + led.width / 2 - body.left,
        y: led.top + led.height / 2 - body.top,
      },
      icons: burstUnits.current.slice(0, BURST_ICON_CAP),
    });
  }, [isWashing, reduce]);

  /** Call from LoadBurst's onDone: pops the counter and clears the burst. */
  const completeBurst = () => {
    setPopKey((k) => k + 1);
    setBurst(null);
  };

  return { machineRef, ledRef, portholeRef, burst, popKey, completeBurst };
}
