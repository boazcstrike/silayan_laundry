"use client";

/**
 * LaundryCounter component
 * Main container component for the laundry counter application
 * Replaces the monolithic app/page.tsx with modular architecture
 */

import React, { useCallback, useState } from 'react';
import CategorySection from './CategorySection';
import CustomItems from './CustomItems';
import ActionButtons from './ActionButtons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLaundryItems, useImageGeneration, useDiscordUpload, useSubmission } from '@/hooks';
import { LaundryCounterProps } from '@/lib/types/components';

/**
 * Main laundry counter component
 * Orchestrates all subcomponents and manages application state
 */
const LaundryCounter: React.FC<LaundryCounterProps> = ({ categories }) => {
  // Initialize hooks
  const {
    items,
    customItems,
    updateCount,
    setCount,
    resetCounts,
    addCustomItem,
    removeCustomItem,
  } = useLaundryItems(categories);

  const {
    generateImage,
    isGenerating: isGeneratingImage,
    error: imageGenerationError,
    clearError: clearImageGenerationError,
  } = useImageGeneration(categories);

  const {
    uploadImage,
    isUploading: isSendingToDiscord,
    error: discordUploadError,
    clearError: clearDiscordUploadError,
  } = useDiscordUpload();

  const {
    recordSubmission,
    clearError: clearSubmissionError,
  } = useSubmission();

  // Combined error state
  const [error, setError] = useState<string | null>(null);

  /**
   * Get all counts (items + customItems) for submission
   */
  const getAllCounts = useCallback(() => {
    return { ...items, ...customItems };
  }, [items, customItems]);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setError(null);
    clearImageGenerationError();
    clearDiscordUploadError();
    clearSubmissionError();
  }, [clearImageGenerationError, clearDiscordUploadError, clearSubmissionError]);

  /**
   * Handle image download
   */
  const handleDownload = useCallback(async () => {
    try {
      clearAllErrors();
      const imageBlob = await generateImage(items);
      
      // Create download link
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
      const link = document.createElement('a');
      link.download = `laundry-output-${timestamp}.png`;
      link.href = URL.createObjectURL(imageBlob);
      link.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
      
      // Record submission (non-blocking, fire and forget)
      recordSubmission(getAllCounts(), 'download', true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate image';
      setError(errorMessage);
    }
  }, [generateImage, items, clearAllErrors, recordSubmission, getAllCounts]);

  /**
   * Handle Discord upload
   */
  const handleSendToDiscord = useCallback(async () => {
    let success = false;
    try {
      clearAllErrors();
      const imageBlob = await generateImage(items);
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
      const filename = `laundry-output-${timestamp}.png`;
      
      success = await uploadImage(
        imageBlob,
        filename,
        `Laundry submission (${new Date().toLocaleString('en-US')})`
      );
      
      if (!success) {
        throw new Error('Discord upload failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload to Discord';
      setError(errorMessage);
    } finally {
      // Record submission regardless of success (track failures too)
      recordSubmission(getAllCounts(), 'discord', success);
    }
  }, [generateImage, items, uploadImage, clearAllErrors, recordSubmission, getAllCounts]);

  // Combine errors from different sources (submission errors are non-critical, don't show to user)
  const combinedError = error || imageGenerationError || discordUploadError;

  return (
    <div className="p-6 max-w-6xl mx-auto relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <h1 className="text-xl font-bold mb-4 text-center">Laundry Item Counter</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-6">
        {Object.entries(categories).map(([group, categoryItems]) => (
          <CategorySection
            key={group}
            title={group}
            items={categoryItems}
            counts={items}
            onUpdateCount={updateCount}
            onSetCount={setCount}
          />
        ))}
      </div>

      <CustomItems
        customItems={customItems}
        onAddItem={addCustomItem}
        onUpdateCount={(name, delta) => updateCount(name, delta, true)}
        onSetCount={(name, value) => setCount(name, value, true)}
        onRemoveItem={removeCustomItem}
      />

      <ActionButtons
        onReset={resetCounts}
        onDownload={handleDownload}
        onSendToDiscord={handleSendToDiscord}
        isSendingToDiscord={isSendingToDiscord}
        isGeneratingImage={isGeneratingImage}
        error={combinedError || undefined}
      />
    </div>
  );
};

export default LaundryCounter;