/**
 * Tests for lib/prefill.ts
 *
 * Covers the pure encode/decode/split functions used to carry forecast
 * counts from the history page into the counter via `/?prefill=<token>`.
 */

import {
  PREFILL_PARAM,
  encodePrefillParam,
  decodePrefillParam,
  splitPrefillCounts,
} from '@/lib/prefill';
import type { ItemCounts } from '@/lib/types/laundry';

/**
 * Mirrors the module's private base64url encoder so malformed-but-valid
 * base64 payloads can be constructed directly, without going through
 * encodePrefillParam (which always produces well-formed output).
 */
const toBase64Url = (value: string): string =>
  Buffer.from(value, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

describe('PREFILL_PARAM', () => {
  test('is the "prefill" query key', () => {
    // Assert
    expect(PREFILL_PARAM).toBe('prefill');
  });
});

describe('encodePrefillParam / decodePrefillParam roundtrip', () => {
  test('roundtrips simple positive integer counts', () => {
    // Arrange
    const counts: ItemCounts = { 'T-shirts': 3, Towels: 5 };

    // Act
    const token = encodePrefillParam(counts);
    const decoded = decodePrefillParam(token);

    // Assert
    expect(decoded).toEqual(counts);
  });

  test('rounds fractional counts to whole numbers on encode', () => {
    // Arrange
    const counts: ItemCounts = { Shirt: 2.4, Pants: 2.6 };

    // Act
    const decoded = decodePrefillParam(encodePrefillParam(counts));

    // Assert
    expect(decoded).toEqual({ Shirt: 2, Pants: 3 });
  });

  test('drops entries with zero or negative counts', () => {
    // Arrange
    const counts: ItemCounts = { Shirt: 0, Pants: -3, Socks: 5 };

    // Act
    const decoded = decodePrefillParam(encodePrefillParam(counts));

    // Assert
    expect(decoded).toEqual({ Socks: 5 });
  });

  test('roundtrips unicode item names correctly', () => {
    // Arrange
    const counts: ItemCounts = { 'Blanket accent mark test cafe latte umlaut over e': 3, 'Towel emoji test': 2 };

    // Act
    const decoded = decodePrefillParam(encodePrefillParam(counts));

    // Assert
    expect(decoded).toEqual(counts);
  });

  test('roundtrips non-ASCII unicode characters in names', () => {
    // Arrange
    const counts: ItemCounts = { 'éèê café': 4, '毛巾': 1 };

    // Act
    const decoded = decodePrefillParam(encodePrefillParam(counts));

    // Assert
    expect(decoded).toEqual(counts);
  });

  test('produces a URL-safe token with no plus, slash or equals characters', () => {
    // Arrange
    const counts: ItemCounts = { 'A/B+C=D': 5, 'Padding case': 7 };

    // Act
    const token = encodePrefillParam(counts);

    // Assert
    expect(token).not.toMatch(/[+/=]/);
  });

  test('encodes an empty object when all counts are dropped', () => {
    // Arrange
    const counts: ItemCounts = { Shirt: 0, Pants: -1 };

    // Act
    const decoded = decodePrefillParam(encodePrefillParam(counts));

    // Assert
    expect(decoded).toEqual({});
  });
});

describe('decodePrefillParam malformed input handling', () => {
  test('returns null for an empty string', () => {
    // Act / Assert
    expect(decodePrefillParam('')).toBeNull();
  });

  test('returns null when the raw token exceeds 2KB', () => {
    // Arrange
    const oversized = 'a'.repeat(2049);

    // Act / Assert
    expect(decodePrefillParam(oversized)).toBeNull();
  });

  test('returns null for invalid base64', () => {
    // Arrange
    const invalid = '!!!not-valid-base64!!!';

    // Act / Assert
    expect(decodePrefillParam(invalid)).toBeNull();
  });

  test('returns null when decoded base64 is not valid JSON', () => {
    // Arrange
    const token = toBase64Url('this is not json');

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('returns null when the JSON payload is an array', () => {
    // Arrange
    const token = toBase64Url(JSON.stringify([1, 2, 3]));

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('returns null when the JSON payload is a string primitive', () => {
    // Arrange
    const token = toBase64Url(JSON.stringify('hello'));

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('returns null when the JSON payload is a number primitive', () => {
    // Arrange
    const token = toBase64Url(JSON.stringify(42));

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('returns null when the JSON payload is null', () => {
    // Arrange
    const token = toBase64Url(JSON.stringify(null));

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('returns null when the payload has more than 50 keys', () => {
    // Arrange
    const tooMany: ItemCounts = {};
    for (let i = 0; i < 51; i += 1) {
      tooMany[`Item ${i}`] = 1;
    }
    const token = toBase64Url(JSON.stringify(tooMany));

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('accepts a payload with exactly 50 keys', () => {
    // Arrange
    const exactlyFifty: ItemCounts = {};
    for (let i = 0; i < 50; i += 1) {
      exactlyFifty[`Item ${i}`] = 1;
    }
    const token = toBase64Url(JSON.stringify(exactlyFifty));

    // Act
    const decoded = decodePrefillParam(token);

    // Assert
    expect(decoded).toEqual(exactlyFifty);
  });

  test('returns null when a key is an empty name', () => {
    // Arrange
    const token = toBase64Url(JSON.stringify({ '': 5 }));

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('returns null when a key is whitespace-only', () => {
    // Arrange
    const token = toBase64Url(JSON.stringify({ '   ': 5 }));

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('returns null when a value is non-numeric', () => {
    // Arrange
    const token = toBase64Url(JSON.stringify({ Shirt: '5' }));

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('returns null when a value is negative', () => {
    // Arrange
    const token = toBase64Url(JSON.stringify({ Shirt: -1 }));

    // Act / Assert
    expect(decodePrefillParam(token)).toBeNull();
  });

  test('never throws on garbage input', () => {
    // Act / Assert
    expect(() => decodePrefillParam('%%%%')).not.toThrow();
    expect(decodePrefillParam('%%%%')).toBeNull();
  });
});

describe('splitPrefillCounts', () => {
  test('routes catalog items to known and the rest to custom', () => {
    // Arrange
    const counts: ItemCounts = { 'T-shirts': 3, 'Weird Item': 2 };
    const knownItemNames = new Set(['T-shirts', 'Towels']);

    // Act
    const { known, custom } = splitPrefillCounts(counts, knownItemNames);

    // Assert
    expect(known).toEqual({ 'T-shirts': 3 });
    expect(custom).toEqual({ 'Weird Item': 2 });
  });

  test('returns empty known/custom objects for empty counts', () => {
    // Arrange
    const counts: ItemCounts = {};
    const knownItemNames = new Set(['T-shirts']);

    // Act
    const { known, custom } = splitPrefillCounts(counts, knownItemNames);

    // Assert
    expect(known).toEqual({});
    expect(custom).toEqual({});
  });

  test('treats all items as custom when the known set is empty', () => {
    // Arrange
    const counts: ItemCounts = { 'T-shirts': 1, Towels: 2 };
    const knownItemNames = new Set<string>();

    // Act
    const { known, custom } = splitPrefillCounts(counts, knownItemNames);

    // Assert
    expect(known).toEqual({});
    expect(custom).toEqual(counts);
  });
});
