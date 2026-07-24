/** @jest-environment node */
/**
 * Tests for GET /api/submissions — the `type=history` offset-pagination branch.
 *
 * Runs in the node environment because `NextResponse` needs the WHATWG
 * Request/Response globals that jsdom does not provide. The analytics store is
 * mocked so no SQLite/Mongo backend is touched.
 */
import { GET } from '@/app/api/submissions/route';
import { getAnalyticsStore } from '@/lib/services/analytics';
import type { AnalyticsStore } from '@/lib/services/analytics/AnalyticsStore';
import type { FullSubmission } from '@/lib/services/AnalyticsDB';

jest.mock('@/lib/services/analytics', () => ({
  getAnalyticsStore: jest.fn(),
}));

const mockedGetAnalyticsStore = getAnalyticsStore as jest.MockedFunction<typeof getAnalyticsStore>;

/** Minimal slice of the store the GET handler touches. */
type StoreStub = {
  getRecentSubmissions: jest.Mock;
  getSummary: jest.Mock;
  getChannelStats: jest.Mock;
  getSubmissionsByChannel: jest.Mock;
};

function makeStore(overrides: Partial<StoreStub> = {}): StoreStub {
  const store: StoreStub = {
    getRecentSubmissions: jest.fn().mockResolvedValue([]),
    getSummary: jest.fn().mockResolvedValue({}),
    getChannelStats: jest.fn().mockResolvedValue([]),
    getSubmissionsByChannel: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
  mockedGetAnalyticsStore.mockReturnValue(store as unknown as AnalyticsStore);
  return store;
}

function makeSubmission(id: number): FullSubmission {
  return {
    id,
    timestamp: `2026-07-${String(id).padStart(2, '0')} 09:00:00`,
    channel: 'discord',
    customer_reference: null,
    scenario: null,
    total_items: 3,
    items_with_values: 1,
    channel_success: true,
    items: [{ name: 'Shirt', count: id }],
  };
}

/** `n` submissions, newest first, ids descending from `n`. */
function makeSubmissions(n: number): FullSubmission[] {
  return Array.from({ length: n }, (_, i) => makeSubmission(n - i));
}

function request(query: string): Request {
  return new Request(`http://localhost/api/submissions${query}`);
}

describe('GET /api/submissions?type=history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('response shape', () => {
    it('returns submissions plus limit, offset and hasMore metadata', async () => {
      // Arrange
      const store = makeStore({
        getRecentSubmissions: jest.fn().mockResolvedValue(makeSubmissions(2)),
      });

      // Act
      const res = await GET(request('?type=history&limit=5&offset=0'));
      const body = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(body).toEqual({
        submissions: makeSubmissions(2),
        limit: 5,
        offset: 0,
        hasMore: false,
      });
      expect(store.getRecentSubmissions).toHaveBeenCalledTimes(1);
    });

    it('defaults to limit 20 and offset 0 when neither param is supplied', async () => {
      // Arrange
      const store = makeStore();

      // Act
      const res = await GET(request('?type=history'));
      const body = await res.json();

      // Assert
      expect(body.limit).toBe(20);
      expect(body.offset).toBe(0);
      expect(store.getRecentSubmissions).toHaveBeenCalledWith(21, 0);
    });
  });

  describe('hasMore flag', () => {
    it('reports hasMore true and trims the probe row when limit+1 rows come back', async () => {
      // Arrange — store returns one more row than requested
      makeStore({
        getRecentSubmissions: jest.fn().mockResolvedValue(makeSubmissions(4)),
      });

      // Act
      const res = await GET(request('?type=history&limit=3'));
      const body = await res.json();

      // Assert
      expect(body.hasMore).toBe(true);
      expect(body.submissions).toHaveLength(3);
      expect(body.submissions.map((s: FullSubmission) => s.id)).toEqual([4, 3, 2]);
    });

    it('reports hasMore false when fewer than limit+1 rows come back', async () => {
      // Arrange
      makeStore({
        getRecentSubmissions: jest.fn().mockResolvedValue(makeSubmissions(3)),
      });

      // Act
      const res = await GET(request('?type=history&limit=3'));
      const body = await res.json();

      // Assert
      expect(body.hasMore).toBe(false);
      expect(body.submissions).toHaveLength(3);
    });

    it('reports hasMore false for an empty page', async () => {
      // Arrange
      makeStore({ getRecentSubmissions: jest.fn().mockResolvedValue([]) });

      // Act
      const res = await GET(request('?type=history&limit=10&offset=999'));
      const body = await res.json();

      // Assert
      expect(body.submissions).toEqual([]);
      expect(body.hasMore).toBe(false);
    });
  });

  describe('limit clamping', () => {
    it('raises a limit below the minimum to 1', async () => {
      // Arrange
      const store = makeStore();

      // Act
      const res = await GET(request('?type=history&limit=0'));
      const body = await res.json();

      // Assert
      expect(body.limit).toBe(1);
      expect(store.getRecentSubmissions).toHaveBeenCalledWith(2, 0);
    });

    it('caps a limit above the maximum at 100', async () => {
      // Arrange
      const store = makeStore();

      // Act
      const res = await GET(request('?type=history&limit=500'));
      const body = await res.json();

      // Assert
      expect(body.limit).toBe(100);
      expect(store.getRecentSubmissions).toHaveBeenCalledWith(101, 0);
    });

    it('clamps a negative limit up to 1', async () => {
      // Arrange
      makeStore();

      // Act
      const res = await GET(request('?type=history&limit=-5'));
      const body = await res.json();

      // Assert
      expect(body.limit).toBe(1);
    });

    it('falls back to the default limit when the param is not a number', async () => {
      // Arrange
      const store = makeStore();

      // Act
      const res = await GET(request('?type=history&limit=abc'));
      const body = await res.json();

      // Assert
      expect(body.limit).toBe(20);
      expect(store.getRecentSubmissions).toHaveBeenCalledWith(21, 0);
    });
  });

  describe('offset handling', () => {
    it('passes a positive offset straight through to the store', async () => {
      // Arrange
      const store = makeStore();

      // Act
      const res = await GET(request('?type=history&limit=10&offset=40'));
      const body = await res.json();

      // Assert
      expect(body.offset).toBe(40);
      expect(store.getRecentSubmissions).toHaveBeenCalledWith(11, 40);
    });

    it('clamps a negative offset to 0', async () => {
      // Arrange
      const store = makeStore();

      // Act
      const res = await GET(request('?type=history&limit=10&offset=-25'));
      const body = await res.json();

      // Assert
      expect(body.offset).toBe(0);
      expect(store.getRecentSubmissions).toHaveBeenCalledWith(11, 0);
    });

    it('falls back to offset 0 when the param is not a number', async () => {
      // Arrange
      const store = makeStore();

      // Act
      const res = await GET(request('?type=history&offset=later'));
      const body = await res.json();

      // Assert
      expect(body.offset).toBe(0);
      expect(store.getRecentSubmissions).toHaveBeenCalledWith(21, 0);
    });
  });

  describe('error handling', () => {
    it('returns 500 with an error message when the store throws', async () => {
      // Arrange
      makeStore({
        getRecentSubmissions: jest.fn().mockRejectedValue(new Error('db locked')),
      });

      // Act
      const res = await GET(request('?type=history'));
      const body = await res.json();

      // Assert
      expect(res.status).toBe(500);
      expect(body).toEqual({ error: 'Failed to fetch submissions' });
    });
  });
});

