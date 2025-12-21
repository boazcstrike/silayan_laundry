/**
 * Core type definitions for the Silayan Laundry application
 * 
 * Follows SOLID principles and clean code practices:
 * - Single responsibility per interface
 * - Clear, explicit types
 * - Immutable data structures where possible
 */

/**
 * Represents a single laundry item with its position on the template
 */
export interface LaundryItem {
  /** Display name of the item */
  name: string;
  /** X-coordinate on the template image */
  x: number;
  /** Y-coordinate on the template image */
  y: number;
  /** Optional grouping for layout purposes */
  group?: string;
}

/**
 * Collection of laundry items organized by category
 * Key: category name (e.g., "Regular Laundry")
 * Value: array of items in that category
 */
export type LaundryCategory = Record<string, LaundryItem[]>;

/**
 * Counts for laundry items
 * Key: item name
 * Value: quantity count
 */
export type ItemCounts = Record<string, number>;

/**
 * Configuration options for image generation
 */
export interface ImageGenerationOptions {
  /** Path to the template image */
  templatePath: string;
  /** Path to the signature image */
  signaturePath: string;
  /** Font size for text rendering (default: 32) */
  fontSize?: number;
  /** Font family for text rendering (default: 'Arial') */
  fontFamily?: string;
  /** Text color for rendering (default: 'black') */
  textColor?: string;
}

/**
 * Result of an image generation operation
 */
export interface ImageGenerationResult {
  /** Success status */
  success: boolean;
  /** Generated image blob if successful */
  image?: Blob;
  /** Error message if failed */
  error?: string;
  /** Filename suggestion for the generated image */
  filename?: string;
}

/**
 * Result of a Discord upload operation
 */
export interface DiscordUploadResult {
  /** Success status */
  success: boolean;
  /** Discord message ID if successful */
  messageId?: string;
  /** Error message if failed */
  error?: string;
  /** HTTP status code from Discord API */
  statusCode?: number;
}

/**
 * Custom item added by the user
 */
export interface CustomItem {
  /** User-provided name */
  name: string;
  /** Current count */
  count: number;
  /** Timestamp when item was added */
  addedAt: Date;
}

/**
 * Application state for laundry counting
 */
export interface LaundryAppState {
  /** Counts for predefined items */
  predefinedItems: ItemCounts;
  /** Custom items added by user */
  customItems: CustomItem[];
  /** Last generated image blob */
  lastGeneratedImage?: Blob;
  /** Last Discord upload result */
  lastUploadResult?: DiscordUploadResult;
  /** Whether app is currently generating an image */
  isGeneratingImage: boolean;
  /** Whether app is currently uploading to Discord */
  isUploadingToDiscord: boolean;
}

/**
 * Validation result for laundry item counts
 */
export interface ValidationResult {
  /** Whether the count is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Suggested fix if applicable */
  suggestion?: string;
}

/**
 * Function type for updating item counts
 */
export type UpdateCountFunction = (
  itemName: string, 
  delta: number, 
  isCustom?: boolean
) => void;

/**
 * Function type for setting item counts directly
 */
export type SetCountFunction = (
  itemName: string, 
  count: number, 
  isCustom?: boolean
) => void;