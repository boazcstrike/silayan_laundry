/**
 * Next.js instrumentation — runs once per server start.
 *
 * On boot we:
 *  1. Snapshot the analytics SQLite database to `data/backups/` so there is
 *     always a recent restore point.
 *  2. Reconcile Mongo from SQLite — mirror any rows SQLite has that Mongo is
 *     missing (e.g. after a manual DB merge/restore), so the dashboard (which
 *     reads Mongo) reflects the full local dataset.
 *
 * Both are guarded to the Node.js runtime (better-sqlite3 is a native addon) and
 * both swallow their own errors, so neither can crash boot.
 *
 * See `lib/services/backup/SqliteBackupService.ts`, `docs/backups.md`,
 * `lib/services/analytics/reconcile.ts`, and `docs/data-layer.md`.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { runStartupBackup } = await import('./lib/services/backup/SqliteBackupService');
  await runStartupBackup();

  const { runStartupReconcile } = await import('./lib/services/analytics/reconcile');
  await runStartupReconcile();
}
