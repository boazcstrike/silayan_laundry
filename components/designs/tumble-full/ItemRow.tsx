"use client";

import { Minus, Plus, X } from "lucide-react";
import { LaundryIcon } from "@/components/designs/laundry-icons";

interface ItemRowProps {
  name: string;
  count: number;
  tint: string;
  isCustom?: boolean;
  onInc: (name: string, isCustom: boolean) => void;
  onDec: (name: string, isCustom: boolean) => void;
  onSet: (name: string, value: number, isCustom: boolean) => void;
  onRemove?: (name: string) => void;
}

const STEP_BTN =
  "grid min-h-[44px] min-w-[44px] place-items-center rounded-full border bg-card text-foreground transition-colors hover:bg-muted active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40";

/**
 * A single item line. Always LEADS with the tinted icon so identity survives
 * even if the label clips on a narrow screen.
 */
export function ItemRow({
  name,
  count,
  tint,
  isCustom = false,
  onInc,
  onDec,
  onSet,
  onRemove,
}: ItemRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card px-2 py-1.5">
      <span
        className="shrink-0"
        style={{ color: tint }}
        aria-hidden="true"
      >
        <LaundryIcon name={name} className="h-6 w-6" />
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {name}
      </span>

      <button
        type="button"
        className={STEP_BTN}
        aria-label={`Remove one ${name}`}
        disabled={count <= 0}
        onClick={() => onDec(name, isCustom)}
      >
        <Minus className="size-4" />
      </button>

      <input
        type="number"
        min={0}
        inputMode="numeric"
        aria-label={`${name} count`}
        value={count}
        onChange={(e) => {
          const parsed = Number.parseInt(e.target.value, 10);
          onSet(name, Number.isNaN(parsed) ? 0 : parsed, isCustom);
        }}
        className="no-spinner h-11 w-12 rounded-lg border bg-background text-center text-sm font-semibold tabular-nums text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />

      <button
        type="button"
        className={STEP_BTN}
        aria-label={`Add one ${name}`}
        onClick={() => onInc(name, isCustom)}
      >
        <Plus className="size-4" />
      </button>

      {onRemove ? (
        <button
          type="button"
          className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-muted-foreground transition-colors hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Delete custom item ${name}`}
          onClick={() => onRemove(name)}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