describe('GET /api/submissions — existing branches stay unchanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a bare array for the default recent branch', async () => {
    // Arrange
    const store = makeStore({
      getRecentSubmissions: jest.fn().mockResolvedValue(makeSubmissions(2)),
    });

    // Act
    const res = await GET(request(''));
    const body = await res.json();

    // Assert
    expect(Array.isArray(body)).toBe(true);
    expect(body).toEqual(makeSubmissions(2));
    expect(store.getRecentSubmissions).toHaveBeenCalledWith(10);
  });

  it('honours the plain limit param on the recent branch without an offset', async () => {
    // Arrange
    const store = makeStore();

    // Act
    await GET(request('?type=recent&limit=3'));

    // Assert
    expect(store.getRecentSubmissions).toHaveBeenCalledWith(3);
  });

  it('returns the raw summary object for type=summary', async () => {
    // Arrange
    const summary = { totalSubmissions: 7, mostFrequentItems: [] };
    const store = makeStore({ getSummary: jest.fn().mockResolvedValue(summary) });

    // Act
    const res = await GET(request('?type=summary'));
    const body = await res.json();

    // Assert
    expect(body).toEqual(summary);
    expect(store.getSummary).toHaveBeenCalled();
  });

  it('returns a bare array for type=channel-stats', async () => {
    // Arrange
    const stats = [{ channel: 'discord', count: 4, successRate: 100 }];
    makeStore({ getChannelStats: jest.fn().mockResolvedValue(stats) });

    // Act
    const res = await GET(request('?type=channel-stats'));
    const body = await res.json();

    // Assert
    expect(body).toEqual(stats);
  });

  it('returns a bare array for the channel filter branch', async () => {
    // Arrange
    const store = makeStore({
      getSubmissionsByChannel: jest.fn().mockResolvedValue(makeSubmissions(1)),
    });

    // Act
    const res = await GET(request('?channel=viber&limit=5'));
    const body = await res.json();

    // Assert
    expect(Array.isArray(body)).toBe(true);
    expect(store.getSubmissionsByChannel).toHaveBeenCalledWith('viber', 5);
  });
});
