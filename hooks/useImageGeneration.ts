/**
 * Custom hook for image generation functionality
 * Integrates with ImageGenerator service for canvas-based image generation
 */

import { useState, useCallback } from 'react';
import { ItemCounts } from '@/lib/types/laundry';
import { UseImageGenerationReturn } from '@/lib/types/components';
import { createImageGenerator, IImageGenerator } from '@/lib/services/ImageGenerator';

/**
 * Custom hook for image generation
 * @param categories - Categories data structure from list.tsx
 * @returns Object containing image generation functions and state
 */
export const useImageGeneration = (
  categories: Record<string, Array<{ name: string; x: number; y: number }>>
): UseImageGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create image generator instance
  const imageGenerator: IImageGenerator = createImageGenerator();

  /**
   * Generate image from item counts
   * @param counts - Item counts to render on image
   * @returns Promise resolving to image blob
   */
  const generateImage = useCallback(async (counts: ItemCounts): Promise<Blob> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Validate configuration
      const validation = imageGenerator.validateConfiguration();
      if (!validation.isValid) {
        throw new Error(`Invalid image generator configuration: ${validation.errors.join(', ')}`);
      }

      // Generate image using service
      const result = await imageGenerator.generateImage(counts, categories);

      if (!result.success || !result.image) {
        throw new Error(result.error || 'Failed to generate image');
      }

      return result.image;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during image generation';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [categories, imageGenerator]);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateImage,
    isGenerating,
    error,
    clearError
  };
};