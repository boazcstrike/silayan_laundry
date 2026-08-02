"use client";

/**
 * Design proposal B — "Tumble · Full Deck".
 *
 * The tumbling-icon drum PLUS an inline selected-items icon strip (this
 * proposal's signature, mobile-first primary surface). Every category and item
 * is rendered, custom items can be added/removed, batches of 15 items make one
 * wash load, and the full Download / Send to Discord / Reset actions are wired.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import {
  useLaundryItems,
  usePrefillCounts,
  useImageGeneration,
  useDiscordUpload,
  useSubmission,
} from "@/hooks";
import { getItemTint } from "@/components/designs/laundry-icons";
// Draft 6 ("Porcelain Onyx") is the approved live machine — promoted straight
// from the /proposed-designs gallery via the shared WasherDraftProps contract.
import { Draft6 } from "@/components/designs/washer-drafts/Draft6";
import type { PileStyle } from "./PileStyles";
import { IconStrip } from "./IconStrip";
import { LoadGauge } from "./LoadGauge";
import { Mascot } from "./Mascot";
import { ItemRow } from "./ItemRow";
import { ActionBar } from "./ActionBar";
import type { DrumUnit, Selected } from "./types";
// When a load fills to 100% the drum shakes for this long before it empties.
// Shared so washer chrome (LCD countdowns) derives from the same number.
import { WASH_MS } from "./washTiming";

const LOAD = 15;
// Ignore the loadsDone jump that hydration causes on mount (restored counts)
// so the page never opens mid-wash.
const WASH_ARM_DELAY_MS = 500;

const EMPTY_UNITS: DrumUnit[] = [];

type CategoryItem = { name: string; x: number; y: number; group?: string };

interface TumbleFullProps {
  categories: Record<string, CategoryItem[]>;
}

export default function TumbleFull({ categories }: TumbleFullProps) {
  const reduce = useReducedMotion();

  const {
    items,
    customItems,
    updateCount,
    setCount,
    resetCounts,
    addCustomItem,
    removeCustomItem,
  } = useLaundryItems(categories);

  const {
    generateImage,
    isGenerating,
    error: imageError,
    clearError: clearImageError,
  } = useImageGeneration(categories);
  const {
    uploadImage,
    isUploading,
    isConfigured,
    error: discordError,
    clearError: clearDiscordError,
  } = useDiscordUpload();
  const { recordSubmission } = useSubmission();

  const [spinCount, setSpinCount] = useState(0);
  const [isWashing, setIsWashing] = useState(false);
  // Total at which the last full-load wash finished. While the count still
  // rests exactly on that boundary the drum shows freshly emptied — the
  // "reset the count inside the machine" moment.
  const [washedBoundary, setWashedBoundary] = useState(-1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  // Drum fill: client picked "Tumble Toss". Swap here to try "heap" | "stack" |
  // "water" — all renderers still live in PileStyles.tsx.
  const pile: PileStyle = "toss";

  // --- tint resolution (color by category; custom items use "Other Items") ---
  const categoryOf = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [category, list] of Object.entries(categories)) {
      for (const item of list) map[item.name] = category;
    }
    return map;
  }, [categories]);

  const tintOf = useCallback(
    (name: string, isCustom: boolean): string =>
      getItemTint(isCustom ? "Other Items" : categoryOf[name] ?? "Regular Laundry"),
    [categoryOf],
  );

  // --- batch logic (15 items = 1 load) ---
  const total = useMemo(() => {
    let sum = 0;
    for (const value of Object.values(items)) sum += value;
    for (const value of Object.values(customItems)) sum += value;
    return sum;
  }, [items, customItems]);

  // --- forecast prefill (?prefill= from the history page) -------------------
  const knownItemNames = useMemo(
    () => new Set(Object.values(categories).flat().map((item) => item.name)),
    [categories],
  );
  // Ref-backed so the mount-only prefill hook reads the live (post-hydration)
  // total rather than the first render's zeros.
  const totalRef = useRef(total);
  totalRef.current = total;
  const getCurrentTotal = useCallback(() => totalRef.current, []);
  usePrefillCounts({ knownItemNames, setCount, addCustomItem, getCurrentTotal });

  const loadsDone = Math.floor(total / LOAD);
  const batchesNeeded = Math.ceil(total / LOAD);
  const cycle = total % LOAD;
  const cycleTotal = total > 0 && cycle === 0 ? LOAD : cycle;
  const fill = cycleTotal / LOAD;

  // --- full-load wash ceremony: shake the drum + contents, then empty it -----
  const loadsRef = useRef(loadsDone);
  loadsRef.current = loadsDone;
  const prevLoadsRef = useRef(loadsDone);
  const washArmed = useRef(false);
  const washTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arm detection only after mount so restoring saved counts (which can jump
  // loadsDone from 0 to N during hydration) does not fire a phantom wash.
  useEffect(() => {
    const t = setTimeout(() => {
      prevLoadsRef.current = loadsRef.current;
      washArmed.current = true;
    }, WASH_ARM_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!washArmed.current) return;
    if (loadsDone > prevLoadsRef.current) {
      setIsWashing(true);
      if (washTimer.current) clearTimeout(washTimer.current);
      washTimer.current = setTimeout(() => {
        setIsWashing(false);
        setWashedBoundary(loadsRef.current * LOAD);
      }, WASH_MS);
    }
    prevLoadsRef.current = loadsDone;
  }, [loadsDone]);

  useEffect(
    () => () => {
      if (washTimer.current) clearTimeout(washTimer.current);
    },
    [],
  );

  // After the wash, hold the drum empty while the count still rests on the
  // completed boundary (e.g. exactly 15). Counting one more item moves total
  // off the boundary and the next load starts filling normally.
  const drumReset =
    !isWashing && total > 0 && total % LOAD === 0 && washedBoundary === total;

  // --- selected items (count > 0) across regular + custom ---
  const selected = useMemo<Selected[]>(() => {
    const out: Selected[] = [];
    for (const [name, count] of Object.entries(items)) {
      if (count > 0) out.push({ name, count, isCustom: false, tint: tintOf(name, false) });
    }
    for (const [name, count] of Object.entries(customItems)) {
      if (count > 0) out.push({ name, count, isCustom: true, tint: tintOf(name, true) });
    }
    return out;
  }, [items, customItems, tintOf]);

  // --- current-load glyph units for the drum (flatten, slice, cap 15) ---
  const units = useMemo<DrumUnit[]>(() => {
    const flat: DrumUnit[] = [];
    for (const item of selected) {
      for (let i = 0; i < item.count; i += 1) {
        flat.push({ id: `${item.isCustom ? "c" : "r"}:${item.name}#${i}`, name: item.name, tint: item.tint });
      }
    }
    return flat.slice(0, Math.min(cycleTotal, LOAD));
  }, [selected, cycleTotal]);

  // Drum + gauge read empty during the post-wash reset hold.
  const drumUnits = drumReset ? EMPTY_UNITS : units;
  const drumFill = drumReset ? 0 : fill;

  // --- event-driven spin (NOT an effect watching total) ---
  const bumpSpin = useCallback(() => setSpinCount((count) => count + 1), []);

  const handleInc = useCallback(
    (name: string, isCustom: boolean) => {
      updateCount(name, 1, isCustom);
      bumpSpin();
    },
    [updateCount, bumpSpin],
  );

  const handleDec = useCallback(
    (name: string, isCustom: boolean) => {
      updateCount(name, -1, isCustom);
      bumpSpin();
    },
    [updateCount, bumpSpin],
  );

  const handleSet = useCallback(
    (name: string, value: number, isCustom: boolean) => {
      setCount(name, value, isCustom);
      bumpSpin();
    },
    [setCount, bumpSpin],
  );

  const handleAddCustom = useCallback(() => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    addCustomItem(trimmed);
    setCustomName("");
  }, [customName, addCustomItem]);

  // --- submission actions ---
  const getAllCounts = useCallback(
    () => ({ ...items, ...customItems }),
    [items, customItems],
  );

  const handleDownload = useCallback(async () => {
    clearImageError();
    clearDiscordError();
    setActionError(null);
    try {
      const blob = await generateImage(items);
      const ts = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `laundry-output-${ts}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      recordSubmission(getAllCounts(), "download", true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Download failed");
    }
  }, [
    generateImage,
    items,
    recordSubmission,
    getAllCounts,
    clearImageError,
    clearDiscordError,
  ]);

  const handleSendToDiscord = useCallback(async () => {
    clearImageError();
    clearDiscordError();
    setActionError(null);
    let success = false;
    try {
      const blob = await generateImage(items);
      const ts = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
      const filename = `laundry-output-${ts}.png`;
      success = await uploadImage(
        blob,
        filename,
        `Laundry submission (${new Date().toLocaleString("en-US")})`,
      );
      if (!success) throw new Error(discordError ?? "Discord upload failed");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Discord send failed");
    } finally {
      recordSubmission(getAllCounts(), "discord", success);
    }
  }, [
    generateImage,
    items,
    uploadImage,
    discordError,
    recordSubmission,
    getAllCounts,
    clearImageError,
    clearDiscordError,
  ]);

  const dismissError = useCallback(() => {
    setActionError(null);
    clearImageError();
    clearDiscordError();
  }, [clearImageError, clearDiscordError]);

  const combinedError = actionError ?? imageError ?? discordError ?? null;

  const customList = useMemo(() => Object.keys(customItems), [customItems]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-4"
      >
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Bo&apos;s Laundry App
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Count your laundry — icons tumble in the drum and every selected item
          rides along in the strip below.
        </p>
      </motion.header>

      {/* Sticky primary surface: machine + gauge + the signature icon strip.
          Capped at ~50dvh and split into two even columns so the machine
          never crowds the category list off the bottom of the viewport. */}
      <div className="sticky top-2 z-10 mb-6 max-h-[50dvh] overflow-y-auto rounded-2xl border bg-card/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-row items-stretch gap-3">
          <div className="w-1/2 shrink-0 self-center">
            <Draft6
              units={drumUnits}
              fill={drumFill}
              spinCount={spinCount}
              total={total}
              loadsDone={loadsDone}
              pileStyle={pile}
              isWashing={isWashing}
            />
          </div>
          <div className="flex w-1/2 flex-col justify-center gap-2">
            <Mascot total={total} fill={drumFill} />
            {/* Selected items ride in the empty middle, between mascot + gauge. */}
            <div className="min-h-0 flex-1 overflow-y-auto max-h-[7rem]">
              <IconStrip selected={selected} onInc={handleInc} onDec={handleDec} />
            </div>
            <LoadGauge fill={drumFill} loadsDone={loadsDone} batchesNeeded={batchesNeeded} />
          </div>
        </div>
      </div>

      {/* Full catalog — every category, every item. */}
      <div className="space-y-6">
        {Object.entries(categories).map(([category, list]) => (
          <section key={category}>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ background: getItemTint(category) }}
                aria-hidden="true"
              />
              <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
                {category}
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((item) => (
                <ItemRow
                  key={item.name}
                  name={item.name}
                  count={items[item.name] ?? 0}
                  tint={tintOf(item.name, false)}
                  onInc={handleInc}
                  onDec={handleDec}
                  onSet={handleSet}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Custom items */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: getItemTint("Other Items") }}
              aria-hidden="true"
            />
            <h2 className="text-sm font-bold tracking-wide text-foreground uppercase">
              Custom items
            </h2>
          </div>

          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
              placeholder="Add a custom item…"
              aria-label="New custom item name"
              className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={customName.trim().length === 0}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
            >
              <Plus className="size-4" /> Add
            </button>
          </div>

          {customList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom items yet. Add anything the catalog is missing.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {customList.map((name) => (
                <ItemRow
                  key={name}
                  name={name}
                  count={customItems[name] ?? 0}
                  tint={tintOf(name, true)}
                  isCustom
                  onInc={handleInc}
                  onDec={handleDec}
                  onSet={handleSet}
                  onRemove={removeCustomItem}
                />
              ))}
            </div>
          )}
        </section>

        {/* Submission actions */}
        <section className="pt-2">
          <ActionBar
            onDownload={handleDownload}
            onDiscord={handleSendToDiscord}
            onReset={resetCounts}
            isGenerating={isGenerating}
            isUploading={isUploading}
            isConfigured={isConfigured}
            error={combinedError}
            onDismissError={dismissError}
          />
        </section>
      </div>
    </div>
  );
}
