"use client";

/**
 * Washer draft gallery — candidate machine redesigns driven by one shared demo
 * state. Lives inside the /proposed-designs page ("Washer drafts" proposal
 * tab).
 *
 * Draft 6 is the design that shipped — it's now the live machine on the counter
 * (see TumbleFull). It stays here at the front of the gallery as the record of
 * what was approved; the earlier drafts stay as reference (design ritual: never
 * delete old proposals).
 *
 * Perf: only the SELECTED draft is mounted by default. Every draft runs
 * infinite idle animations plus SVG filters, so mounting all of them at once
 * multiplies compositor + rAF work; "Compare all" opts back into the grid.
 */

import { useState } from "react";
import type { PileStyle } from "@/components/designs/tumble-full/PileStyles";
import { Draft1 } from "./Draft1";
import { Draft2 } from "./Draft2";
import { Draft3 } from "./Draft3";
import { Draft4 } from "./Draft4";
import { Draft5 } from "./Draft5";
import { Draft6 } from "./Draft6";
import type { WasherDraftProps } from "./DraftProps";
import { useWasherDemo } from "./useWasherDemo";
import { WasherDemoControls } from "./WasherDemoControls";

const DRAFTS: ReadonlyArray<{
  n: number;
  title: string;
  Component: (props: WasherDraftProps) => React.ReactNode;
}> = [
  { n: 6, title: "Draft 6 · Live", Component: Draft6 },
  { n: 1, title: "Draft 1 · Stainless", Component: Draft1 },
  { n: 2, title: "Draft 2 · Retro", Component: Draft2 },
  { n: 3, title: "Draft 3 · Onyx", Component: Draft3 },
  { n: 4, title: "Draft 4 · Glass", Component: Draft4 },
  { n: 5, title: "Draft 5 · Signature", Component: Draft5 },
];

const ALL = 0;

export function WasherDraftGallery() {
  const demo = useWasherDemo();
  const pile: PileStyle = "toss";
  // Selected draft number, or ALL (0) for the compare grid.
  const [active, setActive] = useState(6);

  const draftProps: WasherDraftProps = {
    units: demo.units,
    fill: demo.fill,
    spinCount: demo.spinCount,
    total: demo.total,
    loadsDone: demo.loadsDone,
    pileStyle: pile,
    isWashing: demo.isWashing,
    // Compare grid mounts 6 machines: drafts drop IDLE-ONLY decorative loops
    // (static idle look is identical between loop iterations anyway).
    degraded: active === ALL,
  };

  const shown = active === ALL ? DRAFTS : DRAFTS.filter((d) => d.n === active);

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Add items to fill the drum — 15 items triggers the wash ceremony. Only
        the selected draft is rendered; use &ldquo;Compare all&rdquo; to see
        every machine at once (heavier on slow devices).
      </p>

      {/* Draft selector */}
      <div
        className="mb-4 flex flex-wrap gap-1 rounded-full border bg-card p-1"
        role="tablist"
        aria-label="Washer draft"
      >
        {DRAFTS.map(({ n, title }) => (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={active === n}
            onClick={() => setActive(n)}
            className={`min-h-[36px] rounded-full px-3 text-xs font-semibold transition-colors ${
              active === n
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {title}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={active === ALL}
          onClick={() => setActive(ALL)}
          className={`min-h-[36px] rounded-full px-3 text-xs font-semibold transition-colors ${
            active === ALL
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Compare all
        </button>
      </div>

      {/* Shared demo controls */}
      <WasherDemoControls demo={demo} />

      <div
        className={
          active === ALL
            ? "grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
            : "flex justify-center"
        }
      >
        {shown.map(({ n, title, Component }) => (
          <section key={n} className="flex flex-col items-center gap-3">
            <h3 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
              {title}
            </h3>
            <Component {...draftProps} />
          </section>
        ))}
      </div>
    </div>
  );
}
