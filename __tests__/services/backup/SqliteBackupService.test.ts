// better-sqlite3's async .backup() relies on setImmediate, which jsdom omits.
if (typeof globalThis.setImmediate === 'undefined') {
  // @ts-expect-error minimal polyfill for the test environment
  globalThis.setImmediate = (fn: (...a: unknown[]) => void, ...args: unknown[]) =>
    setTimeout(fn, 0, ...args);
}

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Database from 'better-sqlite3';
import {
  backupTimestamp,
  createBackup,
  isBackupEnabled,
  listBackups,
  pruneBackups,
  resolveRetention,
} from '@/lib/services/backup/SqliteBackupService';
import { BACKUP } from '@/lib/constants';

/** Create a real SQLite db at `dbPath` seeded with `rows` rows. */
function seedDb(dbPath: string, rows: number): void {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, v TEXT)');
  const insert = db.prepare('INSERT INTO t (v) VALUES (?)');
  for (let i = 0; i < rows; i += 1) insert.run(`row-${i}`);
  db.close();
}

describe('SqliteBackupService', () => {
  let tmp: string;
  let dbPath: string;
  let backupDir: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-test-'));
    dbPath = path.join(tmp, 'analytics.db');
    backupDir = path.join(tmp, 'backups');
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe('backupTimestamp', () => {
    it('produces a filesystem-safe, sortable timestamp with no colons or dots', () => {
      const ts = backupTimestamp(new Date('2026-07-22T18:56:00.123Z'));
      expect(ts).toBe('2026-07-22T18-56-00-123Z');
      expect(ts).not.toMatch(/[:.]/);
    });
  });

  describe('isBackupEnabled', () => {
    it('defaults to enabled when the flag is unset', () => {
      expect(isBackupEnabled({})).toBe(true);
    });

    it.each(['false', 'FALSE', '0', 'no'])('is disabled when set to %s', (val) => {
      expect(isBackupEnabled({ [BACKUP.ENABLED_ENV]: val })).toBe(false);
    });

    it('stays enabled for any other value', () => {
      expect(isBackupEnabled({ [BACKUP.ENABLED_ENV]: 'true' })).toBe(true);
    });
  });

  describe('resolveRetention', () => {
    it('prefers an explicit positive value', () => {
      expect(resolveRetention(3, {})).toBe(3);
    });

    it('falls back to the env override', () => {
      expect(resolveRetention(undefined, { [BACKUP.RETENTION_ENV]: '7' })).toBe(7);
    });

    it('falls back to the constant when nothing valid is provided', () => {
      expect(resolveRetention(undefined, {})).toBe(BACKUP.RETENTION);
      expect(resolveRetention(0, { [BACKUP.RETENTION_ENV]: 'nope' })).toBe(BACKUP.RETENTION);
    });
  });

  describe('createBackup', () => {
    it('returns skipped-no-db when the source database is missing', async () => {
      const result = await createBackup({ dbPath, backupDir });
      expect(result.status).toBe('skipped-no-db');
      expect(listBackups(backupDir)).toHaveLength(0);
    });

    it('creates a valid, readable snapshot', async () => {
      seedDb(dbPath, 5);
      const result = await createBackup({
        dbPath,
        backupDir,
        now: new Date('2026-07-22T10:00:00.000Z'),
      });

      expect(result.status).toBe('created');
      expect(result.file && fs.existsSync(result.file)).toBe(true);

      const snapshot = new Database(result.file!, { readonly: true });
      const count = snapshot.prepare('SELECT COUNT(*) AS n FROM t').get() as { n: number };
      snapshot.close();
      expect(count.n).toBe(5);
    });

    it('skips an identical consecutive snapshot', async () => {
      seedDb(dbPath, 5);
      await createBackup({ dbPath, backupDir, now: new Date('2026-07-22T10:00:00.000Z') });
      const second = await createBackup({
        dbPath,
        backupDir,
        now: new Date('2026-07-22T11:00:00.000Z'),
      });

      expect(second.status).toBe('skipped-duplicate');
      expect(listBackups(backupDir)).toHaveLength(1);
    });

    it('creates a new snapshot after the data changes', async () => {
      seedDb(dbPath, 5);
      await createBackup({ dbPath, backupDir, now: new Date('2026-07-22T10:00:00.000Z') });

      seedDb(dbPath, 3); // append more rows -> different content
      const second = await createBackup({
        dbPath,
        backupDir,
        now: new Date('2026-07-22T12:00:00.000Z'),
      });

      expect(second.status).toBe('created');
      expect(listBackups(backupDir)).toHaveLength(2);
    });

    it('prunes snapshots beyond the retention count', async () => {
      const times = [
        '2026-07-22T10:00:00.000Z',
        '2026-07-22T11:00:00.000Z',
        '2026-07-22T12:00:00.000Z',
      ];
      for (let i = 0; i < times.length; i += 1) {
        seedDb(dbPath, i + 1); // distinct content each round
        await createBackup({ dbPath, backupDir, keep: 2, now: new Date(times[i]) });
      }

      const remaining = listBackups(backupDir);
      expect(remaining).toHaveLength(2);
      // Newest two kept (reverse-sorted: 12:00 then 11:00)
      expect(remaining[0]).toContain('2026-07-22T12-00-00');
      expect(remaining[1]).toContain('2026-07-22T11-00-00');
    });
  });

  describe('listBackups / pruneBackups', () => {
    it('lists nothing when the directory does not exist', () => {
      expect(listBackups(path.join(tmp, 'missing'))).toEqual([]);
    });

    it('ignores unrelated files', () => {
      fs.mkdirSync(backupDir, { recursive: true });
      fs.writeFileSync(path.join(backupDir, 'notes.txt'), 'x');
      fs.writeFileSync(path.join(backupDir, `${BACKUP.FILE_PREFIX}2026-01-01${BACKUP.FILE_EXT}`), 'x');
      expect(listBackups(backupDir)).toHaveLength(1);
    });

    it('returns an empty array when pruning a missing directory', () => {
      expect(pruneBackups(path.join(tmp, 'missing'), 5)).toEqual([]);
    });
  });
});
