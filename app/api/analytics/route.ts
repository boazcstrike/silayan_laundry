import { NextResponse } from "next/server";
import { getAnalyticsStore } from "@/lib/services/analytics";
import {
  buildIntervalHistory,
  forecastNextLaundry,
  projectLaundryDays,
} from "@/lib/laundryForecast";
import { forecastCategoryLoads } from "@/lib/laundryLoadForecast";

export const runtime = "nodejs";

/**
 * GET /api/analytics
 *
 * Assembles the laundry analytics dashboard payload from the local SQLite
 * database and runs the cadence + per-category load forecasts. Native
 * `better-sqlite3` access via {@link AnalyticsDB} — no remote DB client.
 */
export async function GET() {
  try {
    const store = getAnalyticsStore();

    const [summary, categoryAverages, categoryTimeline, daily, laundryDays] = await Promise.all([
      store.getSummary(),
      store.getCategoryAverages(),
      store.getCategoryTimeline(),
      store.getDailyCounts(7),
      store.getLaundryDays(),
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
