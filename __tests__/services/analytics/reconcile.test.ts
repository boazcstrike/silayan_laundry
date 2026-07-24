/**
 * Unit tests for the SQLite -> Mongo startup reconcile.
 * SQLite is mocked (no real DB) and the Mongo store is a fake — no real Mongo.
 */
import {
  reconcileMongoFromSqlite,
  runStartupReconcile,
  toSubmissionDoc,
  isReconcileEnabled,
  type SqliteSubmissionRow,
} from '@/lib/services/analytics/reconcile';
import type { MongoAnalyticsStore } from '@/lib/services/analytics/MongoAnalyticsStore';
import { getAnalyticsDB } from '@/lib/services/AnalyticsDB';
import { RECONCILE } from '@/lib/constants';

jest.mock('@/lib/services/AnalyticsDB', () => ({
  getAnalyticsDB: jest.fn(),
}));

// Mock the Mongo connection module so importing MongoAnalyticsStore never pulls
// in the real `mongodb` driver (native ESM bson) — this stays a pure unit test.
jest.mock('@/lib/services/analytics/mongo', () => ({
  isMongoConfigured: jest.fn(() => true),
  getMongoDb: jest.fn(),
}));

const mockGetAnalyticsDB = getAnalyticsDB as jest.MockedFunction<typeof getAnalyticsDB>;

function row(id: number, day = '2026-06-13'): SqliteSubmissionRow {
  return {
    id,
    timestamp: `${day} 10:00:0${id % 10}`,
    channel: 'discord',
    customer_reference: null,
    scenario: null,
    total_items: 3,
    items_with_values: 2,
    channel_success: 1,
    items: [{ name: 'Shirt', count: id }],
  };
}

function stubSqliteRows(rows: SqliteSubmissionRow[]): void {
  mockGetAnalyticsDB.mockReturnValue({
    exportToJSON: () => JSON.stringify(rows),
  } as unknown as ReturnType<typeof getAnalyticsDB>);
}

function makeMongo(knownIds: number[]): jest.Mocked<Pick<MongoAnalyticsStore, 'getKnownSqliteIds' | 'upsertBySqliteId'>> {
  return {
    getKnownSqliteIds: jest.fn().mockResolvedValue(new Set(knownIds)),
    upsertBySqliteId: jest.fn().mockResolvedValue(undefined),
  };
}

describe('reconcile', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  describe('toSubmissionDoc', () => {
    it('maps a SQLite row to the camelCase Mongo doc, day from the local prefix', () => {
      const doc = toSubmissionDoc(row(15, '2026-06-21'));
      expect(doc.sqliteId).toBe(15);
      expect(doc.day).toBe('2026-06-21');
      expect(doc.channel).toBe('discord');
      expect(doc.channelSuccess).toBe(true);
      expect(doc.items).toEqual([{ name: 'Shirt', count: 15 }]);
    });
  });

  describe('reconcileMongoFromSqlite', () => {
    it('upserts only the SQLite rows Mongo is missing', async () => {
      stubSqliteRows([row(1), row(2), row(3), row(4), row(5)]);
      const mongo = makeMongo([1, 2, 3]);

      const result = await reconcileMongoFromSqlite(mongo as unknown as MongoAnalyticsStore);

      expect(result).toEqual({ status: 'reconciled', inserted: 2, totalSqlite: 5 });
      expect(mongo.upsertBySqliteId).toHaveBeenCalledTimes(2);
      const upsertedIds = mongo.upsertBySqliteId.mock.calls.map(([doc]) => doc.sqliteId);
      expect(upsertedIds.sort()).toEqual([4, 5]);
    });

    it('writes nothing and reports in-sync when Mongo already has every row', async () => {
      stubSqliteRows([row(1), row(2), row(3)]);
      const mongo = makeMongo([1, 2, 3]);

      const result = await reconcileMongoFromSqlite(mongo as unknown as MongoAnalyticsStore);

      expect(result).toEqual({ status: 'in-sync', inserted: 0, totalSqlite: 3 });
      expect(mongo.upsertBySqliteId).not.toHaveBeenCalled();
    });

    it('reports no-mongo and touches nothing when Mongo is not configured', async () => {
      stubSqliteRows([row(1)]);

      const result = await reconcileMongoFromSqlite(null);

      expect(result).toEqual({ status: 'no-mongo', inserted: 0, totalSqlite: 0 });
      expect(mockGetAnalyticsDB).not.toHaveBeenCalled();
    });
  });

  describe('runStartupReconcile', () => {
    const original = process.env[RECONCILE.ENABLED_ENV];
    afterEach(() => {
      if (original === undefined) delete process.env[RECONCILE.ENABLED_ENV];
      else process.env[RECONCILE.ENABLED_ENV] = original;
    });

    it('is a no-op when disabled by env', async () => {
      process.env[RECONCILE.ENABLED_ENV] = 'false';
      const mongo = makeMongo([]);

      const result = await runStartupReconcile(mongo as unknown as MongoAnalyticsStore);

      expect(result.status).toBe('disabled');
      expect(mongo.getKnownSqliteIds).not.toHaveBeenCalled();
    });

    it('swallows a reconcile error and never throws', async () => {
      delete process.env[RECONCILE.ENABLED_ENV];
      jest.spyOn(console, 'error').mockImplementation(() => {});
      stubSqliteRows([row(1)]);
      const mongo = makeMongo([]);
      mongo.getKnownSqliteIds.mockRejectedValue(new Error('mongo down'));

      const result = await runStartupReconcile(mongo as unknown as MongoAnalyticsStore);

      expect(result).toEqual({ status: 'failed', inserted: 0, totalSqlite: 0 });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('isReconcileEnabled', () => {
    it('defaults to enabled when the env var is absent', () => {
      expect(isReconcileEnabled({})).toBe(true);
    });

    it.each(['false', '0', 'no', 'NO', ' False '])('is disabled for %p', (val) => {
      expect(isReconcileEnabled({ [RECONCILE.ENABLED_ENV]: val })).toBe(false);
    });
  });
});
