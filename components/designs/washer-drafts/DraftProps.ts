/**
 * Shared contract every washer draft must implement. Mirrors the props the
 * production {@link WashingMachine} receives from TumbleFull so any approved
 * draft can be dropped in without touching the container.
 */

import type { PileStyle } from "@/components/designs/tumble-full/PileStyles";
import type { DrumUnit } from "@/components/designs/tumble-full/types";

export interface WasherDraftProps {
  /** Current-load glyphs to tumble inside the drum (max 15). */
  units: DrumUnit[];
  /** Current-load fill ratio, 0..1. */
  fill: number;
  /** Accumulated spin impulses — drives drum rotation. */
  spinCount: number;
  /** Total items counted across all loads. */
  total: number;
  /** Completed wash loads. */
  loadsDone: number;
  /** Drum pile renderer style ("toss" in production). */
  pileStyle: PileStyle;
  /** True while the full-load wash ceremony runs. */
  isWashing: boolean;
  /**
   * True when many machines are mounted at once (compare-all grid). Drafts
   * treat it like reduced motion for IDLE-ONLY loops (glint sweeps, escapement
   * ticks, flap blinks, bulb flicker) while keeping wash ceremony loops.
   */
  degraded?: boolean;
}
