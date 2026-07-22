/**
 * SQLite Backup Service
 *
 * Creates WAL-consistent snapshots ("restore points") of the analytics SQLite
 * database. Intended to run once per server start (see `instrumentation.ts`),
 * so every boot yields a recoverable copy while Mongo is unavailable.
 *
 * Snapshots live in `data/backups/analytics-<timestamp>.db`. The newest
 * {@link BACKUP.RETENTION} are kept; older ones are pruned. Identical
 * consecutive snapshots (no new data since last boot) are skipped.
 *
 * Uses better-sqlite3's online `.backup()` API — NOT a raw file copy, which can
 * capture a torn WAL and corrupt the snapshot.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { BACKUP } from '@/lib/constants';

const DATA_DIR = path.join(process.cwd(), 'data');

/** Default live database path (mirrors {@link AnalyticsDB}). */
export const DEFAULT_DB_PATH = path.join(DATA_DIR, 'analytics.db');
/** Default snapshot directory. */
export const DEFAULT_BACKUP_DIR = path.join(DATA_DIR, BACKUP.DIR_NAME);

export interface BackupOptions {
  /** Source database file. Defaults to the live analytics DB. */
  dbPath?: string;
  /** Snapshot output directory. Defaults to `data/backups`. */
  backupDir?: string;
  /** How many snapshots to keep. Defaults to env override or {@link BACKUP.RETENTION}. */
  keep?: number;
  /** Injectable clock for deterministic filenames in tests. */
  now?: Date;
}

export type BackupStatus = 'created' | 'skipped-duplicate' | 'skipped-no-db' | 'disabled';

export interface BackupResult {
  status: BackupStatus;
  /** Absolute path of the snapshot that was kept (created only). */
  file?: string;
  /** Absolute paths of snapshots removed by retention pruning. */
  pruned: string[];
}

/**
 * Whether the on-startup snapshot is enabled. Disabled when the env flag is
 * explicitly 'false' or '0'.
 */
export function isBackupEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env[BACKUP.ENABLED_ENV];
  if (raw === undefined) return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'no';
}

/** Resolve the retention count from env override, falling back to the constant. */
export function resolveRetention(
  explicit?: number,
  env: NodeJS.ProcessEnv = process.env,
): number {
  if (typeof explicit === 'number' && explicit > 0) return Math.floor(explicit);
  const fromEnv = Number.parseInt(env[BACKUP.RETENTION_ENV] ?? '', 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return BACKUP.RETENTION;
}

/**
 * Filesystem-safe UTC timestamp for a snapshot filename.
 * `2026-07-22T18:56:00.123Z` -> `2026-07-22T18-56-00-123Z` (lexically sortable).
 */
export function backupTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

/** List snapshot files (absolute paths), newest first by filename. */
export function listBackups(backupDir: string = DEFAULT_BACKUP_DIR): string[] {
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((name) => name.startsWith(BACKUP.FILE_PREFIX) && name.endsWith(BACKUP.FILE_EXT))
    .sort()
    .reverse()
    .map((name) => path.join(backupDir, name));
}

/** SHA-256 of a file's bytes, or null if unreadable. */
function fileHash(filePath: string): string | null {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Remove snapshots beyond the retention count. Returns the paths removed.
 */
export function pruneBackups(
  backupDir: string = DEFAULT_BACKUP_DIR,
  keep: number = BACKUP.RETENTION,
): string[] {
  const all = listBackups(backupDir);
  const doomed = all.slice(Math.max(keep, 0));
  const removed: string[] = [];
  for (const file of doomed) {
    try {
      fs.unlinkSync(file);
      removed.push(file);
    } catch {
      // best-effort prune; leave the file if it can't be removed
    }
  }
  return removed;
}

/**
 * Create a WAL-consistent snapshot of the database.
 *
 * - No source DB -> `skipped-no-db`.
 * - Snapshot identical to the previous newest -> `skipped-duplicate` (deleted).
 * - Otherwise -> `created`, then retention pruning runs.
 *
 * Never throws for expected conditions; a hard I/O failure still propagates so
 * the caller (instrumentation) can log it without crashing boot.
 */
export async function createBackup(options: BackupOptions = {}): Promise<BackupResult> {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const backupDir = options.backupDir ?? DEFAULT_BACKUP_DIR;
  const keep = resolveRetention(options.keep);
  const now = options.now ?? new Date();

  if (!fs.existsSync(dbPath)) {
    return { status: 'skipped-no-db', pruned: [] };
  }

  fs.mkdirSync(backupDir, { recursive: true });

  const previousNewest = listBackups(backupDir)[0];
  const dest = path.join(
    backupDir,
    `${BACKUP.FILE_PREFIX}${backupTimestamp(now)}${BACKUP.FILE_EXT}`,
  );

  // Online backup: reads the live DB including un-checkpointed WAL pages.
  const source = new Database(dbPath, { readonly: true });
  try {
    await source.backup(dest);
  } finally {
    source.close();
  }

  // Skip storing an identical consecutive snapshot (no new data since last boot).
  if (previousNewest) {
    const prevHash = fileHash(previousNewest);
    const newHash = fileHash(dest);
    if (prevHash && newHash && prevHash === newHash) {
      fs.unlinkSync(dest);
      return { status: 'skipped-duplicate', pruned: pruneBackups(backupDir, keep) };
    }
  }

  return { status: 'created', file: dest, pruned: pruneBackups(backupDir, keep) };
}

/**
 * Entry point for the server-start hook. Respects the enable flag, swallows
 * errors (logged) so a backup failure can never take down the server.
 */
export async function runStartupBackup(options: BackupOptions = {}): Promise<BackupResult> {
  if (!isBackupEnabled()) {
    return { status: 'disabled', pruned: [] };
  }
  try {
    const result = await createBackup(options);
    if (result.status === 'created') {
      console.info(`[backup] snapshot created: ${result.file}`);
    } else if (result.status === 'skipped-duplicate') {
      console.info('[backup] no changes since last snapshot; skipped');
    } else if (result.status === 'skipped-no-db') {
      console.info('[backup] no database yet; nothing to snapshot');
    }
    if (result.pruned.length > 0) {
      console.info(`[backup] pruned ${result.pruned.length} old snapshot(s)`);
    }
    return result;
  } catch (error) {
    console.error('[backup] startup snapshot failed:', error);
    return { status: 'skipped-no-db', pruned: [] };
  }
}
