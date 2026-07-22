import type {
  IntervalPoint,
  LaundryForecast,
  ProjectionPoint,
} from "@/lib/laundryForecast";
import type { LoadForecast } from "@/lib/laundryLoadForecast";
import type {
  CategoryAverage,
  CategoryTimelineRow,
  DailyCount,
} from "@/lib/services/AnalyticsDB";

/** Forecast object as assembled by GET /api/analytics. */
export type ForecastPayload = LaundryForecast & {
  projection: ProjectionPoint[];
  loadForecast: LoadForecast;
};

/** Full payload returned by GET /api/analytics. */
export interface AnalyticsResponse {
  totalSubmissions: number;
  successfulSubmissions: number;
  failedSubmissions: number;
  averageItemsPerSubmission: number;
  items: { name: string; totalCount: number }[];
  categoryAverages: CategoryAverage[];
  categoryTimeline: CategoryTimelineRow[];
  daily: DailyCount[];
  forecast: ForecastPayload;
  intervalHistory: IntervalPoint[];
}
