/**
 * Shared types for the submission history page.
 *
 * `FullSubmission` is the exact shape both analytics stores already return
 * (type-only import, so no server code leaks into the client bundle), and
 * `HistoryResponse` mirrors GET /api/submissions?type=history.
 */
import type { FullSubmission } from '@/lib/services/AnalyticsDB';

export type { FullSubmission };
export type { AnalyticsResponse, ForecastPayload } from '@/components/analytics/types';

/** Payload returned by GET /api/submissions?type=history. */
export interface HistoryResponse {
  submissions: FullSubmission[];
  limit: number;
  offset: number;
  hasMore: boolean;
}
