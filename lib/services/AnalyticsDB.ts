/**
 * Analytics Database Service
 * 
 * SQLite-based analytics for tracking laundry submissions.
 * Stores only items with non-zero counts for efficiency.
 * 
 * Database location: ./data/analytics.db
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import type { ItemCounts } from '@/lib/types/laundry';

// Database file location
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'analytics.db');

/**
 * Submission channels - where the submission was sent
 */
export type SubmissionChannel = 'download' | 'discord' | 'whatsapp' | 'viber' | 'messenger';

/**
 * Submission record from database
 */
export interface SubmissionRecord {
  id: number;
  timestamp: string;
  channel: SubmissionChannel;
  customer_reference: string | null;
  scenario: string | null;
  total_items: number;
  items_with_values: number;
  channel_success: boolean;
}

/**
 * Submission item record from database
 */
export interface SubmissionItemRecord {
  id: number;
  submission_id: number;
  item_name: string;
  count: number;
}

/**
 * Full submission with items
 */
export interface FullSubmission extends SubmissionRecord {
  items: { name: string; count: number }[];
}

/**
 * Average quantity of an item per laundry batch
 */
export interface CategoryAverage {
  name: string;
  avgCount: number;
  totalCount: number;
  batches: number;
}

/**
 * Per-day per-item count row (for the current-load timeline chart)
 */
export interface CategoryTimelineRow {
  day: string;
  name: string;
  count: number;
}

/**
 * Submissions recorded on a given day
 */
export interface DailyCount {
  day: string;
  count: number;
}

/**
 * Inclusive local calendar-day window used to scope dashboard reads.
 * Bounds are `YYYY-MM-DD` strings compared against the local grouping day
 * (`date(timestamp)` in SQLite, the denormalized `day` field in Mongo) so the
 * filter stays timezone-parity-safe. See docs/data-layer.md.
 */
export interface DateRange {
  /** Inclusive start day, `YYYY-MM-DD`. */
  start: string;
  /** Inclusive end day, `YYYY-MM-DD`. */
  end: string;
}

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  totalSubmissions: number;
  successfulSubmissions: number;
  failedSubmissions: number;
  averageItemsPerSubmission: number;
  mostFrequentItems: { name: string; totalCount: number; frequency: number }[];
  recentSubmissions: FullSubmission[];
}

/**
 * Analytics Database Service
 */
export class AnalyticsDB {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(dbPath);
    
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');
    
