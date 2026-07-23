"use client";

/**
 * Shared lazy-chart barrel.
 *
 * The analytics page loads its three recharts-backed panels via `next/dynamic`.
 * Pointing every `dynamic()` call at THIS single module specifier makes the
 * bundler emit one shared async chunk for all of them — recharts (~400 KB
 * minified) is downloaded once instead of once per chart. Keep every
 * dynamically-loaded chart component exported from here.
 */

export { CategoryAverageChart } from "./CategoryAverageChart";
export { CurrentLoadChart } from "./CurrentLoadChart";
export { LaundryForecastPanel } from "./LaundryForecastPanel";
