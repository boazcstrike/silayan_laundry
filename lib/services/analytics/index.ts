/**
 * Analytics store entry point.
 *
 * Returns a process-wide {@link DualAnalyticsStore} singleton. When Mongo is
 * configured it dual-writes (SQLite + Mongo) and reads Mongo-first; otherwise
 * it runs SQLite-only. Routes should depend on this, not on a concrete backend.
 */
import { SqliteAnalyticsStore } from './SqliteAnalyticsStore';
import { MongoAnalyticsStore } from './MongoAnalyticsStore';
import { DualAnalyticsStore } from './DualAnalyticsStore';
import { isMongoConfigured } from './mongo';
import type { AnalyticsStore } from './AnalyticsStore';

let instance: AnalyticsStore | null = null;

export function getAnalyticsStore(): AnalyticsStore {
  if (!instance) {
    const sqlite = new SqliteAnalyticsStore();
    const mongo = isMongoConfigured() ? new MongoAnalyticsStore() : null;
    instance = new DualAnalyticsStore(sqlite, mongo);
  }
  return instance;
}

export type { AnalyticsStore } from './AnalyticsStore';