    // Initialize schema
    this.initSchema();
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      -- Submissions table
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        channel TEXT NOT NULL DEFAULT 'discord',
        customer_reference TEXT,
        scenario TEXT,
        total_items INTEGER NOT NULL,
        items_with_values INTEGER NOT NULL,
        channel_success INTEGER NOT NULL DEFAULT 1
      );

      -- Submission items table (only non-zero counts)
      CREATE TABLE IF NOT EXISTS submission_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        count INTEGER NOT NULL,
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
      );

      -- Indexes for faster queries
      CREATE INDEX IF NOT EXISTS idx_submissions_timestamp ON submissions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_submissions_channel ON submissions(channel);
      CREATE INDEX IF NOT EXISTS idx_submissions_customer ON submissions(customer_reference);
      CREATE INDEX IF NOT EXISTS idx_submission_items_submission_id ON submission_items(submission_id);
      CREATE INDEX IF NOT EXISTS idx_submission_items_item_name ON submission_items(item_name);
    `);
  }

  /**
   * Record a submission
   */
  recordSubmission(
    counts: ItemCounts,
    options: {
      channel: SubmissionChannel;
      customerReference?: string;
      scenario?: string;
      channelSuccess?: boolean;
    }
  ): number {
    const { 
      channel, 
      customerReference = null, 
      scenario = null, 
      channelSuccess = true 
    } = options;
    
    // Filter to only items with values
    const itemsWithValues = Object.entries(counts).filter(([, count]) => count > 0);
    
    // Insert submission
    const insertSubmission = this.db.prepare(`
      INSERT INTO submissions (channel, customer_reference, scenario, total_items, items_with_values, channel_success)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertSubmission.run(
      channel,
      customerReference,
      scenario,
      Object.keys(counts).length,
      itemsWithValues.length,
      channelSuccess ? 1 : 0
    );
    
    const submissionId = result.lastInsertRowid as number;
    
    // Insert items with values
    const insertItem = this.db.prepare(`
      INSERT INTO submission_items (submission_id, item_name, count)
      VALUES (?, ?, ?)
    `);
    
    const insertMany = this.db.transaction((items: [string, number][]) => {
      for (const [name, count] of items) {
        insertItem.run(submissionId, name, count);
      }
    });
    
    insertMany(itemsWithValues);
    
    return submissionId;
  }

  /**
   * Find a recent, already-recorded **successful** submission on the same channel
   * whose non-zero item counts exactly match `counts`, within `withinMinutes`.
   *
   * Used to de-duplicate re-sends of the same laundry batch (Discord retries, or
   * the user re-submitting after a hiccup), which would otherwise each add a row
   * and inflate every total. Returns the existing submission id, or null if none.
   *
   * Only successful prior submissions are considered, so a failed attempt
   * followed by a successful retry of the same batch still records the success.
   */
  findRecentDuplicate(
    counts: ItemCounts,
    options: { channel: SubmissionChannel },
    withinMinutes: number,
  ): number | null {
    const target = this.nonZeroCountMap(counts);
    const targetSize = Object.keys(target).length;

    // Candidate rows: same channel, successful, matching non-zero item count,
    // within the time window. Newest first so we reuse the most recent match.
    const candidates = this.db
      .prepare(
        `SELECT id FROM submissions
         WHERE channel = ?
           AND channel_success = 1
           AND items_with_values = ?
           AND timestamp >= datetime('now', 'localtime', ?)
         ORDER BY id DESC`,
      )
      .all(options.channel, targetSize, `-${withinMinutes} minutes`) as { id: number }[];

    const selectItems = this.db.prepare(
      `SELECT item_name as name, count FROM submission_items WHERE submission_id = ?`,
    );

    for (const candidate of candidates) {
      const items = selectItems.all(candidate.id) as { name: string; count: number }[];
      if (this.itemsMatch(items, target)) return candidate.id;
    }
    return null;
  }

  /** Non-zero item counts as a `{ name: count }` map. */
  private nonZeroCountMap(counts: ItemCounts): Record<string, number> {
    const map: Record<string, number> = {};
    for (const [name, count] of Object.entries(counts)) {
      if (count > 0) map[name] = count;
    }
    return map;
  }

  /** Whether stored `items` are exactly the `target` non-zero count map. */
  private itemsMatch(
    items: { name: string; count: number }[],
    target: Record<string, number>,
  ): boolean {
    if (items.length !== Object.keys(target).length) return false;
    for (const item of items) {
      if (target[item.name] !== item.count) return false;
    }
    return true;
  }

  /**
   * Get a submission by ID with its items
   */
  getSubmission(id: number): FullSubmission | null {
    const submission = this.db.prepare(`
      SELECT * FROM submissions WHERE id = ?
    `).get(id) as SubmissionRecord | undefined;
    
    if (!submission) return null;
    
    const items = this.db.prepare(`
      SELECT item_name as name, count FROM submission_items WHERE submission_id = ?
    `).all(id) as { name: string; count: number }[];
    
    return {
      ...submission,
      items,
    };
  }

  /**
   * Get recent submissions (offset enables history pagination)
   */
  getRecentSubmissions(limit: number = 10, offset: number = 0): FullSubmission[] {
    const submissions = this.db.prepare(`
      SELECT * FROM submissions ORDER BY timestamp DESC LIMIT ? OFFSET ?
    `).all(limit, offset) as SubmissionRecord[];
    
    return submissions.map(sub => {
      const items = this.db.prepare(`
        SELECT item_name as name, count FROM submission_items WHERE submission_id = ?
      `).all(sub.id) as { name: string; count: number }[];
      
      return { ...sub, items };
    });
  }

  /**
   * SQL fragment + params scoping a query to a local-day {@link DateRange}.
   * `column` is the timestamp column to bucket on (qualified when the query
   * joins, e.g. `s.timestamp`). Returns empty strings when no range is given so
   * the unfiltered queries are byte-for-byte unchanged.
   */
  private dayRange(
    range: DateRange | undefined,
    column: string,
  ): { clause: string; params: string[] } {
    if (!range) return { clause: '', params: [] };
    return {
      clause: `date(${column}) >= ? AND date(${column}) <= ?`,
      params: [range.start, range.end],
    };
  }

  /**
   * Get analytics summary, optionally scoped to a local-day {@link DateRange}.
   */
  getSummary(range?: DateRange): AnalyticsSummary {
    const totalsFilter = this.dayRange(range, 'timestamp');
    const itemsFilter = this.dayRange(range, 's.timestamp');

    // Total submissions
    const totals = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN channel_success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN channel_success = 0 THEN 1 ELSE 0 END) as failed,
        AVG(items_with_values) as avg_items
      FROM submissions
      ${totalsFilter.clause ? `WHERE ${totalsFilter.clause}` : ''}
    `).get(...totalsFilter.params) as { total: number; successful: number; failed: number; avg_items: number };

    // Most frequent items
    const frequentItems = this.db.prepare(`
      SELECT
        si.item_name as name,
        SUM(si.count) as totalCount,
        COUNT(*) as frequency
      FROM submission_items si
      ${itemsFilter.clause ? `JOIN submissions s ON s.id = si.submission_id WHERE ${itemsFilter.clause}` : ''}
      GROUP BY si.item_name
      ORDER BY frequency DESC, totalCount DESC
      LIMIT 10
    `).all(...itemsFilter.params) as { name: string; totalCount: number; frequency: number }[];

    // Recent submissions
    const recentSubmissions = this.getRecentSubmissions(5);
    
    return {
      totalSubmissions: totals.total || 0,
      successfulSubmissions: totals.successful || 0,
      failedSubmissions: totals.failed || 0,
      averageItemsPerSubmission: Math.round((totals.avg_items || 0) * 10) / 10,
      mostFrequentItems: frequentItems,
      recentSubmissions,
    };
  }

  /**
   * Get all submissions for a date range
   */
  getSubmissionsByDateRange(startDate: string, endDate: string): FullSubmission[] {
    const submissions = this.db.prepare(`
      SELECT * FROM submissions 
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `).all(startDate, endDate) as SubmissionRecord[];
    
    return submissions.map(sub => {
      const items = this.db.prepare(`
        SELECT item_name as name, count FROM submission_items WHERE submission_id = ?
      `).all(sub.id) as { name: string; count: number }[];
      
      return { ...sub, items };
    });
  }

  /**
   * Get submissions by channel
   */
  getSubmissionsByChannel(channel: SubmissionChannel, limit: number = 50): FullSubmission[] {
    const submissions = this.db.prepare(`
      SELECT * FROM submissions 
      WHERE channel = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(channel, limit) as SubmissionRecord[];
    
    return submissions.map(sub => {
      const items = this.db.prepare(`
        SELECT item_name as name, count FROM submission_items WHERE submission_id = ?
      `).all(sub.id) as { name: string; count: number }[];
      
      return { ...sub, items };
    });
  }

  /**
   * Get channel breakdown stats
   */
  getChannelStats(): { channel: SubmissionChannel; count: number; successRate: number }[] {
    return this.db.prepare(`
      SELECT 
        channel,
        COUNT(*) as count,
        ROUND(AVG(channel_success) * 100, 1) as successRate
      FROM submissions
      GROUP BY channel
      ORDER BY count DESC
    `).all() as { channel: SubmissionChannel; count: number; successRate: number }[];
  }

  /**
   * Average / total / batch-count per item, ranked by average per batch.
   * Feeds the "Avg Per Category" chart.
   */
  getCategoryAverages(limit: number = 12, range?: DateRange): CategoryAverage[] {
    const filter = this.dayRange(range, 's.timestamp');
    return this.db.prepare(`
      SELECT
        si.item_name as name,
        ROUND(AVG(si.count), 1) as avgCount,
        SUM(si.count) as totalCount,
        COUNT(*) as batches
      FROM submission_items si
      ${filter.clause ? `JOIN submissions s ON s.id = si.submission_id WHERE ${filter.clause}` : ''}
      GROUP BY si.item_name
      ORDER BY avgCount DESC
      LIMIT ?
    `).all(...filter.params, limit) as CategoryAverage[];
  }

  /**
   * Per-day, per-item summed counts across all history.
   * Feeds the current-load timeline chart and the per-category load forecast.
   */
  getCategoryTimeline(range?: DateRange): CategoryTimelineRow[] {
    const filter = this.dayRange(range, 's.timestamp');
    return this.db.prepare(`
      SELECT date(s.timestamp) as day, si.item_name as name, SUM(si.count) as count
      FROM submission_items si
      JOIN submissions s ON s.id = si.submission_id
      ${filter.clause ? `WHERE ${filter.clause}` : ''}
      GROUP BY date(s.timestamp), si.item_name
      ORDER BY day ASC
    `).all(...filter.params) as CategoryTimelineRow[];
  }

  /**
   * Submissions per day for the most recent `limit` days, oldest → newest.
   */
  getDailyCounts(limit: number = 7, range?: DateRange): DailyCount[] {
    const filter = this.dayRange(range, 'timestamp');
    const rows = this.db.prepare(`
      SELECT date(timestamp) as day, COUNT(*) as count
      FROM submissions
      ${filter.clause ? `WHERE ${filter.clause}` : ''}
      GROUP BY date(timestamp)
      ORDER BY day DESC
      LIMIT ?
    `).all(...filter.params, limit) as DailyCount[];
    return rows.reverse();
  }

  /**
   * Distinct laundry days (ISO YYYY-MM-DD), ascending. Feeds the forecast.
   */
  getLaundryDays(range?: DateRange): string[] {
    const filter = this.dayRange(range, 'timestamp');
    const rows = this.db.prepare(`
      SELECT date(timestamp) as day
      FROM submissions
      ${filter.clause ? `WHERE ${filter.clause}` : ''}
      GROUP BY date(timestamp)
      ORDER BY day ASC
    `).all(...filter.params) as { day: string }[];
    return rows.map((row) => String(row.day));
  }

  /**
   * Export all data as JSON
   */
  exportToJSON(): string {
    const submissions = this.db.prepare(`
      SELECT * FROM submissions ORDER BY timestamp DESC
    `).all() as SubmissionRecord[];
    
    const fullSubmissions = submissions.map(sub => {
      const items = this.db.prepare(`
        SELECT item_name as name, count FROM submission_items WHERE submission_id = ?
      `).all(sub.id) as { name: string; count: number }[];
      
      return { ...sub, items };
    });
    
    return JSON.stringify(fullSubmissions, null, 2);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

/**
 * Singleton instance for convenience
 */
let instance: AnalyticsDB | null = null;

export function getAnalyticsDB(): AnalyticsDB {
  if (!instance) {
    instance = new AnalyticsDB();
  }
  return instance;
}

export function closeAnalyticsDB(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
