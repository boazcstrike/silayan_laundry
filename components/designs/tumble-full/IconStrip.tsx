"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { LaundryIcon } from "@/components/designs/laundry-icons";
import type { Selected } from "./types";

interface IconStripProps {
  selected: Selected[];
  onInc: (name: string, isCustom: boolean) => void;
  onDec: (name: string, isCustom: boolean) => void;
}

const CHIP_BTN =
  "grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-foreground/80 transition-colors hover:bg-background active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/**
 * The signature surface: a responsive wrap of chips for every selected item.
 * Each chip is [icon] + name (may hide on very small screens) + a count badge,
 * with inline +/- so the user can adjust straight from the strip.
 */
export function IconStrip({ selected, onInc, onDec }: IconStripProps) {
  const reduce = useReducedMotion();

  if (selected.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-card/60 px-4 py-3 text-center text-sm text-muted-foreground">
        No items yet — tap below to add.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence initial={false}>
        {selected.map((item) => (
          <motion.div
            key={`${item.isCustom ? "c" : "r"}:${item.name}`}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex items-center gap-1 rounded-full border bg-card py-0.5 pr-1 pl-2"
          >
            <span className="shrink-0" style={{ color: item.tint }} aria-hidden="true">
              <LaundryIcon name={item.name} className="h-5 w-5" />
            </span>

            <span className="hidden max-w-[7rem] truncate text-xs font-medium text-foreground min-[380px]:inline">
              {item.name}
            </span>

            <button
              type="button"
              className={CHIP_BTN}
              aria-label={`Remove one ${item.name}`}
              onClick={() => onDec(item.name, item.isCustom)}
            >
              <Minus className="size-3.5" />
            </button>

            <motion.span
              key={item.count}
              initial={reduce ? false : { scale: 1.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 18 }}
              className="grid min-w-[1.5rem] place-items-center rounded-full px-1 text-xs font-bold text-white tabular-nums"
              style={{ background: item.tint }}
            >
              {item.count}
            </motion.span>

            <button
              type="button"
              className={CHIP_BTN}
              aria-label={`Add one ${item.name}`}
              onClick={() => onInc(item.name, item.isCustom)}
            >
              <Plus className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
