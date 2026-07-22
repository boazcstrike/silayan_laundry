/**
 * One-time (idempotent) backfill: copy existing SQLite submissions into MongoDB
 * so the dashboard has history on cutover. Upserts on `sqliteId`, so it is safe
 * to re-run (also acts as a reconciliation pass for rows Mongo missed).
 *
 * Run: pnpm dlx tsx scripts/backfill-mongo.ts
 * Requires MONGODB_URI + MONGODB_DB in .env.
 */
import 'dotenv/config';
import { getAnalyticsDB } from '../lib/services/AnalyticsDB';
import { MongoAnalyticsStore, localDay, type SubmissionDoc } from '../lib/services/analytics/MongoAnalyticsStore';
import { isMongoConfigured } from '../lib/services/analytics/mongo';

/** Parse SQLite's local 'YYYY-MM-DD HH:MM:SS' string into a Date (local tz). */
function parseSqliteTimestamp(ts: string): Date {
  const parsed = new Date(ts.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? new Date(ts) : parsed;
}

async function main(): Promise<void> {
  if (!isMongoConfigured()) {
    console.error('MONGODB_URI not set — nothing to backfill into.');
    process.exit(1);
  }

  const db = getAnalyticsDB();
  const submissions = JSON.parse(db.exportToJSON()) as Array<{
    id: number;
    timestamp: string;
    channel: SubmissionDoc['channel'];
    customer_reference: string | null;
    scenario: string | null;
    total_items: number;
    items_with_values: number;
    channel_success: number | boolean;
    items: { name: string; count: number }[];
  }>;

  const mongo = new MongoAnalyticsStore();
  let done = 0;

  for (const sub of submissions) {
    const timestamp = parseSqliteTimestamp(sub.timestamp);
    const doc: SubmissionDoc = {
      sqliteId: sub.id,
      timestamp,
      day: sub.timestamp.slice(0, 10) || localDay(timestamp),
      channel: sub.channel,
      customerReference: sub.customer_reference,
      scenario: sub.scenario,
      totalItems: sub.total_items,
      itemsWithValues: sub.items_with_values,
      channelSuccess: Boolean(sub.channel_success),
      items: sub.items,
    };
    await mongo.upsertBySqliteId(doc);
    done += 1;
  }

  console.log(`Backfilled ${done} submission(s) into MongoDB.`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
