/**
 * Discord service for uploading images to Discord webhooks
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Only handles Discord API communication
 * - Dependency Inversion: Depends on abstractions (interfaces)
 * - Interface Segregation: Small, focused interface
 */

import { DiscordUploadResult } from '@/lib/types/laundry';
import { 
  DISCORD_CONFIG, 
  ERROR_MESSAGES
} from '@/lib/constants';

/**
 * Interface for Discord service
 * Allows for different implementations (e.g., mock for testing)
 */
export interface IDiscordService {
  /**
   * Upload image to Discord via webhook
   * @param image Image blob to upload
   * @param filename Suggested filename
   * @param message Optional message to include
   * @returns Promise resolving to upload result
   */
  uploadImage(
    image: Blob, 
    filename: string, 
    message?: string
  ): Promise<DiscordUploadResult>;
  
  /**
   * Validate if Discord service is properly configured
   * @returns Validation result
   */
  validateConfiguration(): { isValid: boolean; errors: string[] };
}

/**
 * Configuration for Discord service
 */
export interface DiscordServiceConfig {
  /** Discord webhook URL */
  webhookUrl: string;
  /** Maximum retry attempts for failed uploads */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Timeout for requests in milliseconds */
  timeout?: number;
}

/**
 * HTTP-based Discord service implementation
 * Uses fetch API to communicate with Discord webhook
 */
export class HttpDiscordService implements IDiscordService {
  private config: DiscordServiceConfig;

  constructor(config: DiscordServiceConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Upload image to Discord
   */
  async uploadImage(
    image: Blob, 
    filename: string, 
    message?: string
  ): Promise<DiscordUploadResult> {
    // Validate configuration
    const validation = this.validateConfiguration();
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    // Validate file size
    const fileSizeValidation = this.validateFileSize(image);
    if (!fileSizeValidation.isValid) {
      return {
        success: false,
        error: fileSizeValidation.error!,
      };
    }

    // Attempt upload with retries
    for (let attempt = 0; attempt <= (this.config.maxRetries || 3); attempt++) {
      try {
        const result = await this.attemptUpload(image, filename, message);
        
        if (result.success) {
          return result;
        }
        
        // If last attempt, return error
        if (attempt === (this.config.maxRetries || 3)) {
          return result;
        }
        
        // Wait before retry
        await this.delay(this.config.retryDelay || 1000);
       } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
        // If last attempt, return generic error message
        if (attempt === (this.config.maxRetries || 3)) {
          return {
            success: false,
            error: 'Upload failed after all retry attempts',
          };
        }
        
        // Wait before retry
        await this.delay(this.config.retryDelay || 1000);
      }
    }
    
    return {
      success: false,
      error: 'Upload failed after all retry attempts',
    };
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config.webhookUrl) {
      errors.push(ERROR_MESSAGES.DISCORD_WEBHOOK_NOT_SET);
    }
    
    if (this.config.webhookUrl && !this.isValidWebhookUrl(this.config.webhookUrl)) {
      errors.push('Invalid Discord webhook URL format');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Attempt a single upload
   */
  private async attemptUpload(
    image: Blob, 
    filename: string, 
    message?: string
  ): Promise<DiscordUploadResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);
    
    try {
      const formData = new FormData();
      const file = new File([image], filename, { type: image.type });
      
      formData.append('payload_json', JSON.stringify({
        content: message || DISCORD_CONFIG.DEFAULT_MESSAGE,
      }));
      formData.append('files[0]', file, filename);
      
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        await response.text().catch(() => ''); // Read body but don't use it
        return {
          success: false,
          error: ERROR_MESSAGES.DISCORD_UPLOAD_FAILED,
          statusCode: response.status,
        };
      }
      
      // Try to parse Discord response for message ID
      let messageId: string | undefined;
      try {
        const responseData = await response.json();
        messageId = responseData.id;
      } catch {
        // Message ID is optional, not critical
      }
      
      return {
        success: true,
        messageId,
        statusCode: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          statusCode: 408,
        };
      }
      
      throw error;
    }
  }

  /**
   * Validate file size
   */
  private validateFileSize(image: Blob): { isValid: boolean; error?: string } {
    // Defensive check for invalid image
    if (!image) {
      return {
        isValid: false,
        error: 'Invalid image provided',
      };
    }
    
    if (image.size > DISCORD_CONFIG.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `File size (${this.formatFileSize(image.size)}) exceeds Discord limit (${this.formatFileSize(DISCORD_CONFIG.MAX_FILE_SIZE_BYTES)})`,
      };
    }
    
    return { isValid: true };
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Validate webhook URL format
   */
  private isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === 'discord.com' && 
             parsed.pathname.includes('/api/webhooks/');
    } catch {
      return false;
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock Discord service for testing
 */
export class MockDiscordService implements IDiscordService {
  private shouldSucceed: boolean;
  private delayMs: number;

  constructor(shouldSucceed: boolean = true, delayMs: number = 100) {
    this.shouldSucceed = shouldSucceed;
    this.delayMs = delayMs;
  }

  async uploadImage(
    image: Blob, 
    filename: string, 
    message?: string
  ): Promise<DiscordUploadResult> {
    // Mock implementation - parameters are intentionally unused
    void image;
    void filename;
    void message;
    
    await this.delay(this.delayMs);
    
    if (this.shouldSucceed) {
      return {
        success: true,
        messageId: 'mock-message-id',
        statusCode: 200,
      };
    }
    
    return {
      success: false,
      error: 'Mock upload failure',
      statusCode: 500,
    };
  }

  validateConfiguration(): { isValid: boolean; errors: string[] } {
    return {
      isValid: true,
      errors: [],
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create Discord service
 */
export function createDiscordService(
  config: DiscordServiceConfig
): IDiscordService {
  // In test environment, use mock service
  if (process.env.NODE_ENV === 'test') {
    return new MockDiscordService();
  }
  
  return new HttpDiscordService(config);
}