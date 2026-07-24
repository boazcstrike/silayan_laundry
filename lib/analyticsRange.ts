/**
 * Quick date-range presets for the analytics dashboard.
 *
 * Presets resolve to an inclusive local-day {@link DateRange} (`YYYY-MM-DD`
 * bounds) that scopes every dashboard read. Bounds are computed in the server's
 * local timezone to match the denormalized local grouping day used by both the
 * SQLite and Mongo stores (see docs/data-layer.md).
 */
import type { DateRange } from '@/lib/services/AnalyticsDB';

/** Identifiers accepted by the `?range=` query param. */
export type RangeKey = 'all' | '1m' | '2m' | '6m' | 'year';

/** Default when no (or an unknown) range is requested. */
export const DEFAULT_RANGE: RangeKey = 'all';

/** Ordered presets for rendering the quick-filter chips. */
export const RANGE_PRESETS: { key: RangeKey; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: '1m', label: 'Past month' },
  { key: '2m', label: 'Past 2 months' },
  { key: '6m', label: 'Past 6 months' },
  { key: 'year', label: 'This year' },
];

const RANGE_KEYS = new Set<RangeKey>(RANGE_PRESETS.map((preset) => preset.key));

/** Narrow an arbitrary string to a known {@link RangeKey}, else the default. */
export function normalizeRangeKey(value: string | null | undefined): RangeKey {
  return value && RANGE_KEYS.has(value as RangeKey) ? (value as RangeKey) : DEFAULT_RANGE;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local `YYYY-MM-DD` (matches SQLite `date(...,'localtime')` / Mongo `day`). */
function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Rolling window ending today, spanning back `months` calendar months.
 *
 * The start day is clamped to the target month's last day so month-end dates do
 * not overflow — without this, "past month" from Mar 31 would land on Feb 31 and
 * roll forward to Mar 3, collapsing the window to a few days.
 */
function rolling(now: Date, months: number): DateRange {
  const year = now.getFullYear();
  const month = now.getMonth() - months;
  // Day 0 of the following month = last day of the target month.
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const start = new Date(year, month, Math.min(now.getDate(), lastDayOfMonth));
  return { start: localDay(start), end: localDay(now) };
}

/**
 * Resolve a range key to a concrete {@link DateRange}, or `undefined` for the
 * all-time view (no filtering). `now` is injectable for testing.
 */
export function resolveRange(key: RangeKey, now: Date = new Date()): DateRange | undefined {
  switch (key) {
    case '1m':
      return rolling(now, 1);
    case '2m':
      return rolling(now, 2);
    case '6m':
      return rolling(now, 6);
    case 'year':
      return { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
    case 'all':
    default:
      return undefined;
  }
}
