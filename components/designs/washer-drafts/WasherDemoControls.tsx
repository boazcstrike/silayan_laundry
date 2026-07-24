"use client";

/** Sticky add/reset bar shared by the washer-draft and legacy galleries. */

import type { WasherDemo } from "./useWasherDemo";

export function WasherDemoControls({ demo }: { demo: WasherDemo }) {
  return (
    <div className="sticky top-2 z-10 mb-8 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-sm">
      {[1, 5, 14].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => demo.add(n)}
          className="min-h-[40px] rounded-xl border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted"
        >
          +{n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => demo.add(-1)}
        className="min-h-[40px] rounded-xl border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted"
      >
        −1
      </button>
      <button
        type="button"
        onClick={demo.reset}
        className="min-h-[40px] rounded-xl border bg-background px-4 text-sm font-semibold text-destructive transition-colors hover:bg-muted"
      >
        Reset
      </button>
      <span className="ml-auto text-sm font-semibold tabular-nums text-muted-foreground">
        {demo.total} items · {demo.loadsDone} loads
        {demo.isWashing ? " · washing…" : ""}
      </span>
    </div>
  );
}
