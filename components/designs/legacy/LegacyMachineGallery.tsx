"use client";

/**
 * Legacy machine gallery — the washing machine that ran on the counter BEFORE
 * Draft 6 shipped. Kept as the record of the previous live design (design
 * ritual: never delete old proposals). Driven by the same shared demo state as
 * the washer-draft gallery so it can be judged against the real ceremony.
 *
 * This is the two-variant static WashingMachine (Signature Teal / Retro
 * Laundromat) that TumbleFull used to render. It is no longer wired into the
 * live counter — it lives here only for reference.
 */

import { useState } from "react";
import type { PileStyle } from "@/components/designs/tumble-full/PileStyles";
import {
  WashingMachine,
  MACHINE_LABELS,
  type MachineVariant,
} from "@/components/designs/tumble-full/WashingMachine";
import { useWasherDemo } from "@/components/designs/washer-drafts/useWasherDemo";
import { WasherDemoControls } from "@/components/designs/washer-drafts/WasherDemoControls";

export function LegacyMachineGallery() {
  const demo = useWasherDemo();
  const pile: PileStyle = "toss";
  const [variant, setVariant] = useState<MachineVariant>("signature");

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        The previous live machine (pre-Draft 6). Two static style directions —
        add items to fill the drum, 15 triggers the wash.
      </p>

      {/* Variant selector */}
      <div
        className="mb-4 flex flex-wrap gap-1 rounded-full border bg-card p-1"
        role="tablist"
        aria-label="Legacy machine variant"
      >
        {(Object.keys(MACHINE_LABELS) as MachineVariant[]).map((key, i) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={variant === key}
            onClick={() => setVariant(key)}
            className={`min-h-[36px] rounded-full px-3 text-xs font-semibold transition-colors ${
              variant === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {String.fromCharCode(65 + i)} · {MACHINE_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Shared demo controls */}
      <WasherDemoControls demo={demo} />

      <div className="flex justify-center">
        <section className="flex flex-col items-center gap-3">
          <h3 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
            {MACHINE_LABELS[variant]}
          </h3>
          <WashingMachine
            variant={variant}
            units={demo.units}
            fill={demo.fill}
            spinCount={demo.spinCount}
            total={demo.total}
            loadsDone={demo.loadsDone}
            pileStyle={pile}
            isWashing={demo.isWashing}
          />
        </section>
      </div>
    </div>
  );
}
