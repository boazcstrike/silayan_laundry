import {
  DEFAULT_RANGE,
  normalizeRangeKey,
  RANGE_PRESETS,
  resolveRange,
} from '@/lib/analyticsRange';

// Fixed reference instant: 2026-07-23 (a mid-year, mid-month day so the rolling
// windows don't collapse onto month/year boundaries).
const NOW = new Date(2026, 6, 23, 14, 30, 0); // month is 0-based → July

describe('normalizeRangeKey', () => {
  it('accepts every known preset key', () => {
    for (const preset of RANGE_PRESETS) {
      expect(normalizeRangeKey(preset.key)).toBe(preset.key);
    }
  });

  it('falls back to the default for unknown, null, or empty input', () => {
    expect(normalizeRangeKey('bogus')).toBe(DEFAULT_RANGE);
    expect(normalizeRangeKey(null)).toBe(DEFAULT_RANGE);
    expect(normalizeRangeKey(undefined)).toBe(DEFAULT_RANGE);
    expect(normalizeRangeKey('')).toBe(DEFAULT_RANGE);
  });
});

describe('resolveRange', () => {
  it('returns undefined (no filter) for the all-time view', () => {
    expect(resolveRange('all', NOW)).toBeUndefined();
  });

  it('computes a rolling one-month window ending today', () => {
    expect(resolveRange('1m', NOW)).toEqual({ start: '2026-06-23', end: '2026-07-23' });
  });

  it('computes a rolling two-month window', () => {
    expect(resolveRange('2m', NOW)).toEqual({ start: '2026-05-23', end: '2026-07-23' });
  });

  it('computes a rolling six-month window', () => {
    expect(resolveRange('6m', NOW)).toEqual({ start: '2026-01-23', end: '2026-07-23' });
  });

  it('spans the full current calendar year for the year preset', () => {
    expect(resolveRange('year', NOW)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });

  it('rolls back across a year boundary correctly', () => {
    // 2026-02-10 minus 6 months → 2025-08-10.
    const feb = new Date(2026, 1, 10, 9, 0, 0);
    expect(resolveRange('6m', feb)).toEqual({ start: '2025-08-10', end: '2026-02-10' });
  });

  it('clamps to the last day of a shorter target month instead of overflowing', () => {
    // 2026-03-31 minus 1 month has no Feb 31 — clamp to 2026-02-28, do not roll
    // forward into March (which would collapse the window to a few days).
    const mar31 = new Date(2026, 2, 31, 12, 0, 0);
    expect(resolveRange('1m', mar31)).toEqual({ start: '2026-02-28', end: '2026-03-31' });

    // 2026-05-31 minus 1 month → April has 30 days.
    const may31 = new Date(2026, 4, 31, 12, 0, 0);
    expect(resolveRange('1m', may31)).toEqual({ start: '2026-04-30', end: '2026-05-31' });
  });

  it('zero-pads single-digit months and days', () => {
    // 2026-03-05 minus 1 month → 2026-02-05, both padded.
    const mar = new Date(2026, 2, 5, 0, 0, 0);
    expect(resolveRange('1m', mar)).toEqual({ start: '2026-02-05', end: '2026-03-05' });
  });
});
