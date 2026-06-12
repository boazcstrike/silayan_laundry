/**
 * Custom hook for Discord upload functionality
 * Uses the existing /api/discord route for uploading images
 * Checks server configuration on mount to warn about missing webhook URL
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { UseDiscordUploadReturn } from '@/lib/types/components';

/**
 * Custom hook for Discord upload
 * @returns Object containing Discord upload functions and state
 */
export const useDiscordUpload = (): UseDiscordUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    fetch('/api/discord')
      .then((res) => res.json())
      .then((data: { configured: boolean; validUrl: boolean }) => {
        setIsConfigured(data.configured && data.validUrl);
      })
      .catch(() => {
        setIsConfigured(false);
      });
  }, []);

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
    isConfigured,
    error,
    clearError
  };
};
