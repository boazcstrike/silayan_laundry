/**
 * Live end-to-end check against the real Atlas cluster.
 * Dual-writes through DualAnalyticsStore into a TEMP SQLite file + real Mongo,
 * reads back via the Mongo aggregation pipelines, asserts, then deletes only
 * the docs it created (tagged with a unique customerReference marker).
 *
 * Run: pnpm dlx tsx scripts/verify-dual-write.ts
 */
import 'dotenv/config';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { AnalyticsDB } from '../lib/services/AnalyticsDB';
import { SqliteAnalyticsStore } from '../lib/services/analytics/SqliteAnalyticsStore';
import { MongoAnalyticsStore } from '../lib/services/analytics/MongoAnalyticsStore';
import { DualAnalyticsStore } from '../lib/services/analytics/DualAnalyticsStore';
import { getMongoDb } from '../lib/services/analytics/mongo';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

async function main(): Promise<void> {
  const marker = `__e2e_${Date.now()}`;
  const tmpDb = path.join(os.tmpdir(), `${marker}.db`);
  const sqlite = new SqliteAnalyticsStore(new AnalyticsDB(tmpDb));
  const mongo = new MongoAnalyticsStore();
  const store = new DualAnalyticsStore(sqlite, mongo);

  try {
    const id1 = await store.recordSubmission(
      { Shirt: 3, Towel: 2 },
      { channel: 'discord', customerReference: marker },
    );
    const id2 = await store.recordSubmission(
      { Shirt: 1, Sock: 5 },
      { channel: 'download', customerReference: marker },
    );
    console.log('dual-write ids (SQLite):', id1, id2);
    assert(id1 > 0 && id2 > id1, 'SQLite returned monotonic ids');

    // Read back from Mongo directly (scoped to our marker to stay non-flaky).
    const db = await getMongoDb();
    const coll = db.collection('submissions');
    const mine = await coll.find({ customerReference: marker }).toArray();
    assert(mine.length === 2, `expected 2 Mongo docs, got ${mine.length}`);

    const linked = mine.filter((d) => d.sqliteId === id1 || d.sqliteId === id2);
    assert(linked.length === 2, 'both Mongo docs carry their SQLite id');

    const withDay = mine.every((d) => typeof d.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.day));
    assert(withDay, 'every doc has a YYYY-MM-DD day');

    const shirtDoc = mine.find((d) => d.sqliteId === id1);
    const shirt = shirtDoc?.items.find((i: { name: string; count: number }) => i.name === 'Shirt');
    assert(shirt?.count === 3, 'embedded Shirt count is 3');

    // Exercise a real aggregation pipeline end-to-end.
    const timeline = await mongo.getCategoryTimeline();
    const shirtRows = timeline.filter((r) => r.name === 'Shirt');
    assert(shirtRows.length > 0, 'timeline pipeline returns Shirt rows');

    console.log('\nDUAL-WRITE E2E OK');
  } finally {
    // Cleanup: remove only our tagged docs + the temp SQLite file.
    try {
      const db = await getMongoDb();
      const res = await db.collection('submissions').deleteMany({ customerReference: marker });
      console.log(`cleanup: deleted ${res.deletedCount} Mongo doc(s)`);
    } catch (err) {
      console.error('cleanup (mongo) failed:', err instanceof Error ? err.message : err);
    }
    // The temp SQLite handle is released on process exit; just remove the files.
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.rmSync(`${tmpDb}${suffix}`, { force: true });
      } catch {
        /* ignore */
      }
    }
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('E2E FAILED:', error);
  process.exit(1);
});
