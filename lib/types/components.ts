/**
 * Component props interfaces for LaundryCounter application
 */

import { LaundryItem, ItemCounts } from './laundry';

/**
 * Props for ItemControls component
 * Renders individual item increment/decrement controls
 */
export interface ItemControlsProps {
  /** Name of the item */
  name: string;
  /** Current count value */
  value: number;
  /** Callback when increment button is clicked */
  onIncrement: () => void;
  /** Callback when decrement button is clicked */
  onDecrement: () => void;
  /** Callback when count value changes directly */
  onChange: (value: number) => void;
  /** Whether this is a custom item (affects styling/behavior) */
  isCustom?: boolean;
  /** Optional callback to remove custom item */
  onRemove?: () => void;
}

/**
 * Props for CategorySection component
 * Renders a group of items in a category
 */
export interface CategorySectionProps {
  /** Title of the category */
  title: string;
  /** Array of items in this category */
  items: LaundryItem[];
  /** Current counts for all items */
  counts: ItemCounts;
  /** Callback when item count is updated */
  onUpdateCount: (name: string, delta: number, isCustom?: boolean) => void;
  /** Callback when item count is set directly */
  onSetCount: (name: string, value: number, isCustom?: boolean) => void;
}

/**
 * Props for CustomItems component
 * Manages custom (user-added) items
 */
export interface CustomItemsProps {
  /** Current custom items and their counts */
  customItems: ItemCounts;
  /** Callback to add a new custom item */
  onAddItem: (name: string) => void;
  /** Callback when custom item count is updated */
  onUpdateCount: (name: string, delta: number) => void;
  /** Callback when custom item count is set directly */
  onSetCount: (name: string, value: number) => void;
  /** Callback to remove a custom item */
  onRemoveItem: (name: string) => void;
}

/**
 * Props for ActionButtons component
 * Renders action buttons (Reset, Download, Send to Discord)
 */
export interface ActionButtonsProps {
  /** Callback when reset button is clicked */
  onReset: () => void;
  /** Callback when download button is clicked */
  onDownload: () => void;
  /** Callback when send to Discord button is clicked */
  onSendToDiscord: () => void;
  /** Whether Discord upload is in progress */
  isSendingToDiscord: boolean;
  /** Optional loading state for image generation */
  isGeneratingImage?: boolean;
  /** Optional error message to display */
  error?: string;
}

/**
 * Props for LaundryCounter container component
 */
export interface LaundryCounterProps {
  /** Initial categories data */
  categories: Record<string, LaundryItem[]>;
}

/**
 * Return type for useLaundryItems hook
 */
export interface UseLaundryItemsReturn {
  /** Regular items and their counts */
  items: ItemCounts;
  /** Custom items and their counts */
  customItems: ItemCounts;
  /** Update item count by delta */
  updateCount: (name: string, delta: number, isCustom?: boolean) => void;
  /** Set item count directly */
  setCount: (name: string, value: number, isCustom?: boolean) => void;
  /** Reset all counts to zero */
  resetCounts: () => void;
  /** Add a new custom item */
  addCustomItem: (name: string) => void;
  /** Remove a custom item */
  removeCustomItem: (name: string) => void;
}

/**
 * Return type for useImageGeneration hook
 */
export interface UseImageGenerationReturn {
  /** Generate image from item counts */
  generateImage: (counts: ItemCounts) => Promise<Blob>;
  /** Whether image generation is in progress */
  isGenerating: boolean;
  /** Error from image generation, if any */
  error: string | null;
  /** Clear any error */
  clearError: () => void;
}

/**
 * Return type for useDiscordUpload hook
 */
export interface UseDiscordUploadReturn {
  /** Upload image to Discord */
  uploadImage: (image: Blob, filename: string, message?: string) => Promise<boolean>;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Error from upload, if any */
  error: string | null;
  /** Clear any error */
  clearError: () => void;
}