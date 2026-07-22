# Local Backups & Restore Points (SQLite)

> Entry point for agents/humans is `AGENTS.md` → `GEMINI.md`. Persistence overview is
> [`data-layer.md`](./data-layer.md). This page covers **local snapshots** of the analytics
> SQLite database — the safety net while MongoDB is unavailable.

## Why

The MongoDB Atlas cluster was removed (free-tier idle deletion), so the app currently runs
**SQLite-only** (`data/analytics.db` is the live, canonical data). To avoid data loss, the
server takes a **snapshot on every start** and keeps a rolling set of restore points.

## How it works

- **Trigger:** `instrumentation.ts` `register()` runs once per server boot (guarded to the
  Node.js runtime) and calls `runStartupBackup()`.
- **Mechanism:** better-sqlite3's online `db.backup()` — a WAL-consistent snapshot, **not** a
  raw file copy (a raw copy can capture a torn WAL and corrupt the snapshot).
- **Location:** `data/backups/analytics-<timestamp>.db` (UTC, filesystem-safe, sortable).
- **Dedup:** if the new snapshot is byte-identical to the previous newest (no data changed
  since last boot), it is discarded — no duplicate restore points.
- **Retention:** the newest `BACKUP.RETENTION` (default **10**) are kept; older ones pruned.
- **Never crashes boot:** any backup error is logged and swallowed.

`data/` is git-ignored, so snapshots stay **local** — exactly the intent (local restore points,
not committed to the repo).

## Configuration (`lib/constants.ts` → `BACKUP`)

| Env var | Effect | Default |
|---|---|---|
| `BACKUP_ON_STARTUP` | Set to `false`/`0`/`no` to disable startup snapshots | enabled |
| `BACKUP_RETENTION` | Override how many snapshots to keep | `10` |

## Restore

Stop the server first, then:

```bash
node scripts/db-restore.mjs            # list snapshots, newest first
node scripts/db-restore.mjs 0          # restore snapshot #0 from the list
node scripts/db-restore.mjs data/backups/analytics-2026-07-22T11-02-59-855Z.db  # by path
# or: pnpm db:restore <n|path>
```

Restore is **manual and never automatic**. It:

1. Safety-copies the current live DB to `data/backups/pre-restore-<timestamp>.db`.
2. Copies the chosen snapshot over `data/analytics.db`.
3. Removes stale `-wal` / `-shm` sidecars so SQLite does not replay an old write-ahead log
   over the restored data.

## Files

| File | Responsibility |
|---|---|
| `lib/services/backup/SqliteBackupService.ts` | Snapshot creation, dedup, listing, pruning; `runStartupBackup()` entry point |
| `instrumentation.ts` | Next.js boot hook that fires the startup snapshot |
| `scripts/db-restore.mjs` | Standalone restore CLI (no app runtime needed) |
| `__tests__/services/backup/SqliteBackupService.test.ts` | Unit tests (18 cases) |

## Backlog — off-machine copy (NOT started)

Current snapshots sit on the **same disk** as the live DB: good against data corruption / bad
writes, **not** against disk loss or a lost machine. Real disaster recovery needs an off-machine
copy. Two free options evaluated (R2 declined for now — no spend / no card):

### Option A — Cloudflare R2 (deferred; costs ~$0 but wants a card on file)

- S3-compatible bucket in the existing CF account. Zero egress fees; snapshots ~36 KB → free tier
  (10 GB / 1M writes / 10M reads per month) covers it indefinitely.
- Flow: after each local snapshot, async fire-and-forget upload (errors swallowed, never blocks boot).
- Setup: create bucket `laundry-backups`; R2 → Manage API Tokens → S3 creds (Object Read & Write,
  scoped to bucket); env `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`;
  `pnpm add @aws-sdk/client-s3`; endpoint `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`,
  region `auto`.
- Restore-from-R2: CLI flag pulls the object down, then existing `db-restore.mjs` path takes over.

### Option B — Synced folder (zero deps, zero secrets, zero spend)

- `fs.copyFile` each new snapshot to `BACKUP_MIRROR_DIR` (external drive, or a OneDrive/Drive
  folder that syncs to the cloud on its own). Off-machine only if that folder syncs.
- Smallest change: add a `BACKUP_MIRROR_DIR` env; mirror inside `createBackup()` after write.

**Decision deferred.** Pick A or B next session.

## Relationship to the Mongo backlog

When Mongo returns (see [`deploy-cloudflare.md`](./deploy-cloudflare.md) and `data-layer.md`),
these local snapshots remain useful as a fast, offline restore point independent of the remote
store. They are complementary, not a replacement for an off-machine backup.
