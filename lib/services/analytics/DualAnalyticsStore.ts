/**
 * Dual-write analytics store.
 *
 * Writes every submission to SQLite (canonical local copy, generates the id)
 * and then to MongoDB (analytics source of truth, tagged with the SQLite id).
 * A Mongo write failure is logged and swallowed — SQLite still holds the record
 * and recording is non-critical to the user flow.
 *
 * Reads prefer Mongo and fall back to SQLite when Mongo is unreachable, so the
 * dashboard degrades gracefully instead of erroring.
 */
import type { ItemCounts } from '@/lib/types/laundry';
import type { SubmissionChannel } from '@/lib/services/AnalyticsDB';
import type { AnalyticsStore, RecordSubmissionOptions } from './AnalyticsStore';
import type { MongoAnalyticsStore } from './MongoAnalyticsStore';
import { redactMongoError } from './redact';

export class DualAnalyticsStore implements AnalyticsStore {
  constructor(
    private readonly sqlite: AnalyticsStore,
    private readonly mongo: MongoAnalyticsStore | null,
  ) {}

  /** Run a Mongo read, falling back to the SQLite equivalent on any error. */
  private async readWithFallback<T>(
    mongoRead: (mongo: MongoAnalyticsStore) => Promise<T>,
    sqliteRead: () => Promise<T>,
  ): Promise<T> {
    if (!this.mongo) {
      return sqliteRead();
    }
    try {
      return await mongoRead(this.mongo);
    } catch (error) {
      console.error('Mongo read failed, falling back to SQLite:', redactMongoError(error));
      return sqliteRead();
    }
  }

  async recordSubmission(counts: ItemCounts, options: RecordSubmissionOptions): Promise<number> {
    // SQLite first: local, synchronous, generates the canonical id.
    const id = await this.sqlite.recordSubmission(counts, options);

    if (this.mongo) {
      try {
        await this.mongo.insertSubmission(counts, options, id);
      } catch (error) {
        console.error('Mongo write failed (SQLite copy retained):', redactMongoError(error));
      }
    }

    return id;
  }

  getSubmission(id: number) {
    return this.readWithFallback(
      (mongo) => mongo.getSubmission(id),
      () => this.sqlite.getSubmission(id),
    );
  }

  getRecentSubmissions(limit = 10) {
    return this.readWithFallback(
      (mongo) => mongo.getRecentSubmissions(limit),
      () => this.sqlite.getRecentSubmissions(limit),
    );
  }

  getSummary() {
    return this.readWithFallback(
      (mongo) => mongo.getSummary(),
      () => this.sqlite.getSummary(),
    );
  }

  getSubmissionsByDateRange(startDate: string, endDate: string) {
    return this.readWithFallback(
      (mongo) => mongo.getSubmissionsByDateRange(startDate, endDate),
      () => this.sqlite.getSubmissionsByDateRange(startDate, endDate),
    );
  }

  getSubmissionsByChannel(channel: SubmissionChannel, limit = 50) {
    return this.readWithFallback(
      (mongo) => mongo.getSubmissionsByChannel(channel, limit),
      () => this.sqlite.getSubmissionsByChannel(channel, limit),
    );
  }

  getChannelStats() {
    return this.readWithFallback(
      (mongo) => mongo.getChannelStats(),
      () => this.sqlite.getChannelStats(),
    );
  }

  getCategoryAverages(limit = 12) {
    return this.readWithFallback(
      (mongo) => mongo.getCategoryAverages(limit),
      () => this.sqlite.getCategoryAverages(limit),
    );
  }

  getCategoryTimeline() {
    return this.readWithFallback(
      (mongo) => mongo.getCategoryTimeline(),
      () => this.sqlite.getCategoryTimeline(),
    );
  }

  getDailyCounts(limit = 7) {
    return this.readWithFallback(
      (mongo) => mongo.getDailyCounts(limit),
      () => this.sqlite.getDailyCounts(limit),
    );
  }

  getLaundryDays() {
    return this.readWithFallback(
      (mongo) => mongo.getLaundryDays(),
      () => this.sqlite.getLaundryDays(),
    );
  }
}
