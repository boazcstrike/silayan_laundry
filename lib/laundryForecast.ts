/**
 * Laundry forecasting: predict the next laundry day from past laundry days.
 *
 * Model: Exponentially-Weighted Moving Average (EWMA) of the gaps (in days)
 * between consecutive laundry days. Recent gaps are weighted more heavily than
 * old ones via a decay factor, because recent habits predict the near future
 * better than stale history. A weighted standard deviation gives a confidence
 * band around the prediction.
 */

/** Decay factor for the EWMA. Most recent gap keeps full weight; each older gap
 *  is multiplied by DECAY once more. 0.6 → habits from ~4-5 cycles ago barely count. */
export const DECAY = 0.6;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface LaundryForecast {
  /** true when there are enough distinct laundry days (>= 2) to predict. */
  enoughData: boolean;
  /** number of distinct laundry days used. */
  sampleSize: number;
  /** gaps in days between consecutive laundry days, oldest → newest. */
  gaps: number[];
  /** decay factor used for the weighting. */
  decay: number;
  /** EWMA of the gaps, rounded to whole days — the predicted cycle length. */
  averageGapDays: number;
  /** weighted standard deviation of the gaps (days, 1 decimal). */
  stdDevDays: number;
  /** confidence 0..1 = 1 - coefficient of variation, clamped. */
  confidence: number;
  /** most recent laundry day, ISO YYYY-MM-DD. */
  lastLaundryDate: string | null;
  /** predicted next laundry day, ISO YYYY-MM-DD. */
  nextLaundryDate: string | null;
  /** lower / upper bound of the prediction band, ISO YYYY-MM-DD. */
  nextLaundryDateLow: string | null;
  nextLaundryDateHigh: string | null;
  /** days from `today` until the predicted day (negative = overdue). */
  daysUntilNext: number | null;
}

/** Parse an ISO YYYY-MM-DD string to a UTC-midnight epoch ms. Returns NaN on bad input. */
function isoToUtcMs(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return Number.NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Add `days` to an ISO date and return a new ISO YYYY-MM-DD string. */
export function addDays(iso: string, days: number): string {
  const ms = isoToUtcMs(iso);
  return new Date(ms + Math.round(days) * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Add `months` to an ISO date, clamping the day to the target month's length. */
export function addMonths(iso: string, months: number): string {
  const ms = isoToUtcMs(iso);
  const source = new Date(ms);
  const day = source.getUTCDate();
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const daysInTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, daysInTargetMonth));
  return target.toISOString().slice(0, 10);
}

/** Whole-day difference `b - a` for two ISO dates. */
function diffDays(a: string, b: string): number {
  return Math.round((isoToUtcMs(b) - isoToUtcMs(a)) / MS_PER_DAY);
}

/** Distinct, sorted, valid ISO days from a noisy list of date-ish strings. */
function normalizeDays(rawDays: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of rawDays) {
    if (typeof raw !== "string") continue;
    const iso = raw.slice(0, 10);
    if (!Number.isNaN(isoToUtcMs(iso))) seen.add(iso);
  }
  return Array.from(seen).sort();
}

