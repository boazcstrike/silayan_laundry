/**
 * Custom hook for managing laundry item counts
 * Extracts state management logic from app/page.tsx
 * 
 * Persists counts to localStorage so data survives page reloads.
 * Only explicit reset clears the persisted data.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { ItemCounts } from '@/lib/types/laundry';
import { UseLaundryItemsReturn } from '@/lib/types/components';

const STORAGE_KEY_ITEMS = 'silayan_laundry_items';
const STORAGE_KEY_CUSTOM = 'silayan_laundry_custom_items';

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
  }
  return fallback;
};

const saveToStorage = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore
  }
};

/**
 * Initialize items state from categories data
 * Creates an object with all item names initialized to 0
 */
const initializeItems = (categories: Record<string, Array<{ name: string }>>): ItemCounts => {
  const all: ItemCounts = {};
  Object.values(categories).forEach((items) => {
    items.forEach(({ name }) => {
      all[name] = 0;
    });
  });
  return all;
};

/**
 * Custom hook for managing laundry item counts
 * @param categories - Categories data structure from list.tsx
 * @returns Object containing items state and manipulation functions
 */
export const useLaundryItems = (
  categories: Record<string, Array<{ name: string }>>
): UseLaundryItemsReturn => {
  // Restore from localStorage on initial mount
  const [items, setItems] = useState<ItemCounts>(() =>
    loadFromStorage(STORAGE_KEY_ITEMS, initializeItems(categories))
  );

  const [customItems, setCustomItems] = useState<ItemCounts>(() =>
    loadFromStorage(STORAGE_KEY_CUSTOM, {})
  );

  // Track whether initial hydration from localStorage has finished
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = true;
  }, []);

  // Persist items to localStorage on every change (skip the initial state set)
  useEffect(() => {
    if (hydrated.current) {
      saveToStorage(STORAGE_KEY_ITEMS, items);
    }
  }, [items]);

  useEffect(() => {
    if (hydrated.current) {
      saveToStorage(STORAGE_KEY_CUSTOM, customItems);
    }
  }, [customItems]);

  /**
   * Update item count by delta (increment/decrement)
   * @param name - Item name
   * @param delta - Change amount (positive or negative)
   * @param isCustom - Whether this is a custom item
   */
  const updateCount = useCallback((
    name: string,
    delta: number,
    isCustom: boolean = false
  ) => {
    const setFn = isCustom ? setCustomItems : setItems;
    
    setFn(prev => ({
      ...prev,
      [name]: Math.max(0, (prev[name] || 0) + delta)
    }));
  }, []);

  /**
   * Set item count directly to a specific value
   * @param name - Item name
   * @param value - New count value
   * @param isCustom - Whether this is a custom item
   */
  const setCount = useCallback((
    name: string,
    value: number,
    isCustom: boolean = false
  ) => {
    const setFn = isCustom ? setCustomItems : setItems;
    
    // Validate and sanitize input
    const sanitizedValue = Number.isFinite(value) 
      ? Math.max(0, Math.trunc(value))
      : 0;
    
    setFn(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  }, []);

  /**
   * Reset all counts to zero and clear localStorage
   * Regular items are reset to 0, custom items are cleared
   */
  const resetCounts = useCallback(() => {
    if (window.confirm("Are you sure you want to reset all counts? This action cannot be undone.")) {
      const empty = initializeItems(categories);
      setItems(empty);
      setCustomItems({});
      saveToStorage(STORAGE_KEY_ITEMS, empty);
      saveToStorage(STORAGE_KEY_CUSTOM, {});
    }
  }, [categories]);

  /**
   * Add a new custom item
   * @param name - Name of the custom item to add
   */
  const addCustomItem = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    
    setCustomItems(prev => ({
      ...prev,
      [trimmedName]: 0
    }));
  }, []);

  /**
   * Remove a custom item
   * @param name - Name of the custom item to remove
   */
  const removeCustomItem = useCallback((name: string) => {
    setCustomItems(prev => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  return {
    items,
    customItems,
    updateCount,
    setCount,
    resetCounts,
    addCustomItem,
    removeCustomItem
  };
};
