/**
 * Application constants for the Silayan Laundry application
 * 
 * Follows coding standards: UPPER_SNAKE_CASE for constants
 * Centralizes hardcoded values for maintainability
 */

// Canvas rendering constants
export const CANVAS_CONFIG = {
  /** Default font size for text rendering */
  FONT_SIZE: 32,
  /** Default font family for text rendering */
  FONT_FAMILY: 'Arial',
  /** Default text color */
  TEXT_COLOR: 'black',
  /** Date position on template */
  DATE_X: 250,
  DATE_Y: 250,
  /** Signature position and scaling */
  SIGNATURE_X: 735,
  SIGNATURE_Y: 1098,
  SIGNATURE_SCALE: 0.55,
  /** Date position near signature */
  SIGNATURE_DATE_X: 850,
  SIGNATURE_DATE_Y: 1214,
} as const;

// File and path constants
export const FILE_PATHS = {
  /** Template image path */
  TEMPLATE_IMAGE: '/template.jpg',
  /** Default signature image path */
  SIGNATURE_IMAGE: '/signature_bo.png',
  /** Alternative signature image path */
  SIGNATURE_IMAGE_ALT: '/signature.png',
} as const;

// Image generation constants
export const IMAGE_GENERATION = {
  /** Image MIME type for generated images */
  MIME_TYPE: 'image/png' as const,
  /** Image quality (0-1) */
  QUALITY: 1,
  /** Default filename prefix */
  FILENAME_PREFIX: 'laundry-output-',
  /** Default filename extension */
  FILENAME_EXTENSION: '.png',
} as const;

// Discord API constants
export const DISCORD_CONFIG = {
  /** Maximum file size for Discord upload (8MB for free tier) */
  MAX_FILE_SIZE_BYTES: 8 * 1024 * 1024, // 8MB
  /** Default message for Discord upload */
  DEFAULT_MESSAGE: 'Laundry submission',
  /** Message template with timestamp */
  MESSAGE_TEMPLATE: 'Laundry submission ({timestamp})',
} as const;

// UI constants
export const UI_CONFIG = {
  /** Minimum height for item control rows */
  ITEM_ROW_MIN_HEIGHT: '48px',
  /** Gap between item controls */
  ITEM_CONTROL_GAP: '1',
  /** Input field width for counts */
  COUNT_INPUT_WIDTH: '9',
  /** Input field height */
  COUNT_INPUT_HEIGHT: '9',
} as const;

// Date and time constants
export const DATE_CONFIG = {
  /** Date format for display */
  DISPLAY_FORMAT: 'en-US',
  /** Date format for filenames */
  FILENAME_FORMAT: 'yyyyMMddHHmmss',
  /** Timestamp format for Discord messages */
  TIMESTAMP_FORMAT: 'en-US',
} as const;

// Validation constants
export const VALIDATION = {
  /** Minimum count value */
  MIN_COUNT: 0,
  /** Maximum count value (practical limit) */
  MAX_COUNT: 999,
  /** Maximum custom items allowed */
  MAX_CUSTOM_ITEMS: 20,
  /** Maximum length for custom item names */
  MAX_CUSTOM_ITEM_NAME_LENGTH: 50,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  /** Discord webhook not configured */
  DISCORD_WEBHOOK_NOT_SET: 'DISCORD_WEBHOOK_URL is not set',
  /** Missing file upload */
  MISSING_FILE_UPLOAD: "Missing 'file' upload",
  /** Invalid form data */
  INVALID_FORM_DATA: 'Expected multipart/form-data',
  /** Discord upload failed */
  DISCORD_UPLOAD_FAILED: 'Discord webhook request failed',
  /** Image generation failed */
  IMAGE_GENERATION_FAILED: 'Failed to generate PNG',
  /** Invalid count value */
  INVALID_COUNT: 'Count must be a non-negative integer',
  /** Custom item name too long */
  CUSTOM_ITEM_NAME_TOO_LONG: `Custom item name must be ${VALIDATION.MAX_CUSTOM_ITEM_NAME_LENGTH} characters or less`,
  /** Too many custom items */
  TOO_MANY_CUSTOM_ITEMS: `Maximum ${VALIDATION.MAX_CUSTOM_ITEMS} custom items allowed`,
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  /** Discord upload successful */
  DISCORD_UPLOAD_SUCCESS: 'Image successfully sent to Discord',
  /** Image download successful */
  IMAGE_DOWNLOAD_SUCCESS: 'Image downloaded successfully',
  /** Counts reset successful */
  COUNTS_RESET_SUCCESS: 'All counts have been reset',
  /** Custom item added */
  CUSTOM_ITEM_ADDED: 'Custom item added successfully',
} as const;

// Confirmation messages
export const CONFIRMATION_MESSAGES = {
  /** Reset counts confirmation */
  RESET_COUNTS: 'Are you sure you want to reset all counts? This action cannot be undone.',
} as const;

// Category names (must match keys in app/assets/data/list.tsx)
export const CATEGORY_NAMES = {
  REGULAR_LAUNDRY: 'Regular Laundry',
  HOME_ITEMS: 'Home Items',
  OTHER_ITEMS: 'Other Items',
} as const;

// Default values
export const DEFAULTS = {
  /** Default count for new items */
  INITIAL_COUNT: 0,
  /** Default delta for increment/decrement */
  COUNT_DELTA: 1,
  /** Default empty string */
  EMPTY_STRING: '',
} as const;