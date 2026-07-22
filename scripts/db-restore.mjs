/**
 * Restore the analytics SQLite database from a snapshot ("restore point").
 *
 * Standalone Node script (no app runtime needed). Pure fs — copies the chosen
 * snapshot over the live DB and removes stale -wal/-shm sidecars so SQLite does
 * NOT replay an old write-ahead log over the restored data.
 *
 * The current live DB is safety-copied to data/backups/pre-restore-<ts>.db
 * before it is overwritten.
 *
 * Usage:
 *   node scripts/db-restore.mjs            # list snapshots, newest first
 *   node scripts/db-restore.mjs <n>        # restore snapshot number <n> from the list
 *   node scripts/db-restore.mjs <path>     # restore a specific snapshot file
 *
 * IMPORTANT: stop the server before restoring.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'analytics.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const PREFIX = 'analytics-';
const EXT = '.db';

function listSnapshots() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => name.startsWith(PREFIX) && name.endsWith(EXT))
    .sort()
    .reverse()
    .map((name) => path.join(BACKUP_DIR, name));
}

function fmtSize(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function printList(snapshots) {
  if (snapshots.length === 0) {
    console.log('No snapshots found in', BACKUP_DIR);
    return;
  }
  console.log(`Snapshots in ${BACKUP_DIR} (newest first):\n`);
  snapshots.forEach((file, i) => {
    const { size, mtime } = fs.statSync(file);
    console.log(`  [${i}] ${path.basename(file)}  ${fmtSize(size)}  ${mtime.toISOString()}`);
  });
  console.log('\nRestore with: node scripts/db-restore.mjs <n>');
}

function removeSidecars(dbPath) {
  for (const suffix of ['-wal', '-shm']) {
    const sidecar = dbPath + suffix;
    if (fs.existsSync(sidecar)) fs.rmSync(sidecar);
  }
}

function safetyCopyCurrent() {
  if (!fs.existsSync(DB_PATH)) return null;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUP_DIR, `pre-restore-${stamp}${EXT}`);
  fs.copyFileSync(DB_PATH, dest);
  return dest;
}

function resolveTarget(arg, snapshots) {
  if (/^\d+$/.test(arg)) {
    const idx = Number.parseInt(arg, 10);
    if (idx < 0 || idx >= snapshots.length) {
      console.error(`Index ${idx} out of range (0..${snapshots.length - 1}).`);
      process.exit(1);
    }
    return snapshots[idx];
  }
  const asPath = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
  if (!fs.existsSync(asPath)) {
    console.error('Snapshot not found:', asPath);
    process.exit(1);
  }
  return asPath;
}

function main() {
  const arg = process.argv[2];
  const snapshots = listSnapshots();

  if (!arg) {
    printList(snapshots);
    return;
  }

  const target = resolveTarget(arg, snapshots);
  const saved = safetyCopyCurrent();
  if (saved) console.log('Current DB safety-copied to:', saved);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.copyFileSync(target, DB_PATH);
  removeSidecars(DB_PATH);

  console.log('Restored from:', target);
  console.log('Done. Start the server to use the restored data.');
}

main();
