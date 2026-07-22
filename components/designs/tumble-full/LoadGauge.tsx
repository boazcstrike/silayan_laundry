"use client";

import { motion, useReducedMotion } from "motion/react";
import { Trophy } from "lucide-react";

interface LoadGaugeProps {
  fill: number;
  loadsDone: number;
  batchesNeeded: number;
}

/**
 * Horizontal companion to the drum: a bar that scales on the X axis with the
 * current-load fill, a row of earned Trophy badges (one per completed load),
 * and the "15 items = 1 load" helper.
 */
export function LoadGauge({ fill, loadsDone, batchesNeeded }: LoadGaugeProps) {
  const reduce = useReducedMotion();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Estimated current load</span>
        <span className="tabular-nums">{Math.round(fill * 100)}%</span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full border bg-background">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--chart-2)", transformOrigin: "left" }}
          initial={false}
          animate={{ scaleX: fill }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
        />
      </div>

      {loadsDone > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {Array.from({ length: loadsDone }, (_, i) => (
            <span
              key={`trophy-${i}`}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
              style={{ color: "var(--chart-2)" }}
            >
              <Trophy className="size-3.5" /> Load {i + 1}
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        ≈ 15 items per load
        {batchesNeeded > 0
          ? ` · about ${batchesNeeded} load${batchesNeeded === 1 ? "" : "s"} total`
          : ""}
      </p>
    </div>
  );
}
