/**
 * One-off MongoDB connectivity check.
 * Run: pnpm exec tsx scripts/test-mongo-connection.ts
 *   (or) node --import tsx scripts/test-mongo-connection.ts
 * Reads MONGODB_URI + MONGODB_DB from .env.
 */
import 'dotenv/config';
import dns from 'node:dns';
import { MongoClient } from 'mongodb';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? 'laundry_silayan';

  // This machine's default resolver is 127.0.0.1, which refuses SRV lookups.
  // Optionally override with public resolvers: MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8
  const dnsServers = process.env.MONGODB_DNS_SERVERS;
  if (dnsServers) {
    dns.setServers(dnsServers.split(',').map((s) => s.trim()));
    console.log('using DNS servers:', dns.getServers());
  }

  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

  try {
    await client.connect();
    const admin = client.db(dbName).admin();
    const ping = await admin.ping();
    console.log('ping:', ping);

    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    console.log(`db "${dbName}" collections:`, collections.map((c) => c.name));

    // Prove write access with a throwaway doc, then remove it.
    const probe = db.collection('_connectivity_probe');
    const insert = await probe.insertOne({ at: new Date().toISOString() });
    console.log('write ok, insertedId:', String(insert.insertedId));
    await probe.deleteOne({ _id: insert.insertedId });
    console.log('cleanup ok');

    console.log('\nCONNECTION OK');
  } catch (err) {
    console.error('CONNECTION FAILED:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Unexpected failure:', error instanceof Error ? error.message : error);
  process.exit(1);
});
