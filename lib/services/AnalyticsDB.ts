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
   * Get recent submissions
   */
  getRecentSubmissions(limit: number = 10): FullSubmission[] {
    const submissions = this.db.prepare(`
      SELECT * FROM submissions ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as SubmissionRecord[];
    
    return submissions.map(sub => {
      const items = this.db.prepare(`
        SELECT item_name as name, count FROM submission_items WHERE submission_id = ?
      `).all(sub.id) as { name: string; count: number }[];
      
      return { ...sub, items };
    });
  }

  /**
   * Get analytics summary
   */
  getSummary(): AnalyticsSummary {
    // Total submissions
    const totals = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN channel_success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN channel_success = 0 THEN 1 ELSE 0 END) as failed,
        AVG(items_with_values) as avg_items
      FROM submissions
    `).get() as { total: number; successful: number; failed: number; avg_items: number };
    
    // Most frequent items
    const frequentItems = this.db.prepare(`
      SELECT 
        item_name as name,
        SUM(count) as totalCount,
        COUNT(*) as frequency
      FROM submission_items
      GROUP BY item_name
      ORDER BY frequency DESC, totalCount DESC
      LIMIT 10
    `).all() as { name: string; totalCount: number; frequency: number }[];
    
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
