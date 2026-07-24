/**
 * One-shot hook that applies forecast prefill counts from the URL.
 *
 * The history page links to `/?prefill=<token>` (see lib/prefill.ts). On
 * mount this hook decodes the token, asks for confirmation when counts are
 * already present, applies the counts through the caller's setters, and
 * strips the parameter from the URL so refreshes don't re-apply it.
 */

import { useEffect, useRef } from 'react';
import { PREFILL_PARAM, decodePrefillParam, splitPrefillCounts } from '@/lib/prefill';

const CONFIRM_MESSAGE = 'Replace your current counts with the forecast?';

export interface UsePrefillCountsParams {
  /** Catalog item names; anything else becomes a custom item. */
  knownItemNames: Set<string>;
  /** Setter from useLaundryItems (functional update, safe post-hydration). */
  setCount: (name: string, value: number, isCustom?: boolean) => void;
  /** Adds a custom item (initialized to 0) from useLaundryItems. */
  addCustomItem: (name: string) => void;
  /** Returns the current total item count (must read live state, e.g. a ref). */
  getCurrentTotal: () => number;
}

/**
 * Apply URL prefill counts once on mount.
 *
 * Runs inside a `setTimeout(0)` so it executes after useLaundryItems'
 * localStorage hydration effect (hooks/useLaundryItems.ts:71-78) has
 * committed — both the confirm check and the applied counts then see the
 * restored state instead of the pre-hydration zeros.
 */
export const usePrefillCounts = (params: UsePrefillCountsParams): void => {
  const paramsRef = useRef(params);
  const appliedRef = useRef(false);

  // Keep the latest callbacks/values readable from the one-shot timeout
  // without re-running it (mount effect stays dependency-free).
  useEffect(() => {
    paramsRef.current = params;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const timer = setTimeout(() => {
      if (appliedRef.current) return;
      appliedRef.current = true;

      const raw = new URLSearchParams(window.location.search).get(PREFILL_PARAM);
      if (!raw) return;

      // One-shot: always strip the parameter, even when we bail out.
      const stripParam = () =>
        window.history.replaceState(null, '', window.location.pathname);

      const counts = decodePrefillParam(raw);
      if (!counts) {
        stripParam();
        return;
      }

      const { knownItemNames, setCount, addCustomItem, getCurrentTotal } =
        paramsRef.current;
      const { known, custom } = splitPrefillCounts(counts, knownItemNames);

      if (Object.keys(known).length === 0 && Object.keys(custom).length === 0) {
        stripParam();
        return;
      }

      if (getCurrentTotal() > 0 && !window.confirm(CONFIRM_MESSAGE)) {
        stripParam();
        return;
      }

      for (const [name, value] of Object.entries(known)) {
        setCount(name, value);
      }
      for (const [name, value] of Object.entries(custom)) {
        // addCustomItem registers the key at 0; setCount then assigns it.
        addCustomItem(name);
        setCount(name, value, true);
      }
      stripParam();
    }, 0);

    return () => clearTimeout(timer);
    // Mount-only by design; live values are read through paramsRef.
  }, []);
};
