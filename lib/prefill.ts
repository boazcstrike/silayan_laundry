/**
 * Prefill parameter encoding/decoding for the counter page.
 *
 * The history page's forecast card links to `/?prefill=<token>` where the
 * token is a base64url-encoded JSON object of item counts. This module is
 * pure and framework-free so it can be unit-tested and shared between the
 * card (encode) and the counter hook (decode).
 */
import type { ItemCounts } from '@/lib/types/laundry';

/** Query-string parameter carrying encoded prefill counts. */
export const PREFILL_PARAM = 'prefill';

/** Hard ceiling on distinct item names accepted from a prefill token. */
const MAX_PREFILL_KEYS = 50;

/** Hard ceiling on the raw (encoded) token length in characters. */
const MAX_RAW_LENGTH = 2048;

/** UTF-8 string -> base64url (works in browsers and Node >= 16). */
const toBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** base64url -> UTF-8 string. Throws on malformed input. */
const fromBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/**
 * Encode item counts into a URL-safe prefill token.
 *
 * Entries with non-positive counts are dropped and values are rounded to
 * whole items (the load forecast emits 1-decimal floats).
 */
export const encodePrefillParam = (counts: ItemCounts): string => {
  const cleaned: ItemCounts = {};
  for (const [name, value] of Object.entries(counts)) {
    const rounded = Math.round(value);
    if (Number.isFinite(rounded) && rounded > 0) {
      cleaned[name] = rounded;
    }
  }
  return toBase64Url(JSON.stringify(cleaned));
};

/**
 * Decode a prefill token back into item counts.
 *
 * Strict: returns `null` (never throws) when the token is oversized,
 * malformed base64/JSON, not a plain object, has too many keys, or contains
 * empty names / non-numeric / negative values. Values are rounded and
 * zero-count entries are dropped.
 */
export const decodePrefillParam = (raw: string): ItemCounts | null => {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_RAW_LENGTH) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length > MAX_PREFILL_KEYS) return null;

  const counts: ItemCounts = {};
  for (const [name, value] of entries) {
    if (name.trim().length === 0) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return null;
    }
    const rounded = Math.round(value);
    if (rounded > 0) {
      counts[name] = rounded;
    }
  }
  return counts;
};

/**
 * Partition decoded counts into catalog items vs. custom items so the caller
 * can route them through `setCount` or `addCustomItem` respectively.
 */
export const splitPrefillCounts = (
  counts: ItemCounts,
  knownItemNames: Set<string>,
): { known: ItemCounts; custom: ItemCounts } => {
  const known: ItemCounts = {};
  const custom: ItemCounts = {};
  for (const [name, value] of Object.entries(counts)) {
    if (knownItemNames.has(name)) {
      known[name] = value;
    } else {
      custom[name] = value;
    }
  }
  return { known, custom };
};
