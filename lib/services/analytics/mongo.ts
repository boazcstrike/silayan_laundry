/**
 * MongoDB connection helper.
 *
 * Caches a single MongoClient connect-promise on globalThis so Next.js dev
 * (HMR) and serverless invocations reuse one pool instead of opening a new
 * connection per request/reload.
 *
 * Uses a STANDARD (non-SRV) connection string. The `mongodb+srv://` scheme
 * needs an SRV DNS lookup that some local resolvers (e.g. a 127.0.0.1 proxy)
 * refuse; the standard URI lists shard hosts directly and only needs A records.
 */
import { MongoClient, type Db } from 'mongodb';

const DEFAULT_DB_NAME = 'laundry_silayan';
// Fail fast to the SQLite fallback instead of hanging the dashboard.
const SERVER_SELECTION_TIMEOUT_MS = 3000;

interface MongoCache {
  client: MongoClient;
  promise: Promise<MongoClient>;
}

// Reuse across HMR reloads in dev.
const globalForMongo = globalThis as unknown as {
  __mongoCache?: MongoCache;
};

/**
 * True when a Mongo connection string is configured. When false the app runs
 * SQLite-only (local dev without Mongo, or Mongo intentionally disabled).
 */
export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

/** Configured target database name. */
export function getMongoDbName(): string {
  return process.env.MONGODB_DB ?? DEFAULT_DB_NAME;
}

/**
 * Resolve a connected {@link Db}. Throws if Mongo is not configured or the
 * connection cannot be established — callers should catch and fall back.
 */
export async function getMongoDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  if (!globalForMongo.__mongoCache) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
    });
    // Drop the cache on connect failure so a later call retries instead of
    // awaiting a permanently-rejected promise (which would pin reads to SQLite).
    const promise = client.connect().catch((error) => {
      globalForMongo.__mongoCache = undefined;
      throw error;
    });
    globalForMongo.__mongoCache = { client, promise };
  }

  const connected = await globalForMongo.__mongoCache.promise;
  return connected.db(getMongoDbName());
}
