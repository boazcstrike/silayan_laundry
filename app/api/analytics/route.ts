import { NextResponse } from "next/server";
import { getAnalyticsStore } from "@/lib/services/analytics";
import {
  buildIntervalHistory,
  forecastNextLaundry,
  projectLaundryDays,
} from "@/lib/laundryForecast";
import { forecastCategoryLoads } from "@/lib/laundryLoadForecast";
import { normalizeRangeKey, resolveRange } from "@/lib/analyticsRange";

export const runtime = "nodejs";

/**
 * GET /api/analytics?range=all|1m|2m|6m|year
 *
 * Assembles the laundry analytics dashboard payload from the local SQLite
 * database and runs the cadence + per-category load forecasts. The optional
 * `range` quick-filter scopes every read (summary, charts, forecast) to an
 * inclusive local-day window; omit or pass `all` for the full history. Native
 * `better-sqlite3` access via {@link AnalyticsDB} — no remote DB client.
 */
export async function GET(request: Request) {
  try {
    const store = getAnalyticsStore();

    const rangeKey = normalizeRangeKey(
      new URL(request.url).searchParams.get("range"),
    );
    const range = resolveRange(rangeKey);

    const [summary, categoryAverages, categoryTimeline, daily, laundryDays] = await Promise.all([
      store.getSummary(range),
      store.getCategoryAverages(undefined, range),
      store.getCategoryTimeline(range),
      store.getDailyCounts(7, range),
      store.getLaundryDays(range),
    ]);

    const forecast = forecastNextLaundry(laundryDays);
    const projection = projectLaundryDays(forecast, 6);
    const loadForecast = forecastCategoryLoads(
      categoryTimeline,
      laundryDays,
      projection.map((point) => point.date),
    );
    const intervalHistory = buildIntervalHistory(laundryDays);

    return NextResponse.json({
      totalSubmissions: summary.totalSubmissions,
      successfulSubmissions: summary.successfulSubmissions,
      failedSubmissions: summary.failedSubmissions,
      averageItemsPerSubmission: summary.averageItemsPerSubmission,
      items: summary.mostFrequentItems.map((item) => ({
        name: item.name,
        totalCount: item.totalCount,
      })),
      categoryAverages,
      categoryTimeline,
      daily,
      recent: summary.recentSubmissions,
      forecast: { ...forecast, projection, loadForecast },
      intervalHistory,
    });
  } catch (error) {
    console.error("Failed to read laundry analytics:", error);
    return NextResponse.json(
      { error: "Failed to read laundry analytics" },
      { status: 500 },
    );
  }
}
