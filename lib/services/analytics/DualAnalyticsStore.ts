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
import type { DateRange, SubmissionChannel } from '@/lib/services/AnalyticsDB';
import { SUBMISSION } from '@/lib/constants';
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
    // De-dupe re-sends of the same batch: if an identical successful submission
    // was recorded on this channel moments ago, reuse it instead of adding a row
    // (which would double-count the batch across every total). Checked against
    // the canonical local store; never blocks recording if the check fails.
    if (this.sqlite.findRecentDuplicate) {
      try {
        const duplicateId = await this.sqlite.findRecentDuplicate(
          counts,
          options,
          SUBMISSION.DEDUP_WINDOW_MINUTES,
        );
        if (duplicateId !== null) {
          console.info(`[dedup] identical submission within window; reusing id ${duplicateId}`);
          return duplicateId;
        }
      } catch (error) {
        console.error('[dedup] duplicate check failed; recording normally:', error);
      }
    }

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

  getRecentSubmissions(limit = 10, offset = 0) {
    return this.readWithFallback(
      (mongo) => mongo.getRecentSubmissions(limit, offset),
      () => this.sqlite.getRecentSubmissions(limit, offset),
    );
  }

  getSummary(range?: DateRange) {
    return this.readWithFallback(
      (mongo) => mongo.getSummary(range),
      () => this.sqlite.getSummary(range),
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

  getCategoryAverages(limit = 12, range?: DateRange) {
    return this.readWithFallback(
      (mongo) => mongo.getCategoryAverages(limit, range),
      () => this.sqlite.getCategoryAverages(limit, range),
    );
  }

  getCategoryTimeline(range?: DateRange) {
    return this.readWithFallback(
      (mongo) => mongo.getCategoryTimeline(range),
      () => this.sqlite.getCategoryTimeline(range),
    );
  }

  getDailyCounts(limit = 7, range?: DateRange) {
    return this.readWithFallback(
      (mongo) => mongo.getDailyCounts(limit, range),
      () => this.sqlite.getDailyCounts(limit, range),
    );
  }

  getLaundryDays(range?: DateRange) {
    return this.readWithFallback(
      (mongo) => mongo.getLaundryDays(range),
      () => this.sqlite.getLaundryDays(range),
    );
  }
}
