/**
 * Custom hook for recording submissions to the database
 * Calls /api/submissions to persist submission data
 */

import { useState, useCallback } from 'react';
import { UseSubmissionReturn, SubmissionChannel } from '@/lib/types/components';

/**
 * Custom hook for recording submissions
 * @returns Object containing submission recording functions and state
 */
export const useSubmission = (): UseSubmissionReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Record a submission to the database via API route
   * @param counts - Item counts to record
   * @param channel - Submission channel (download, discord, etc.)
   * @param channelSuccess - Whether the channel operation succeeded
   * @returns Promise resolving to submission ID or null on error
   */
  const recordSubmission = useCallback(async (
    counts: Record<string, number>,
    channel: SubmissionChannel,
    channelSuccess: boolean = true
  ): Promise<number | null> => {
    setIsRecording(true);
    setError(null);

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          counts,
          channel,
          channelSuccess,
        }),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || `Failed to record submission (${response.status})`);
      }

      const result = await response.json();
      return result.submissionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error recording submission';
      setError(errorMessage);
      // Don't throw - submission recording is non-critical
      console.error('Submission recording failed:', errorMessage);
      return null;
    } finally {
      setIsRecording(false);
    }
  }, []);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    recordSubmission,
    isRecording,
    error,
    clearError,
  };
};
