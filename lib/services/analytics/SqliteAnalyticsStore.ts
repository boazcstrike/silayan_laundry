/**
 * SQLite-backed {@link AnalyticsStore}.
 *
 * Thin async adapter over the existing synchronous {@link AnalyticsDB}. Keeps
 * all query logic in AnalyticsDB unchanged; this only satisfies the async
 * store contract used by DualAnalyticsStore and the API routes.
 */
import { getAnalyticsDB, type AnalyticsDB, type SubmissionChannel } from '@/lib/services/AnalyticsDB';
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

  async getSubmission(id: number) {
    return this.db.getSubmission(id);
  }

  async getRecentSubmissions(limit = 10) {
    return this.db.getRecentSubmissions(limit);
  }

  async getSummary() {
    return this.db.getSummary();
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

  async getCategoryAverages(limit = 12) {
    return this.db.getCategoryAverages(limit);
  }

  async getCategoryTimeline() {
    return this.db.getCategoryTimeline();
  }

  async getDailyCounts(limit = 7) {
    return this.db.getDailyCounts(limit);
  }

  async getLaundryDays() {
    return this.db.getLaundryDays();
  }
}