function emptyForecast(sampleSize: number, lastLaundryDate: string | null): LaundryForecast {
  return {
    enoughData: false,
    sampleSize,
    gaps: [],
    decay: DECAY,
    averageGapDays: 0,
    stdDevDays: 0,
    confidence: 0,
    lastLaundryDate,
    nextLaundryDate: null,
    nextLaundryDateLow: null,
    nextLaundryDateHigh: null,
    daysUntilNext: null,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Predict the next laundry day.
 *
 * @param rawDays  list of laundry day strings (ISO or anything starting YYYY-MM-DD); duplicates ok.
 * @param today    reference "now" as an ISO date; defaults to the current UTC day.
 */
export function forecastNextLaundry(
  rawDays: string[],
  today: string = new Date().toISOString().slice(0, 10),
): LaundryForecast {
  const days = normalizeDays(rawDays);
  const lastDay = days.length ? days[days.length - 1] : null;
  if (days.length < 2) return emptyForecast(days.length, lastDay);

  const gaps: number[] = [];
  for (let i = 1; i < days.length; i += 1) {
    const gap = diffDays(days[i - 1], days[i]);
    if (gap > 0) gaps.push(gap);
  }
  if (!gaps.length) return emptyForecast(days.length, lastDay);

  // EWMA: newest gap (last index) gets weight DECAY^0 = 1.
  const m = gaps.length;
  let weightSum = 0;
  let weightedGapSum = 0;
  const weights: number[] = [];
  for (let i = 0; i < m; i += 1) {
    const weight = DECAY ** (m - 1 - i);
    weights.push(weight);
    weightSum += weight;
    weightedGapSum += weight * gaps[i];
  }
  const weightedMean = weightedGapSum / weightSum;

  let weightedVariance = 0;
  for (let i = 0; i < m; i += 1) {
    weightedVariance += weights[i] * (gaps[i] - weightedMean) ** 2;
  }
  weightedVariance /= weightSum;
  const stdDev = Math.sqrt(weightedVariance);

  const averageGapDays = Math.max(1, Math.round(weightedMean));
  const lowDays = Math.max(1, Math.round(weightedMean - stdDev));
  const highDays = Math.max(averageGapDays, Math.round(weightedMean + stdDev));

  const coefficientOfVariation = weightedMean > 0 ? stdDev / weightedMean : 1;
  const confidence = Number(clamp(1 - coefficientOfVariation, 0, 1).toFixed(2));

  const nextLaundryDate = addDays(lastDay as string, averageGapDays);

  return {
    enoughData: true,
    sampleSize: days.length,
    gaps,
    decay: DECAY,
    averageGapDays,
    stdDevDays: Number(stdDev.toFixed(1)),
    confidence,
    lastLaundryDate: lastDay,
    nextLaundryDate,
    nextLaundryDateLow: addDays(lastDay as string, lowDays),
    nextLaundryDateHigh: addDays(lastDay as string, highDays),
    daysUntilNext: diffDays(today, nextLaundryDate),
  };
}

/** Gap-over-time series for charting: one point per laundry day after the first. */
export interface IntervalPoint {
  date: string;
  gapDays: number;
}

export function buildIntervalHistory(rawDays: string[]): IntervalPoint[] {
  const days = normalizeDays(rawDays);
  const points: IntervalPoint[] = [];
  for (let i = 1; i < days.length; i += 1) {
    const gap = diffDays(days[i - 1], days[i]);
    if (gap > 0) points.push({ date: days[i], gapDays: gap });
  }
  return points;
}

/** One projected future laundry day with a confidence window that widens over time. */
export interface ProjectionPoint {
  /** 1-based occurrence index counted from the last real laundry day. */
  occurrence: number;
  /** predicted day, ISO YYYY-MM-DD. */
  date: string;
  /** days from `today` to the predicted day. */
  daysFromNow: number;
  /** confidence window bounds, ISO YYYY-MM-DD. */
  low: string;
  high: string;
  /** confidence window bounds expressed as days from `today` (for charting). */
  lowDaysFromNow: number;
  highDaysFromNow: number;
  /** half-width of the window in days (stdDev · √occurrence). */
  spreadDays: number;
  /** calendar month bucket, YYYY-MM. */
  month: string;
}

const MAX_PROJECTION_POINTS = 60;

/**
 * Roll the predicted cycle forward and emit every laundry day expected within
 * `monthsAhead` months of `today`. Past-due occurrences are skipped so the
 * series only looks forward. Uncertainty compounds with the horizon (random
 * walk): the window half-width is stdDev · √occurrence.
 */
export function projectLaundryDays(
  forecast: LaundryForecast,
  monthsAhead = 6,
  today: string = new Date().toISOString().slice(0, 10),
): ProjectionPoint[] {
  if (!forecast.enoughData || !forecast.lastLaundryDate) return [];
  const cycle = forecast.averageGapDays;
  const sigma = forecast.stdDevDays;
  if (cycle < 1) return [];

  const horizon = addMonths(today, monthsAhead);
  const lastDay = forecast.lastLaundryDate;

  // Skip occurrences whose predicted day is already in the past.
  let k = 1;
  while (k < MAX_PROJECTION_POINTS && diffDays(today, addDays(lastDay, cycle * k)) < 0) {
    k += 1;
  }

  const points: ProjectionPoint[] = [];
  for (; k <= MAX_PROJECTION_POINTS; k += 1) {
    const date = addDays(lastDay, cycle * k);
    if (date > horizon) break;
    const spreadDays = Math.round(sigma * Math.sqrt(k));
    const low = addDays(lastDay, cycle * k - spreadDays);
    const high = addDays(lastDay, cycle * k + spreadDays);
    points.push({
      occurrence: k,
      date,
      daysFromNow: diffDays(today, date),
      low,
      high,
      lowDaysFromNow: diffDays(today, low),
      highDaysFromNow: diffDays(today, high),
      spreadDays,
      month: date.slice(0, 7),
    });
  }
  return points;
}
