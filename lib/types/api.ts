/**
 * API type definitions for the Silayan Laundry application
 * 
 * Defines request/response types for API endpoints
 */

/**
 * Discord API upload request
 */
export interface DiscordUploadRequest {
  /** File to upload */
  file: File;
  /** Optional message to include with upload */
  message?: string;
}

/**
 * Discord API upload response
 */
export interface DiscordUploadResponse {
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
 * Error response from API
 */
export interface ApiErrorResponse {
  /** Error message */
  error: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: string;
}

/**
 * Success response from API
 */
export interface ApiSuccessResponse<T = unknown> {
  /** Success status */
  success: true;
  /** Response data */
  data: T;
}

/**
 * Generic API response type
 */
export type ApiResponse<T = unknown> = 
  | ApiSuccessResponse<T>
  | ApiErrorResponse;

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Service version */
  version: string;
  /** Timestamp of check */
  timestamp: string;
  /** Additional health information */
  details?: Record<string, unknown>;
}

/**
 * Configuration response
 */
export interface ConfigResponse {
  /** Whether Discord integration is enabled */
  discordEnabled: boolean;
  /** Maximum file size for uploads (in bytes) */
  maxFileSize: number;
  /** Allowed file types for upload */
  allowedFileTypes: string[];
  /** Application version */
  version: string;
}