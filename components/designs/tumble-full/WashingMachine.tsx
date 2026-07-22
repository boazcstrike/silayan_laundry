"use client";

/**
 * Front-load washing machine chrome wrapped around the tumbling-icon porthole
 * (the {@link Drum}). Two static style directions selectable via `variant` —
 * Signature Teal / Retro Laundromat — for the client to approve before the
 * richer animation pass. Every variant is theme-aware (light + dark); the door
 * handle + hinge read the porthole as an openable washer door. The porthole
 * keeps its existing spin/fill and everything else here is static.
 */

import { Drum } from "./Drum";
import type { PileStyle } from "./PileStyles";
import type { DrumUnit } from "./types";

export type MachineVariant = "signature" | "retro";

type Chrome = {
  /** Body background + border (light + dark). */
  body: string;
  /** Control-panel strip background + border. */
  panel: string;
  /** Detergent-drawer handle bar. */
  handle: string;
  /** LED display background + ink (readable on its own dark ground both themes). */
  display: string;
  /** Program-knob indicator line. */
  knob: string;
  /** Feet blocks. */
  feet: string;
  /** SILAYAN brand plate text. */
  brand: string;
  /** Door handle + hinge (metal). */
  door: string;
};

// Full literal class strings so Tailwind v4 JIT picks up every arbitrary value.
const CHROME: Record<MachineVariant, Chrome> = {
  signature: {
    body: "bg-[#eef2f1] border-[#c4cec9] dark:bg-[#26302e] dark:border-[#3a4a46]",
    panel: "bg-[#dde4e1] border-[#c4cec9] dark:bg-[#1f2926] dark:border-[#3a4a46]",
    handle: "bg-[#c4cec9] dark:bg-[#46564f]",
    display: "bg-[#0e1614] text-[#39d6c2]",
    knob: "bg-[#12a594] dark:bg-[#2fc4b0]",
    feet: "bg-[#b6c0bb] dark:bg-[#3a4a46]",
    brand: "text-[#8a978f] dark:text-[#8fa39d]",
    door: "bg-[#9aa8a3] dark:bg-[#5a6c66]",
  },
  retro: {
    body: "bg-[#efe7d8] border-[#d3c3a4] dark:bg-[#2b2620] dark:border-[#4a4031]",
    panel: "bg-[#e2d6c0] border-[#d3c3a4] dark:bg-[#241f18] dark:border-[#4a4031]",
    handle: "bg-[#c9a466] dark:bg-[#6b5a35]",
    display: "bg-[#2a2118] text-[#e8b04a]",
    knob: "bg-[#d1495b]",
    feet: "bg-[#b79a63] dark:bg-[#4a3f28]",
    brand: "text-[#9a7d45] dark:text-[#c2a15e]",
    door: "bg-[#c9a466] dark:bg-[#8a6d38]",
  },
};

export const MACHINE_LABELS: Record<MachineVariant, string> = {
  signature: "Signature Teal",
  retro: "Retro Laundromat",
};

interface WashingMachineProps {
  variant: MachineVariant;
  units: DrumUnit[];
  fill: number;
  spinCount: number;
  total: number;
  loadsDone: number;
  pileStyle: PileStyle;
}

export function WashingMachine({
  variant,
  units,
  fill,
  spinCount,
  total,
  loadsDone,
  pileStyle,
}: WashingMachineProps) {
  const c = CHROME[variant];

  return (
    <div className="mx-auto w-full max-w-[17rem]">
      <div className={`relative rounded-[1.9rem] border-2 p-3 pb-6 shadow-lg ${c.body}`}>
        {/* Control panel: detergent drawer · LED loads readout · program knob */}
        <div className="mb-3 flex items-center gap-2">
          <div className={`flex h-8 flex-1 items-center rounded-lg border px-2 ${c.panel}`}>
            <span className={`h-1 w-7 rounded-full ${c.handle}`} aria-hidden="true" />
          </div>
          {/* LED loads counter — labelled so the number reads as "loads done". */}
          <div
            className={`flex h-8 w-16 flex-col items-center justify-center rounded-md font-mono leading-none ${c.display}`}
            aria-label={`${loadsDone} wash load${loadsDone === 1 ? "" : "s"} counted so far`}
          >
            <span className="flex items-baseline gap-0.5">
              <span className="text-sm font-bold tabular-nums">{loadsDone}</span>
              <span className="text-[0.5rem] font-semibold opacity-80">LOADS</span>
            </span>
            <span className="mt-0.5 text-[0.4rem] font-semibold tracking-[0.15em] opacity-60">
              EST · DONE
            </span>
          </div>
          <div
            className={`relative grid size-8 place-items-center rounded-full border ${c.body}`}
            aria-hidden="true"
          >
            <span className={`absolute top-1 h-2.5 w-0.5 rounded ${c.knob}`} />
          </div>
        </div>

        {/* Door: hinge (left) + porthole (icon chamber) + handle (right) */}
        <div className="relative">
          {/* hinge stubs */}
          <span
            className={`absolute top-[36%] left-[-2px] z-10 h-6 w-1.5 -translate-y-1/2 rounded-full ${c.door}`}
            aria-hidden="true"
          />
          <span
            className={`absolute top-[64%] left-[-2px] z-10 h-6 w-1.5 -translate-y-1/2 rounded-full ${c.door}`}
            aria-hidden="true"
          />

          <Drum
            units={units}
            fill={fill}
            spinCount={spinCount}
            total={total}
            loadsDone={loadsDone}
            pileStyle={pileStyle}
          />

          {/* handle — the grip you pull to open the door */}
          <span
            className={`absolute top-1/2 right-[-3px] z-10 flex h-14 w-3.5 -translate-y-1/2 items-center justify-center rounded-full shadow-md ${c.door}`}
            aria-hidden="true"
          >
            <span className="h-8 w-1 rounded-full bg-white/25" />
          </span>
        </div>

        <div className={`mt-3 text-center text-[0.6rem] font-extrabold tracking-[0.3em] ${c.brand}`}>
          SILAYAN
        </div>

        {/* Feet */}
        <span className={`absolute -bottom-2 left-7 h-3 w-7 rounded-b-md ${c.feet}`} aria-hidden="true" />
        <span className={`absolute -bottom-2 right-7 h-3 w-7 rounded-b-md ${c.feet}`} aria-hidden="true" />
      </div>
    </div>
  );
}
