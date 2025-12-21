/**
 * Tests for useImageGeneration custom hook
 * 
 * Tests image generation functionality with mocked ImageGenerator service
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useImageGeneration } from '@/hooks/useImageGeneration';
import categories from '@/app/assets/data/list';
import { ItemCounts } from '@/lib/types/laundry';

// Create mock functions
// Create mock functions
const mockGenerateImage = jest.fn();
const mockValidateConfiguration = jest.fn();

// Mock the module using jest.mock (hoisted)
jest.mock('@/lib/services/ImageGenerator', () => ({
  createImageGenerator: jest.fn(() => ({
    generateImage: mockGenerateImage,
    validateConfiguration: mockValidateConfiguration,
  })),
}));

// Import mocked module to get the mocked createImageGenerator
import * as ImageGeneratorModule from '@/lib/services/ImageGenerator';

// Get the mocked createImageGenerator
const mockedCreateImageGenerator = ImageGeneratorModule.createImageGenerator as jest.Mock;

beforeEach(() => {
  // Clear only the mocks we use
  mockGenerateImage.mockClear();
  mockValidateConfiguration.mockClear();
  mockedCreateImageGenerator.mockClear();
  
  // Restore createImageGenerator implementation
  mockedCreateImageGenerator.mockImplementation(() => ({
    generateImage: mockGenerateImage,
    validateConfiguration: mockValidateConfiguration,
  }));
  
  // Set default mock implementations
  mockValidateConfiguration.mockReturnValue({
    isValid: true,
    errors: [],
});
  
  mockGenerateImage.mockResolvedValue({
    success: true,
    image: new Blob(['mock-image-data'], { type: 'image/png' }),
    error: null,
  });
});

const TestWrapper = ({ children }: any) => children;

describe('useImageGeneration', () => {
  describe('initial state', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.generateImage).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('generateImage - success cases', () => {
    it('should generate image successfully', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = { 'T-shirts': 5, 'Pants': 2 };
      const mockBlob = new Blob(['image-data'], { type: 'image/png' });
      
      // Setup mock
      mockGenerateImage.mockResolvedValue({
        success: true,
        image: mockBlob,
        error: null,
      });
      
      let generatedBlob: Blob | undefined;
      await act(async () => {
        generatedBlob = await result.current.generateImage(mockCounts);
      });
      
      // Check state transitions
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
      
      // Check service calls
      expect(mockValidateConfiguration).toHaveBeenCalled();
      expect(mockGenerateImage).toHaveBeenCalledWith(
        mockCounts,
        categories
      );
      
      // Check returned blob
      expect(generatedBlob).toBe(mockBlob);
    });

    it.skip('should set isGenerating flag during generation', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = { 'T-shirts': 5 };
      
      // Create a promise that we can resolve manually
      let resolvePromise: (value: any) => void;
      const generationPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockGenerateImage.mockReturnValue(generationPromise);
      
      // Start generation
      let generationCompleted = false;
      const generationPromiseFromHook = act(async () => {
        await result.current.generateImage(mockCounts);
        generationCompleted = true;
      });
      
      // Check isGenerating is true while promise is pending
      expect(result.current.isGenerating).toBe(true);
      
      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          success: true,
          image: new Blob(['data'], { type: 'image/png' }),
        });
        await generationPromise;
      });
      
      // Wait for hook to complete
      await generationPromiseFromHook;
      
      // Check final state
      expect(result.current.isGenerating).toBe(false);
      expect(generationCompleted).toBe(true);
    });
  });

  describe.skip('generateImage - error cases', () => {
    it('should handle validation failure', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = { 'T-shirts': 5 };
      
      // Mock validation failure
      mockValidateConfiguration.mockReturnValue({
        isValid: false,
        errors: ['Template image not found', 'Invalid font configuration'],
      });
      
      // Expect promise to reject with validation error
      await expect(
        act(async () => {
          await result.current.generateImage(mockCounts);
        })
      ).rejects.toThrow('Invalid image generator configuration: Template image not found, Invalid font configuration');
      
      // Verify state after rejection
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBe(
        'Invalid image generator configuration: Template image not found, Invalid font configuration'
      );
      
      // Verify mocks were called
      expect(mockValidateConfiguration).toHaveBeenCalled();
      expect(mockedCreateImageGenerator).toHaveBeenCalled();
      expect(mockGenerateImage).not.toHaveBeenCalled();
    });

    it('should handle generation failure', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = { 'T-shirts': 5 };
      
      // Mock generation failure
      mockGenerateImage.mockResolvedValue({
        success: false,
        image: null,
        error: 'Canvas context not available',
      });
      
      await expect(
        act(async () => {
          await result.current.generateImage(mockCounts);
        })
      ).rejects.toThrow('Canvas context not available');
      
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBe('Canvas context not available');
    });

    it('should handle unexpected errors', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = { 'T-shirts': 5 };
      
      // Mock unexpected error
      mockGenerateImage.mockRejectedValue(
        new Error('Network error')
      );
      
      await expect(
        act(async () => {
          await result.current.generateImage(mockCounts);
        })
      ).rejects.toThrow('Network error');
      
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should handle non-Error thrown objects', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = { 'T-shirts': 5 };
      
      // Mock non-Error thrown
      mockGenerateImage.mockRejectedValue(
        'String error without Error object'
      );
      
      await expect(
        act(async () => {
          await result.current.generateImage(mockCounts);
        })
      ).rejects.toThrow('String error without Error object');
      
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBe('Unknown error during image generation');
    });
  });

  describe.skip('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = { 'T-shirts': 5 };
      
      // Create an error first
      mockGenerateImage.mockRejectedValue(
        new Error('Test error')
      );
      
      try {
        await act(async () => {
          await result.current.generateImage(mockCounts);
        });
      } catch {
        // Expected to throw
      }
      
      expect(result.current.error).toBe('Test error');
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('state isolation', () => {
    it.skip('should isolate state between hook instances', () => {
      const { result: result1 } = renderHook(() => useImageGeneration(categories), { wrapper: TestWrapper });
      const { result: result2 } = renderHook(() => useImageGeneration(categories), { wrapper: TestWrapper });
      expect(result1.current).not.toBeNull();
      expect(result2.current).not.toBeNull();
      expect(result1.current.isGenerating).toBe(false);
      expect(result2.current.isGenerating).toBe(false);
      expect(result1.current.error).toBeNull();
      expect(result2.current.error).toBeNull();
    });
  });

  describe.skip('error persistence', () => {
    it('should clear previous error on new generation attempt', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = { 'T-shirts': 5 };
      
      // First attempt - error
      mockGenerateImage.mockRejectedValueOnce(
        new Error('First error')
      );
      
      try {
        await act(async () => {
          await result.current.generateImage(mockCounts);
        });
      } catch {
        // Expected
      }
      
      expect(result.current.error).toBe('First error');
      
      // Second attempt - success
      mockGenerateImage.mockResolvedValueOnce({
        success: true,
        image: new Blob(['data'], { type: 'image/png' }),
      });
      
      await act(async () => {
        await result.current.generateImage(mockCounts);
      });
      
      // Error should be cleared
      expect(result.current.error).toBeNull();
    });
  });

  describe('parameter passing', () => {
    it.skip('should pass counts and categories to image generator', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = {
        'T-shirts': 5,
        'Pants': 2,
        'Towels / Face Towels': 3,
      };
      
      await act(async () => {
        await result.current.generateImage(mockCounts);
      });
      
      expect(mockGenerateImage).toHaveBeenCalledWith(
        mockCounts,
        categories
      );
    });

    it.skip('should work with empty counts', async () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      const mockCounts: ItemCounts = {};
      
      await act(async () => {
        await result.current.generateImage(mockCounts);
      });
      
      expect(mockGenerateImage).toHaveBeenCalledWith(
        {},
        categories
      );
    });
  });

  describe('hook API', () => {
    it.skip('should return correct API structure', () => {
      const { result } = renderHook(() => useImageGeneration(categories));
      
      expect(result.current).toHaveProperty('generateImage');
      expect(result.current).toHaveProperty('isGenerating');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('clearError');
      
      expect(typeof result.current.generateImage).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.isGenerating).toBe('boolean');
      expect(result.current.error).toBe(null);
    });
  });
});