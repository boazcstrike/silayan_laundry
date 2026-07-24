/**
 * One-time (idempotent) backfill: copy ALL existing SQLite submissions into
 * MongoDB so the dashboard has full history. Upserts every row on `sqliteId`, so
 * it is safe to re-run and also acts as a full repair pass (rewrites drifted
 * docs, not just missing ones).
 *
 * For the lighter gap-fill that runs automatically on server boot — mirroring
 * only the rows Mongo is missing — see `lib/services/analytics/reconcile.ts`.
 *
 * Run: pnpm dlx tsx scripts/backfill-mongo.ts
 * Requires MONGODB_URI + MONGODB_DB in .env.
 */
import 'dotenv/config';
import { MongoAnalyticsStore } from '../lib/services/analytics/MongoAnalyticsStore';
import { isMongoConfigured } from '../lib/services/analytics/mongo';
import { loadSqliteSubmissions, toSubmissionDoc } from '../lib/services/analytics/reconcile';

async function main(): Promise<void> {
  if (!isMongoConfigured()) {
    console.error('MONGODB_URI not set — nothing to backfill into.');
    process.exit(1);
  }

  const submissions = loadSqliteSubmissions();
  const mongo = new MongoAnalyticsStore();
  let done = 0;

  for (const sub of submissions) {
    await mongo.upsertBySqliteId(toSubmissionDoc(sub));
    done += 1;
  }

  console.log(`Backfilled ${done} submission(s) into MongoDB.`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
