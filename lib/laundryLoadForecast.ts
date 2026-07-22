/**
 * Per-category laundry load forecasting.
 *
 * The flat "average per batch" gives every future wash the same basket. Real
 * baskets drift: some items trend up, some fade out, some are one-offs. This
 * module fits a per-category trend to the history and rolls it forward so each
 * predicted wash day gets its own, category-specific item counts.
 *
 * Model — recency-weighted least-squares linear trend with damped extrapolation:
 *
 *   yhat_c(t) = clip( L_c + b_c · S·(1 − e^(−Δ/S)),  0,  CAP_MULT · max_i y_i )
 *
 *   - (a_c, b_c) : weighted linear regression of count vs. day for category c,
 *                  with the category's count = 0 in batches where it was absent.
 *   - w_i = DECAY^(N−1−i) : recency weights (newest batch = weight 1).
 *   - L_c = a_c + b_c · t_last : fitted level at the last real wash.
 *   - Δ = t − t_last : days from the last real wash to the predicted day.
 *   - S : saturation scale (days). The damped term S·(1−e^(−Δ/S)) → S as Δ→∞,
 *         so a trend bends to a plateau instead of running away over 6 months.
 *   - cap = CAP_MULT · historical max keeps a rising trend physically sane.
 */

export const LOAD_DECAY = 0.7;
export const SATURATION_DAYS = 60;
export const CAP_MULT = 1.5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CategoryHistoryRow {
  /** laundry day, ISO YYYY-MM-DD (or a string starting with it). */
  day: string;
  /** category / item name. */
  name: string;
  /** item count on that day for that category. */
  count: number;
}

export interface LoadForecastPoint {
  /** predicted laundry day, ISO YYYY-MM-DD. */
  date: string;
  /** expected item count per category on that day. */
  byCategory: Record<string, number>;
  /** sum of expected counts across all categories. */
  total: number;
}

export interface LoadForecast {
  /** categories ranked by total forecasted volume, descending. */
  categories: Array<{ name: string; total: number }>;
  /** one entry per projected laundry day. */
  points: LoadForecastPoint[];
}

function isoToUtcMs(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function diffDays(a: string, b: string): number {
  return Math.round((isoToUtcMs(b) - isoToUtcMs(a)) / MS_PER_DAY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Weighted least-squares slope & intercept for points {t, y, w}. */
function weightedLinearFit(points: Array<{ t: number; y: number; w: number }>): {
  intercept: number;
  slope: number;
} {
  let sumW = 0;
  let sumWt = 0;
  let sumWy = 0;
  let sumWtt = 0;
  let sumWty = 0;
  for (const point of points) {
    sumW += point.w;
    sumWt += point.w * point.t;
    sumWy += point.w * point.y;
    sumWtt += point.w * point.t * point.t;
    sumWty += point.w * point.t * point.y;
  }
  if (sumW === 0) return { intercept: 0, slope: 0 };
  const denominator = sumW * sumWtt - sumWt * sumWt;
  const slope = Math.abs(denominator) > 1e-9 ? (sumW * sumWty - sumWt * sumWy) / denominator : 0;
  const intercept = (sumWy - slope * sumWt) / sumW;
  return { intercept, slope };
}

/** Sorted distinct ISO days from a noisy list. */
function normalizeDays(days: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of days) {
    if (typeof raw !== "string") continue;
    const iso = raw.slice(0, 10);
    if (!Number.isNaN(isoToUtcMs(iso))) seen.add(iso);
  }
  return Array.from(seen).sort();
}

/**
 * Forecast per-category item counts for each projected laundry day.
 *
 * @param history          per-day per-category counts (rows for present items only).
 * @param laundryDays      the distinct historical laundry days (defines zero-fill).
 * @param projectionDates  the future predicted laundry days to forecast for.
 */
export function forecastCategoryLoads(
  history: CategoryHistoryRow[],
  laundryDays: string[],
  projectionDates: string[],
): LoadForecast {
  const days = normalizeDays(laundryDays);
  const futureDates = normalizeDays(projectionDates);
  if (days.length === 0 || futureDates.length === 0) {
    return { categories: [], points: [] };
  }

  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  const tLast = diffDays(firstDay, lastDay);
  const dayIndex = new Map(days.map((day, index) => [day, index]));

  // Build a zero-filled count series per category across every batch.
  const series = new Map<string, number[]>();
  for (const row of history) {
    const day = String(row.day).slice(0, 10);
    const index = dayIndex.get(day);
    if (index === undefined) continue;
    if (!series.has(row.name)) series.set(row.name, new Array(days.length).fill(0));
    series.get(row.name)![index] += Number(row.count) || 0;
  }
  if (series.size === 0) return { categories: [], points: [] };

  const N = days.length;
  const weights = days.map((_, i) => LOAD_DECAY ** (N - 1 - i));
  const times = days.map((day) => diffDays(firstDay, day));

  // Fit each category once.
  const fits = new Map<string, { level: number; slope: number; cap: number }>();
  for (const [name, counts] of series) {
    const points = counts.map((y, i) => ({ t: times[i], y, w: weights[i] }));
    const { intercept, slope } = weightedLinearFit(points);
    const max = Math.max(0, ...counts);
    const level = Math.max(0, intercept + slope * tLast);
    fits.set(name, { level, slope, cap: Math.max(1, max * CAP_MULT) });
  }

  const totals = new Map<string, number>();
  const points: LoadForecastPoint[] = futureDates.map((date) => {
    const t = diffDays(firstDay, date);
    const delta = Math.max(0, t - tLast);
    const damped = SATURATION_DAYS * (1 - Math.exp(-delta / SATURATION_DAYS));
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const [name, fit] of fits) {
      const expected = round1(clamp(fit.level + fit.slope * damped, 0, fit.cap));
      if (expected <= 0) continue;
      byCategory[name] = expected;
      total += expected;
      totals.set(name, (totals.get(name) || 0) + expected);
    }
    return { date, byCategory, total: round1(total) };
  });

  const categories = Array.from(totals.entries())
    .map(([name, total]) => ({ name, total: round1(total) }))
    .sort((a, b) => b.total - a.total);

  return { categories, points };
}
