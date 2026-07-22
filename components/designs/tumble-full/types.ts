/**
 * Shared types for the "Tumble · Full Deck" proposal.
 * Kept in one place so the drum, strip, and rows agree on shape (no `any`).
 */

/** A regular or custom item the user has chosen (count > 0). */
export interface Selected {
  name: string;
  count: number;
  isCustom: boolean;
  /** Resolved tint token (e.g. `var(--chart-2)`) for the item's category. */
  tint: string;
}

/** One tumbling glyph inside the drum (a single unit of a selected item). */
export interface DrumUnit {
  id: string;
  name: string;
  tint: string;
}

/** Bump the drum spin counter. Called from increment/decrement handlers. */
export type BumpSpin = () => void;
