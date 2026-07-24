/**
 * Tests for AnalyticsDB Service
 *
 * The `describe.skip` block below is a legacy behaviour checklist kept as
 * documentation. Live tests (see `getRecentSubmissions pagination` at the
 * bottom) run against a real temp-file SQLite database — better-sqlite3 does
 * load under Jest's jsdom environment.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AnalyticsDB, type SubmissionChannel } from '@/lib/services/AnalyticsDB';
import type { ItemCounts } from '@/lib/types/laundry';

// Legacy placeholder checklist - documents expected behaviour, not executed.
describe.skip('AnalyticsDB', () => {
  describe('constructor', () => {
    it('should create database and initialize schema', () => {
      // Would test: new AnalyticsDB(testDbPath) creates DB
    });

    it('should create data directory if it does not exist', () => {
      // Would test: directory is created if not exists
    });
  });

  describe('recordSubmission', () => {
    it('should record a submission with all fields', () => {
      // Would test: channel, customerReference, scenario, channelSuccess all stored
    });

    it('should record submission with minimal options', () => {
      // Would test: only channel required, defaults for others
    });

    it('should record failed submission', () => {
      // Would test: channelSuccess=false is stored
    });

    it('should only store items with non-zero counts', () => {
      // Would test: items with count=0 not stored
    });

    it('should handle empty counts', () => {
      // Would test: empty counts object handled gracefully
    });

    it('should handle all channel types', () => {
      // Would test: download, discord, whatsapp, viber, messenger all work
    });
  });

  describe('getSubmission', () => {
    it('should return null for non-existent submission', () => {
      // Would test: returns null for invalid ID
    });

    it('should return submission with items', () => {
      // Would test: returns full submission with items array
    });
  });

  describe('getRecentSubmissions', () => {
    it('should return empty array when no submissions', () => {});
    it('should return submissions in descending timestamp order', () => {});
    it('should respect limit parameter', () => {});
    it('should default to 10 submissions', () => {});
  });

  describe('getSubmissionsByChannel', () => {
    it('should filter by channel', () => {});
    it('should return empty for channel with no submissions', () => {});
    it('should respect limit parameter', () => {});
  });

  describe('getChannelStats', () => {
    it('should return empty array when no submissions', () => {});
    it('should calculate channel statistics', () => {});
    it('should order by count descending', () => {});
  });

  describe('getSummary', () => {
    it('should return zeroes for empty database', () => {});
    it('should calculate correct summary', () => {});
    it('should return top 10 most frequent items', () => {});
    it('should return 5 recent submissions', () => {});
  });

  describe('getSubmissionsByDateRange', () => {
    it('should filter by date range', () => {});
    it('should return empty for future date range', () => {});
  });

  describe('exportToJSON', () => {
    it('should export empty array for empty database', () => {});
    it('should export all submissions as JSON', () => {});
    it('should include all item details', () => {});
  });

  describe('close', () => {
    it('should close database connection', () => {});
  });
});

/**
 * Note: To properly test AnalyticsDB:
 *
 * 1. Run as integration test with actual Node.js environment
 * 2. Or use tsx/ts-node to run tests directly:
 *    npx tsx scripts/test-discord-submission.ts stats
 *
 * The AnalyticsDB service is tested indirectly via:
 * - The /api/submissions route tests (which mock the DB)
 * - The test-discord-submission.ts script (which uses real DB)
 */

/** Structural view of AnalyticsDB's private connection, for test-only seeding. */
type RawDb = {
  prepare(sql: string): { run(...args: unknown[]): unknown };
};

function rawDb(db: AnalyticsDB): RawDb {
  return (db as unknown as { db: RawDb }).db;
}

interface SeedEntry {
  counts: ItemCounts;
  /** SQLite datetime literal, e.g. `2026-07-01 08:00:00`. */
  timestamp: string;
  channel?: SubmissionChannel;
}

/**
 * Record each submission then pin its timestamp, because the schema default
 * (`datetime('now','localtime')`) only has second resolution and would tie.
 */
