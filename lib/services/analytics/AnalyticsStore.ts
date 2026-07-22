/**
 * Backend-agnostic analytics store interface.
 *
 * Both the SQLite and MongoDB implementations satisfy this contract, and
 * {@link DualAnalyticsStore} composes them (write both, read Mongo with SQLite
 * fallback). All methods are async: SQLite calls are synchronous under the
 * hood but are wrapped so the interface can also back an async Mongo driver.
 *
 * Read methods return the SAME shapes already exported by {@link AnalyticsDB}
 * so the API routes and dashboard need no reshaping regardless of backend.
 */
import type { ItemCounts } from '@/lib/types/laundry';
import type {
  AnalyticsSummary,
  CategoryAverage,
  CategoryTimelineRow,
  DailyCount,
  FullSubmission,
  SubmissionChannel,
} from '@/lib/services/AnalyticsDB';

/** Options accepted when recording a submission. */
export interface RecordSubmissionOptions {
  channel: SubmissionChannel;
  customerReference?: string;
  scenario?: string;
  channelSuccess?: boolean;
}

/** Channel breakdown row. */
export interface ChannelStat {
  channel: SubmissionChannel;
  count: number;
  successRate: number;
}

export interface AnalyticsStore {
  /**
   * Persist a submission (only non-zero item counts are stored) and return the
   * canonical numeric id (the SQLite row id in the dual-write setup).
   */
  recordSubmission(counts: ItemCounts, options: RecordSubmissionOptions): Promise<number>;

  getSubmission(id: number): Promise<FullSubmission | null>;
  getRecentSubmissions(limit?: number): Promise<FullSubmission[]>;
  getSummary(): Promise<AnalyticsSummary>;
  getSubmissionsByDateRange(startDate: string, endDate: string): Promise<FullSubmission[]>;
  getSubmissionsByChannel(channel: SubmissionChannel, limit?: number): Promise<FullSubmission[]>;
  getChannelStats(): Promise<ChannelStat[]>;
  getCategoryAverages(limit?: number): Promise<CategoryAverage[]>;
  getCategoryTimeline(): Promise<CategoryTimelineRow[]>;
  getDailyCounts(limit?: number): Promise<DailyCount[]>;
  getLaundryDays(): Promise<string[]>;
}
