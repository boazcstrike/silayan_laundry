/**
 * Tests for useLaundryItems custom hook
 * 
 * Tests state management for laundry item counts, including:
 * - Initialization from categories
 * - Increment/decrement operations
 * - Custom item management
 * - Reset functionality
 */

import { renderHook, act } from '@testing-library/react';
import { useLaundryItems } from '@/hooks/useLaundryItems';
import categories from '@/app/assets/data/list';

// Mock window.confirm for resetCounts tests
const mockConfirm = jest.fn();
beforeAll(() => {
  window.confirm = mockConfirm;
});

beforeEach(() => {
  mockConfirm.mockReset();
});

describe('useLaundryItems', () => {
  describe('initialization', () => {
    it('should initialize items from categories with zero counts', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      
      // Check that all items from categories are initialized to 0
      Object.values(categories).forEach((items) => {
        items.forEach(({ name }) => {
          expect(result.current.items[name]).toBe(0);
        });
      });
    });

    it('should initialize with empty custom items', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      expect(result.current.customItems).toEqual({});
    });

    it('should handle empty categories', () => {
      const emptyCategories = {};
      const { result } = renderHook(() => useLaundryItems(emptyCategories));
      expect(result.current.items).toEqual({});
      expect(result.current.customItems).toEqual({});
    });
  });

  describe('updateCount', () => {
    it('should increment regular item count', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      act(() => {
        result.current.updateCount(itemName, 1);
      });
      
      expect(result.current.items[itemName]).toBe(1);
    });

    it('should decrement regular item count', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      // First increment
      act(() => {
        result.current.updateCount(itemName, 2);
      });
      
      // Then decrement
      act(() => {
        result.current.updateCount(itemName, -1);
      });
      
      expect(result.current.items[itemName]).toBe(1);
    });

    it('should not go below zero', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      // Start at 0, try to decrement
      act(() => {
        result.current.updateCount(itemName, -1);
      });
      
      expect(result.current.items[itemName]).toBe(0);
    });

    it('should handle custom items', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const customItemName = 'Custom Item';
      
      // Add custom item
      act(() => {
        result.current.addCustomItem(customItemName);
      });
      
      // Increment custom item
      act(() => {
        result.current.updateCount(customItemName, 1, true);
      });
      
      expect(result.current.customItems[customItemName]).toBe(1);
    });

    it('should handle negative delta for custom items', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const customItemName = 'Custom Item';
      
      // Add and set to 3
      act(() => {
        result.current.addCustomItem(customItemName);
        result.current.setCount(customItemName, 3, true);
      });
      
      // Decrement by 2
      act(() => {
        result.current.updateCount(customItemName, -2, true);
      });
      
      expect(result.current.customItems[customItemName]).toBe(1);
    });
  });

  describe('setCount', () => {
    it('should set regular item count to specific value', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      act(() => {
        result.current.setCount(itemName, 5);
      });
      
      expect(result.current.items[itemName]).toBe(5);
    });

    it('should sanitize invalid values to zero', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      act(() => {
        result.current.setCount(itemName, NaN);
      });
      
      expect(result.current.items[itemName]).toBe(0);
    });

    it('should truncate decimal values', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      act(() => {
        result.current.setCount(itemName, 5.7);
      });
      
      expect(result.current.items[itemName]).toBe(5);
    });

    it('should not accept negative values', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      act(() => {
        result.current.setCount(itemName, -5);
      });
      
      expect(result.current.items[itemName]).toBe(0);
    });

    it('should handle custom items', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const customItemName = 'Custom Item';
      
      // Add custom item
      act(() => {
        result.current.addCustomItem(customItemName);
      });
      
      // Set custom item count
      act(() => {
        result.current.setCount(customItemName, 10, true);
      });
      
      expect(result.current.customItems[customItemName]).toBe(10);
    });
  });

  describe('resetCounts', () => {
    it('should reset all counts when confirmed', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      // Set up some counts
      act(() => {
        result.current.setCount(itemName, 5);
        result.current.addCustomItem('Custom Item');
        result.current.setCount('Custom Item', 3, true);
      });
      
      // Mock confirm to return true
      mockConfirm.mockReturnValue(true);
      
      act(() => {
        result.current.resetCounts();
      });
      
      // Regular items should be reset to 0
      expect(result.current.items[itemName]).toBe(0);
      // Custom items should be cleared
      expect(result.current.customItems).toEqual({});
    });

    it('should not reset when confirmation is cancelled', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      // Set up some counts
      act(() => {
        result.current.setCount(itemName, 5);
      });
      
      // Mock confirm to return false (cancelled)
      mockConfirm.mockReturnValue(false);
      
      act(() => {
        result.current.resetCounts();
      });
      
      // Counts should remain unchanged
      expect(result.current.items[itemName]).toBe(5);
    });

    it('should show correct confirmation message', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      
      act(() => {
        result.current.resetCounts();
      });
      
      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to reset all counts? This action cannot be undone.'
      );
    });
  });

  describe('custom item management', () => {
    it('should add custom item with trimmed name', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      
      act(() => {
        result.current.addCustomItem('  Custom Item  ');
      });
      
      expect(result.current.customItems['Custom Item']).toBe(0);
    });

    it('should not add empty custom item', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      
      act(() => {
        result.current.addCustomItem('   ');
      });
      
      expect(result.current.customItems).toEqual({});
    });

    it('should remove custom item', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const customItemName = 'Custom Item';
      
      // Add custom item
      act(() => {
        result.current.addCustomItem(customItemName);
        result.current.setCount(customItemName, 3, true);
      });
      
      // Remove custom item
      act(() => {
        result.current.removeCustomItem(customItemName);
      });
      
      expect(result.current.customItems[customItemName]).toBeUndefined();
    });

    it('should handle removing non-existent custom item', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      
      // This should not throw an error
      expect(() => {
        act(() => {
          result.current.removeCustomItem('Non-existent');
        });
      }).not.toThrow();
    });

    it('should maintain other custom items when removing one', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      
      // Add multiple custom items
      act(() => {
        result.current.addCustomItem('Item 1');
        result.current.addCustomItem('Item 2');
        result.current.addCustomItem('Item 3');
      });
      
      // Remove one
      act(() => {
        result.current.removeCustomItem('Item 2');
      });
      
      expect(result.current.customItems['Item 1']).toBe(0);
      expect(result.current.customItems['Item 2']).toBeUndefined();
      expect(result.current.customItems['Item 3']).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple rapid updates', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      act(() => {
        // Multiple updates in sequence
        result.current.updateCount(itemName, 1);
        result.current.updateCount(itemName, 1);
        result.current.updateCount(itemName, 1);
        result.current.updateCount(itemName, -1);
      });
      
      expect(result.current.items[itemName]).toBe(2);
    });

    it('should handle setting count to zero', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      // Set to non-zero first
      act(() => {
        result.current.setCount(itemName, 5);
      });
      
      // Then set to zero
      act(() => {
        result.current.setCount(itemName, 0);
      });
      
      expect(result.current.items[itemName]).toBe(0);
    });

    it('should handle very large counts', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      const itemName = 'T-shirts';
      
      act(() => {
        result.current.setCount(itemName, 999);
      });
      
      expect(result.current.items[itemName]).toBe(999);
    });
  });

  describe('return value structure', () => {
    it('should return all required functions and state', () => {
      const { result } = renderHook(() => useLaundryItems(categories));
      
      expect(result.current).toHaveProperty('items');
      expect(result.current).toHaveProperty('customItems');
      expect(result.current).toHaveProperty('updateCount');
      expect(result.current).toHaveProperty('setCount');
      expect(result.current).toHaveProperty('resetCounts');
      expect(result.current).toHaveProperty('addCustomItem');
      expect(result.current).toHaveProperty('removeCustomItem');
      
      // Check types
      expect(typeof result.current.updateCount).toBe('function');
      expect(typeof result.current.setCount).toBe('function');
      expect(typeof result.current.resetCounts).toBe('function');
      expect(typeof result.current.addCustomItem).toBe('function');
      expect(typeof result.current.removeCustomItem).toBe('function');
    });
  });
});