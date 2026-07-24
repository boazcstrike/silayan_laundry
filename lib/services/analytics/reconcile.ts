/**
 * SQLite → MongoDB reconciliation.
 *
 * Live submissions dual-write to both stores, but rows that enter SQLite by
 * another path — a manual DB merge from another machine, a restore point — never
 * reach Mongo on their own. Since the dashboard reads Mongo, those rows stay
 * invisible until reconciled.
 *
 * This module fills that gap. {@link reconcileMongoFromSqlite} upserts only the
 * SQLite rows whose `sqliteId` Mongo is missing (non-destructive: Mongo-only
 * rows and already-present rows are left untouched). {@link runStartupReconcile}
 * is the boot hook (see `instrumentation.ts`) — enable-flagged and error-swallowed
 * so it can never crash the server.
 *
 * The full-rewrite variant used by the one-off `scripts/backfill-mongo.ts` shares
 * the row-loading and doc-building helpers exported here.
 *
 * See `docs/data-layer.md`.
 */
import { getAnalyticsDB } from '@/lib/services/AnalyticsDB';
import { MongoAnalyticsStore, localDay, type SubmissionDoc } from './MongoAnalyticsStore';
import { isMongoConfigured } from './mongo';
import { RECONCILE } from '@/lib/constants';

/** A submission row as produced by {@link AnalyticsDB.exportToJSON}. */
export interface SqliteSubmissionRow {
  id: number;
  timestamp: string;
  channel: SubmissionDoc['channel'];
  customer_reference: string | null;
  scenario: string | null;
  total_items: number;
  items_with_values: number;
  channel_success: number | boolean;
  items: { name: string; count: number }[];
}

export type ReconcileStatus = 'disabled' | 'no-mongo' | 'in-sync' | 'reconciled' | 'failed';

export interface ReconcileResult {
  status: ReconcileStatus;
  /** Rows upserted into Mongo this run. */
  inserted: number;
  /** Total submissions found in SQLite. */
  totalSqlite: number;
}

/** Parse SQLite's local 'YYYY-MM-DD HH:MM:SS' string into a Date (local tz). */
export function parseSqliteTimestamp(ts: string): Date {
  const parsed = new Date(ts.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? new Date(ts) : parsed;
}

/** Build the camelCase Mongo document for a SQLite submission row. */
export function toSubmissionDoc(row: SqliteSubmissionRow): SubmissionDoc {
  const timestamp = parseSqliteTimestamp(row.timestamp);
  return {
    sqliteId: row.id,
    timestamp,
    // The denormalized local grouping day — parity-critical. Prefer SQLite's
    // own local date prefix; fall back to recomputing from the parsed instant.
    day: row.timestamp.slice(0, 10) || localDay(timestamp),
    channel: row.channel,
    customerReference: row.customer_reference,
    scenario: row.scenario,
    totalItems: row.total_items,
    itemsWithValues: row.items_with_values,
    channelSuccess: Boolean(row.channel_success),
    items: row.items,
  };
}

/** Load every submission from the local SQLite database. */
export function loadSqliteSubmissions(): SqliteSubmissionRow[] {
  const db = getAnalyticsDB();
  return JSON.parse(db.exportToJSON()) as SqliteSubmissionRow[];
}

/** Whether the on-startup reconcile is enabled (disabled via env 'false'/'0'/'no'). */
export function isReconcileEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env[RECONCILE.ENABLED_ENV];
  if (raw === undefined) return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'no';
}

/**
 * Gap-fill Mongo from SQLite: upsert only the rows whose `sqliteId` Mongo does
 * not already have. Non-destructive and cheap on a boot where nothing is missing
 * (one `distinct` query, zero writes). Returns counts for logging.
 *
 * A `mongo` store may be injected for tests; otherwise a real one is created.
 */
export async function reconcileMongoFromSqlite(
  mongo: MongoAnalyticsStore | null = isMongoConfigured() ? new MongoAnalyticsStore() : null,
): Promise<ReconcileResult> {
  if (!mongo) {
    return { status: 'no-mongo', inserted: 0, totalSqlite: 0 };
  }

  const rows = loadSqliteSubmissions();
  const known = await mongo.getKnownSqliteIds();
  const missing = rows.filter((row) => !known.has(row.id));

  for (const row of missing) {
    await mongo.upsertBySqliteId(toSubmissionDoc(row));
  }

  return {
    status: missing.length === 0 ? 'in-sync' : 'reconciled',
    inserted: missing.length,
    totalSqlite: rows.length,
  };
}

/**
 * Boot hook. Respects the enable flag and swallows errors (logged) so a
 * reconcile failure can never take down the server.
 */
export async function runStartupReconcile(
  mongo?: MongoAnalyticsStore | null,
): Promise<ReconcileResult> {
  if (!isReconcileEnabled()) {
    return { status: 'disabled', inserted: 0, totalSqlite: 0 };
  }
  try {
    const result = await reconcileMongoFromSqlite(mongo);
    if (result.status === 'reconciled') {
      console.info(
        `[reconcile] mirrored ${result.inserted} SQLite row(s) into Mongo ` +
          `(${result.totalSqlite} total)`,
      );
    } else if (result.status === 'in-sync') {
      console.info('[reconcile] Mongo already in sync with SQLite');
    } else if (result.status === 'no-mongo') {
      console.info('[reconcile] Mongo not configured; nothing to reconcile');
    }
    return result;
  } catch (error) {
    console.error('[reconcile] startup reconcile failed:', error);
    return { status: 'failed', inserted: 0, totalSqlite: 0 };
  }
}