function seed(db: AnalyticsDB, entries: SeedEntry[]): number[] {
  const update = rawDb(db).prepare('UPDATE submissions SET timestamp = ? WHERE id = ?');
  return entries.map((entry) => {
    const id = db.recordSubmission(entry.counts, { channel: entry.channel ?? 'discord' });
    update.run(entry.timestamp, id);
    return id;
  });
}

/** `count` submissions, oldest first; ids ascend while timestamps ascend. */
function seedSequential(db: AnalyticsDB, count: number): number[] {
  return seed(
    db,
    Array.from({ length: count }, (_, i) => ({
      counts: { Shirt: i + 1 } as ItemCounts,
      timestamp: `2026-07-${String(i + 1).padStart(2, '0')} 08:00:00`,
    })),
  );
}

describe('AnalyticsDB.getRecentSubmissions pagination', () => {
  let tmp: string;
  let db: AnalyticsDB;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'analytics-db-test-'));
    db = new AnalyticsDB(path.join(tmp, 'analytics.db'));
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('returns rows newest-first when no offset is given', () => {
    // Arrange
    const ids = seedSequential(db, 5); // ids[4] is the newest

    // Act
    const page = db.getRecentSubmissions(3);

    // Assert
    expect(page.map((s) => s.id)).toEqual([ids[4], ids[3], ids[2]]);
  });

  it('defaults to offset 0 so the un-paginated behaviour is unchanged', () => {
    // Arrange
    seedSequential(db, 5);

    // Act
    const implicitOffset = db.getRecentSubmissions(3);
    const explicitOffset = db.getRecentSubmissions(3, 0);

    // Assert
    expect(implicitOffset).toEqual(explicitOffset);
  });

  it('defaults to a limit of 10 rows', () => {
    // Arrange
    seedSequential(db, 12);

    // Act
    const page = db.getRecentSubmissions();

    // Assert
    expect(page).toHaveLength(10);
  });

  it('skips the offset rows and keeps timestamp-descending order', () => {
    // Arrange
    const ids = seedSequential(db, 5);

    // Act
    const page = db.getRecentSubmissions(2, 2);

    // Assert
    expect(page.map((s) => s.id)).toEqual([ids[2], ids[1]]);
    expect(page.map((s) => s.timestamp)).toEqual([
      '2026-07-03 08:00:00',
      '2026-07-02 08:00:00',
    ]);
  });

  it('walks the full history without gaps or overlap across consecutive pages', () => {
    // Arrange
    const ids = seedSequential(db, 6);
    const newestFirst = [...ids].reverse();

    // Act
    const pages = [0, 2, 4].map((offset) => db.getRecentSubmissions(2, offset));

    // Assert
    expect(pages.flatMap((page) => page.map((s) => s.id))).toEqual(newestFirst);
  });

  it('returns an empty array when the offset lands past the last row', () => {
    // Arrange
    seedSequential(db, 3);

    // Act
    const page = db.getRecentSubmissions(10, 3);

    // Assert
    expect(page).toEqual([]);
  });

  it('returns a short final page when fewer rows remain than the limit', () => {
    // Arrange
    const ids = seedSequential(db, 5);

    // Act
    const page = db.getRecentSubmissions(10, 3);

    // Assert
    expect(page.map((s) => s.id)).toEqual([ids[1], ids[0]]);
  });

  it('still attaches the non-zero items to each row on an offset page', () => {
    // Arrange
    seed(db, [
      { counts: { Shirt: 1, Towel: 0 } as ItemCounts, timestamp: '2026-07-01 08:00:00' },
      { counts: { Shirt: 4, Towel: 2 } as ItemCounts, timestamp: '2026-07-02 08:00:00' },
    ]);

    // Act
    const page = db.getRecentSubmissions(1, 1); // the older submission

    // Assert
    expect(page).toHaveLength(1);
    expect(page[0].items).toEqual([{ name: 'Shirt', count: 1 }]);
  });

  it('returns an empty array for an empty database at any offset', () => {
    // Arrange - no seeding

    // Act
    const page = db.getRecentSubmissions(10, 5);

    // Assert
    expect(page).toEqual([]);
  });
});
