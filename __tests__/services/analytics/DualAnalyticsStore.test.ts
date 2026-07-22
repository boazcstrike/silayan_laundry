/**
 * Unit tests for DualAnalyticsStore write/read composition.
 * Backends are mocked — no real SQLite or Mongo involved.
 */
import { DualAnalyticsStore } from '@/lib/services/analytics/DualAnalyticsStore';
import type { AnalyticsStore } from '@/lib/services/analytics/AnalyticsStore';
import type { MongoAnalyticsStore } from '@/lib/services/analytics/MongoAnalyticsStore';
import type { AnalyticsSummary } from '@/lib/services/AnalyticsDB';

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalSubmissions: 0,
  successfulSubmissions: 0,
  failedSubmissions: 0,
  averageItemsPerSubmission: 0,
  mostFrequentItems: [],
  recentSubmissions: [],
};

function makeSqlite(): jest.Mocked<AnalyticsStore> {
  return {
    recordSubmission: jest.fn().mockResolvedValue(42),
    getSubmission: jest.fn().mockResolvedValue(null),
    getRecentSubmissions: jest.fn().mockResolvedValue([]),
    getSummary: jest.fn().mockResolvedValue({ ...EMPTY_SUMMARY, totalSubmissions: 1 }),
    getSubmissionsByDateRange: jest.fn().mockResolvedValue([]),
    getSubmissionsByChannel: jest.fn().mockResolvedValue([]),
    getChannelStats: jest.fn().mockResolvedValue([]),
    getCategoryAverages: jest.fn().mockResolvedValue([]),
    getCategoryTimeline: jest.fn().mockResolvedValue([]),
    getDailyCounts: jest.fn().mockResolvedValue([]),
    getLaundryDays: jest.fn().mockResolvedValue([]),
  };
}

describe('DualAnalyticsStore', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('recordSubmission (dual write)', () => {
    it('writes SQLite then Mongo with the SQLite id, and returns that id', async () => {
      const sqlite = makeSqlite();
      const mongo = { insertSubmission: jest.fn().mockResolvedValue(undefined) };
      const store = new DualAnalyticsStore(sqlite, mongo as unknown as MongoAnalyticsStore);

      const counts = { Shirt: 2 };
      const options = { channel: 'discord' as const };
      const id = await store.recordSubmission(counts, options);

      expect(id).toBe(42);
      expect(sqlite.recordSubmission).toHaveBeenCalledWith(counts, options);
      expect(mongo.insertSubmission).toHaveBeenCalledWith(counts, options, 42);
    });

    it('still returns the SQLite id when the Mongo write fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const sqlite = makeSqlite();
      const mongo = { insertSubmission: jest.fn().mockRejectedValue(new Error('mongo down')) };
      const store = new DualAnalyticsStore(sqlite, mongo as unknown as MongoAnalyticsStore);

      const id = await store.recordSubmission({ Towel: 1 }, { channel: 'download' });

      expect(id).toBe(42);
      expect(mongo.insertSubmission).toHaveBeenCalled();
    });

    it('writes SQLite only when Mongo is not configured', async () => {
      const sqlite = makeSqlite();
      const store = new DualAnalyticsStore(sqlite, null);

      const id = await store.recordSubmission({ Sock: 3 }, { channel: 'download' });

      expect(id).toBe(42);
      expect(sqlite.recordSubmission).toHaveBeenCalled();
    });
  });

  describe('reads (Mongo-first with SQLite fallback)', () => {
    it('reads from Mongo when it succeeds and does not touch SQLite', async () => {
      const sqlite = makeSqlite();
      const mongoSummary: AnalyticsSummary = { ...EMPTY_SUMMARY, totalSubmissions: 99 };
      const mongo = { getSummary: jest.fn().mockResolvedValue(mongoSummary) };
      const store = new DualAnalyticsStore(sqlite, mongo as unknown as MongoAnalyticsStore);

      const summary = await store.getSummary();

      expect(summary.totalSubmissions).toBe(99);
      expect(mongo.getSummary).toHaveBeenCalled();
      expect(sqlite.getSummary).not.toHaveBeenCalled();
    });

    it('falls back to SQLite when the Mongo read throws', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const sqlite = makeSqlite();
      const mongo = { getSummary: jest.fn().mockRejectedValue(new Error('unreachable')) };
      const store = new DualAnalyticsStore(sqlite, mongo as unknown as MongoAnalyticsStore);

      const summary = await store.getSummary();

      expect(summary.totalSubmissions).toBe(1); // SQLite mock value
      expect(mongo.getSummary).toHaveBeenCalled();
      expect(sqlite.getSummary).toHaveBeenCalled();
    });

    it('reads directly from SQLite when Mongo is not configured', async () => {
      const sqlite = makeSqlite();
      const store = new DualAnalyticsStore(sqlite, null);

      await store.getCategoryTimeline();

      expect(sqlite.getCategoryTimeline).toHaveBeenCalled();
    });
  });
});
