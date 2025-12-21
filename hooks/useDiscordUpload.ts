/**
 * Custom hook for Discord upload functionality
 * Uses the existing /api/discord route for uploading images
 */

import { useState, useCallback } from 'react';
import { UseDiscordUploadReturn } from '@/lib/types/components';

/**
 * Custom hook for Discord upload
 * @returns Object containing Discord upload functions and state
 */
export const useDiscordUpload = (): UseDiscordUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload image to Discord via API route
   * @param image - Image blob to upload
   * @param filename - Suggested filename
   * @param message - Optional message to include
   * @returns Promise resolving to boolean success status
   */
  const uploadImage = useCallback(async (
    image: Blob,
    filename: string,
    message?: string
  ): Promise<boolean> => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      const file = new File([image], filename, {
        type: image.type || 'image/png',
      });

      formData.append('file', file);
      formData.append(
        'message',
        message || `Laundry submission (${new Date().toLocaleString('en-US')})`
      );

      const response = await fetch('/api/discord', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw new Error(`Discord upload failed (${response.status}). ${details}`);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during Discord upload';
      setError(errorMessage);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    uploadImage,
    isUploading,
    error,
    clearError
  };
};