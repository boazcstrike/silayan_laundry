/**
 * MongoDB-backed {@link AnalyticsStore}.
 *
 * Single `submissions` collection with items embedded (non-zero only). Every
 * read is an aggregation pipeline mirroring the corresponding SQLite query in
 * {@link AnalyticsDB}, and returns the SAME snake_case shapes so the API layer
 * is backend-agnostic.
 *
 * Day/timezone parity: SQLite groups on `date(datetime('now','localtime'))`.
 * We denormalize a local `day` string at write time and group on it, so both
 * backends bucket a submission into the same calendar day regardless of the
 * server's UTC offset.
 */
import type { Collection, Db } from 'mongodb';
import type { ItemCounts } from '@/lib/types/laundry';
import type {
  AnalyticsSummary,
  CategoryAverage,
  CategoryTimelineRow,
  DailyCount,
  FullSubmission,
  SubmissionChannel,
  SubmissionRecord,
} from '@/lib/services/AnalyticsDB';
import { getMongoDb } from './mongo';
import type { AnalyticsStore, ChannelStat, RecordSubmissionOptions } from './AnalyticsStore';

const COLLECTION = 'submissions';

/** Embedded item count. */
export interface SubmissionItemDoc {
  name: string;
  count: number;
}

/** MongoDB submission document (camelCase; mapped to snake_case on read). */
export interface SubmissionDoc {
  sqliteId: number | null;
  timestamp: Date;
  /** Local calendar day 'YYYY-MM-DD' — the grouping key. */
  day: string;
  channel: SubmissionChannel;
  customerReference: string | null;
  scenario: string | null;
  totalItems: number;
  itemsWithValues: number;
  channelSuccess: boolean;
  items: SubmissionItemDoc[];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local 'YYYY-MM-DD' (matches SQLite's date(...,'localtime')). */
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local 'YYYY-MM-DD HH:MM:SS' (matches SQLite's datetime(...,'localtime')). */
function formatLocalDateTime(date: Date): string {
  return (
    `${localDay(date)} ` +
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
  );
}

/** Non-zero item counts as embedded docs. */
function toItemDocs(counts: ItemCounts): SubmissionItemDoc[] {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({ name, count }));
}

/** Map a stored document to the snake_case {@link FullSubmission} shape. */
function toFullSubmission(doc: SubmissionDoc): FullSubmission {
  const record: SubmissionRecord = {
    id: doc.sqliteId ?? 0,
    timestamp: formatLocalDateTime(doc.timestamp),
    channel: doc.channel,
    customer_reference: doc.customerReference,
    scenario: doc.scenario,
    total_items: doc.totalItems,
    items_with_values: doc.itemsWithValues,
    channel_success: doc.channelSuccess,
  };
  return { ...record, items: doc.items };
}

export class MongoAnalyticsStore implements AnalyticsStore {
  private dbPromise: Promise<Db> | null = null;
  private indexesReady: Promise<void> | null = null;

  private async collection(): Promise<Collection<SubmissionDoc>> {
    if (!this.dbPromise) {
      this.dbPromise = getMongoDb();
    }
    const db = await this.dbPromise;
    const coll = db.collection<SubmissionDoc>(COLLECTION);
    await this.ensureIndexes(coll);
    return coll;
  }

  /** Idempotent index creation; runs once per process. */
  private ensureIndexes(coll: Collection<SubmissionDoc>): Promise<void> {
    if (!this.indexesReady) {
      this.indexesReady = coll
        .createIndexes([
          { key: { timestamp: -1 } },
          { key: { channel: 1 } },
          { key: { customerReference: 1 } },
          { key: { day: 1 } },
          { key: { 'items.name': 1 } },
          { key: { sqliteId: 1 } },
        ])
        .then(() => undefined);
    }
    return this.indexesReady;
  }

  /** Live dual-write insert. `sqliteId` links to the local SQLite row. */
  async insertSubmission(
    counts: ItemCounts,
    options: RecordSubmissionOptions,
    sqliteId: number | null,
  ): Promise<void> {
    const now = new Date();
    const items = toItemDocs(counts);
    const doc: SubmissionDoc = {
      sqliteId,
      timestamp: now,
      day: localDay(now),
      channel: options.channel,
      customerReference: options.customerReference ?? null,
      scenario: options.scenario ?? null,
      totalItems: Object.keys(counts).length,
      itemsWithValues: items.length,
      channelSuccess: options.channelSuccess ?? true,
      items,
    };
    const coll = await this.collection();
    await coll.insertOne(doc);
  }

  /** Idempotent backfill upsert keyed on `sqliteId`. */
  async upsertBySqliteId(doc: SubmissionDoc): Promise<void> {
    if (doc.sqliteId === null) {
      throw new Error('upsertBySqliteId requires a non-null sqliteId');
    }
    const coll = await this.collection();
    await coll.updateOne({ sqliteId: doc.sqliteId }, { $set: doc }, { upsert: true });
  }

  /**
   * Interface compliance: standalone insert with no SQLite id. Not used by the
   * dual-write path (which calls {@link insertSubmission}). Returns 0.
   */
  async recordSubmission(counts: ItemCounts, options: RecordSubmissionOptions): Promise<number> {
    await this.insertSubmission(counts, options, null);
    return 0;
  }

  async getSubmission(id: number): Promise<FullSubmission | null> {
    const coll = await this.collection();
    const doc = await coll.findOne({ sqliteId: id });
    return doc ? toFullSubmission(doc) : null;
  }

  async getRecentSubmissions(limit = 10): Promise<FullSubmission[]> {
    const coll = await this.collection();
    const docs = await coll.find().sort({ timestamp: -1 }).limit(limit).toArray();
    return docs.map(toFullSubmission);
  }

  async getSummary(): Promise<AnalyticsSummary> {
    const coll = await this.collection();

    const [totals] = await coll
      .aggregate<{ total: number; successful: number; failed: number; avgItems: number }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            successful: { $sum: { $cond: ['$channelSuccess', 1, 0] } },
            failed: { $sum: { $cond: ['$channelSuccess', 0, 1] } },
            avgItems: { $avg: '$itemsWithValues' },
          },
        },
      ])
      .toArray();

    const frequentItems = await coll
      .aggregate<{ name: string; totalCount: number; frequency: number }>([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            totalCount: { $sum: '$items.count' },
            frequency: { $sum: 1 },
          },
        },
        { $sort: { frequency: -1, totalCount: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, name: '$_id', totalCount: 1, frequency: 1 } },
      ])
      .toArray();

    const recentSubmissions = await this.getRecentSubmissions(5);

    return {
      totalSubmissions: totals?.total ?? 0,
      successfulSubmissions: totals?.successful ?? 0,
      failedSubmissions: totals?.failed ?? 0,
      averageItemsPerSubmission: Math.round((totals?.avgItems ?? 0) * 10) / 10,
      mostFrequentItems: frequentItems,
      recentSubmissions,
    };
  }

  async getSubmissionsByDateRange(startDate: string, endDate: string): Promise<FullSubmission[]> {
    const coll = await this.collection();
    const docs = await coll
      .find({ timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) } })
      .sort({ timestamp: -1 })
      .toArray();
    return docs.map(toFullSubmission);
  }

  async getSubmissionsByChannel(channel: SubmissionChannel, limit = 50): Promise<FullSubmission[]> {
    const coll = await this.collection();
    const docs = await coll.find({ channel }).sort({ timestamp: -1 }).limit(limit).toArray();
    return docs.map(toFullSubmission);
  }

  async getChannelStats(): Promise<ChannelStat[]> {
    const coll = await this.collection();
    return coll
      .aggregate<ChannelStat>([
        {
          $group: {
            _id: '$channel',
            count: { $sum: 1 },
            successRate: { $avg: { $cond: ['$channelSuccess', 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
        {
          $project: {
            _id: 0,
            channel: '$_id',
            count: 1,
            successRate: { $round: [{ $multiply: ['$successRate', 100] }, 1] },
          },
        },
      ])
      .toArray();
  }

  async getCategoryAverages(limit = 12): Promise<CategoryAverage[]> {
    const coll = await this.collection();
    return coll
      .aggregate<CategoryAverage>([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            avgCount: { $avg: '$items.count' },
            totalCount: { $sum: '$items.count' },
            batches: { $sum: 1 },
          },
        },
        { $sort: { avgCount: -1 } },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            name: '$_id',
            avgCount: { $round: ['$avgCount', 1] },
            totalCount: 1,
            batches: 1,
          },
        },
      ])
      .toArray();
  }

  async getCategoryTimeline(): Promise<CategoryTimelineRow[]> {
    const coll = await this.collection();
    return coll
      .aggregate<CategoryTimelineRow>([
        { $unwind: '$items' },
        {
          $group: {
            _id: { day: '$day', name: '$items.name' },
            count: { $sum: '$items.count' },
          },
        },
        { $sort: { '_id.day': 1 } },
        { $project: { _id: 0, day: '$_id.day', name: '$_id.name', count: 1 } },
      ])
      .toArray();
  }

  async getDailyCounts(limit = 7): Promise<DailyCount[]> {
    const coll = await this.collection();
    const rows = await coll
      .aggregate<DailyCount>([
        { $group: { _id: '$day', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $limit: limit },
        { $project: { _id: 0, day: '$_id', count: 1 } },
      ])
      .toArray();
    return rows.reverse();
  }

  async getLaundryDays(): Promise<string[]> {
    const coll = await this.collection();
    const rows = await coll
      .aggregate<{ day: string }>([
        { $group: { _id: '$day' } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, day: '$_id' } },
      ])
      .toArray();
    return rows.map((row) => row.day);
  }
}
