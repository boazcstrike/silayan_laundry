/**
 * SQLite-backed {@link AnalyticsStore}.
 *
 * Thin async adapter over the existing synchronous {@link AnalyticsDB}. Keeps
 * all query logic in AnalyticsDB unchanged; this only satisfies the async
 * store contract used by DualAnalyticsStore and the API routes.
 */
import { getAnalyticsDB, type AnalyticsDB, type DateRange, type SubmissionChannel } from '@/lib/services/AnalyticsDB';
import type { ItemCounts } from '@/lib/types/laundry';
import type { AnalyticsStore, ChannelStat, RecordSubmissionOptions } from './AnalyticsStore';

export class SqliteAnalyticsStore implements AnalyticsStore {
  private readonly db: AnalyticsDB;

  constructor(db: AnalyticsDB = getAnalyticsDB()) {
    this.db = db;
  }

  async recordSubmission(counts: ItemCounts, options: RecordSubmissionOptions): Promise<number> {
    return this.db.recordSubmission(counts, options);
  }

  async findRecentDuplicate(
    counts: ItemCounts,
    options: RecordSubmissionOptions,
    withinMinutes: number,
  ): Promise<number | null> {
    return this.db.findRecentDuplicate(counts, options, withinMinutes);
  }

  async getSubmission(id: number) {
    return this.db.getSubmission(id);
  }

  async getRecentSubmissions(limit = 10, offset = 0) {
    return this.db.getRecentSubmissions(limit, offset);
  }

  async getSummary(range?: DateRange) {
    return this.db.getSummary(range);
  }

  async getSubmissionsByDateRange(startDate: string, endDate: string) {
    return this.db.getSubmissionsByDateRange(startDate, endDate);
  }

  async getSubmissionsByChannel(channel: SubmissionChannel, limit = 50) {
    return this.db.getSubmissionsByChannel(channel, limit);
  }

  async getChannelStats(): Promise<ChannelStat[]> {
    return this.db.getChannelStats();
  }

  async getCategoryAverages(limit = 12, range?: DateRange) {
    return this.db.getCategoryAverages(limit, range);
  }

  async getCategoryTimeline(range?: DateRange) {
    return this.db.getCategoryTimeline(range);
  }

  async getDailyCounts(limit = 7, range?: DateRange) {
    return this.db.getDailyCounts(limit, range);
  }

  async getLaundryDays(range?: DateRange) {
    return this.db.getLaundryDays(range);
  }
}
