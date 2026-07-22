/**
 * Next.js instrumentation — runs once per server start.
 *
 * On boot we snapshot the analytics SQLite database to `data/backups/` so there
 * is always a recent restore point (Mongo is currently unavailable). Guarded to
 * the Node.js runtime because better-sqlite3 is a native addon.
 *
 * See `lib/services/backup/SqliteBackupService.ts` and `docs/backups.md`.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { runStartupBackup } = await import('./lib/services/backup/SqliteBackupService');
  await runStartupBackup();
}
