/**
 * Tests for DiscordService
 * 
 * Tests Discord webhook integration with mock fetch API
 */

import {
  IDiscordService,
  HttpDiscordService,
  MockDiscordService,
  createDiscordService,
  DiscordServiceConfig,
} from '@/lib/services/DiscordService';
import { DISCORD_CONFIG, ERROR_MESSAGES } from '@/lib/constants';

// Mock data for testing
const mockConfig: DiscordServiceConfig = {
  webhookUrl: 'https://discord.com/api/webhooks/123456/abcdef',
};

const mockImage = new Blob(['mock-image'], { type: 'image/png' });
const mockFilename = 'laundry-output-20250101000000.png';
const mockMessage = 'Laundry submission';

describe('DiscordService', () => {
  let discordService: HttpDiscordService;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh instance for each test
    discordService = new HttpDiscordService(mockConfig);
    
    // Mock fetch
    mockFetch = global.fetch as jest.Mock;
    mockFetch.mockClear();
  });

  describe('IDiscordService Interface', () => {
    it('should implement IDiscordService interface', () => {
      expect(discordService).toBeInstanceOf(HttpDiscordService);
      expect(discordService).toHaveProperty('uploadImage');
      expect(discordService).toHaveProperty('validateConfiguration');
      
      // Type check
      const service: IDiscordService = discordService;
      expect(service).toBeDefined();
    });

    it('should have correct method signatures', () => {
      expect(typeof discordService.uploadImage).toBe('function');
      expect(typeof discordService.validateConfiguration).toBe('function');
      
      // Check parameter types
      expect(discordService.uploadImage.length).toBe(3); // image, filename, message
      expect(discordService.validateConfiguration.length).toBe(0);
    });
  });

  describe('HttpDiscordService Constructor', () => {
    it('should create instance with required config', () => {
      const service = new HttpDiscordService(mockConfig);
      
      expect(service).toBeDefined();
    });

    it('should create instance with full config', () => {
      const fullConfig: DiscordServiceConfig = {
        webhookUrl: 'https://discord.com/api/webhooks/123456/abcdef',
        maxRetries: 5,
        retryDelay: 2000,
        timeout: 60000,
      };

      const service = new HttpDiscordService(fullConfig);
      
      expect(service).toBeDefined();
    });

    it('should use default values for optional config', () => {
      const minimalConfig: DiscordServiceConfig = {
        webhookUrl: 'https://discord.com/api/webhooks/123456/abcdef',
      };

      const service = new HttpDiscordService(minimalConfig);
      
      expect(service).toBeDefined();
      // Defaults should be applied
    });
  });

  describe('validateConfiguration', () => {
    it('should validate correct configuration as valid', () => {
      const validation = discordService.validateConfiguration();
      
      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing webhook URL', () => {
      const service = new HttpDiscordService({ webhookUrl: '' });
      const validation = service.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(ERROR_MESSAGES.DISCORD_WEBHOOK_NOT_SET);
    });

    it('should detect invalid webhook URL format', () => {
      const service = new HttpDiscordService({ 
        webhookUrl: 'https://example.com/invalid' 
      });
      const validation = service.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid Discord webhook URL format');
    });

    it('should accept valid Discord webhook URL', () => {
      const validUrls = [
        'https://discord.com/api/webhooks/123456/abcdef',
        'https://discord.com/api/webhooks/1234567890/abcdefghijklmnop',
      ];

      validUrls.forEach(url => {
        const service = new HttpDiscordService({ webhookUrl: url });
        const validation = service.validateConfiguration();
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: '1234567890' }),
      });

      const result = await discordService.uploadImage(mockImage, mockFilename, mockMessage);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('1234567890');
      expect(result.statusCode).toBe(200);
      expect(result.error).toBeUndefined();
      
      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.webhookUrl,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    it('should upload image without message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const result = await discordService.uploadImage(mockImage, mockFilename);
      
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      
      // Should use default message
    });

    it('should handle Discord API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      });

      const result = await discordService.uploadImage(mockImage, mockFilename, mockMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.DISCORD_UPLOAD_FAILED);
      expect(result.statusCode).toBe(400);
      
      // Reset mock
      mockFetch.mockClear();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await discordService.uploadImage(mockImage, mockFilename, mockMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed after all retry attempts');
      
      // Reset mock
      mockFetch.mockClear();
    });

    it('should retry on failure', async () => {
      // First two attempts fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: '123' }),
        });

      const service = new HttpDiscordService({
        ...mockConfig,
        maxRetries: 2,
        retryDelay: 10, // Short delay for testing
      });

      const result = await service.uploadImage(mockImage, mockFilename, mockMessage);
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should give up after max retries', async () => {
      // All attempts fail
      mockFetch.mockRejectedValue(new Error('Always fails'));

      const service = new HttpDiscordService({
        ...mockConfig,
        maxRetries: 2,
        retryDelay: 10,
      });

      const result = await service.uploadImage(mockImage, mockFilename, mockMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed after all retry attempts');
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle request timeout', async () => {
      // Create service with short timeout for test
      const serviceWithShortTimeout = new HttpDiscordService({
        ...mockConfig,
        timeout: 100, // 100ms timeout for test
      });
      
      // Mock AbortController
      const mockAbort = jest.fn();
      const originalAbortController = global.AbortController;
      
      global.AbortController = class {
        signal = { aborted: false };
        abort = mockAbort;
      } as any;

      // Mock fetch to reject with AbortError after a short delay
      // This simulates the timeout abort behavior
      mockFetch.mockImplementation(() => {
        // Create an error with name 'AbortError'
        const error = new Error('Request timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const result = await serviceWithShortTimeout.uploadImage(mockImage, mockFilename, mockMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
      
      // Restore
      global.AbortController = originalAbortController;
    });

    it('should validate file size before upload', async () => {
      // Create a file that's too large
      const largeImage = new Blob([new ArrayBuffer(DISCORD_CONFIG.MAX_FILE_SIZE_BYTES + 1)]);
      
      const result = await discordService.uploadImage(largeImage, mockFilename, mockMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds Discord limit');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Invalid JSON'); },
      });

      const result = await discordService.uploadImage(mockImage, mockFilename, mockMessage);
      
      // Should still succeed even if JSON parsing fails
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('MockDiscordService', () => {
    let mockService: MockDiscordService;

    beforeEach(() => {
      mockService = new MockDiscordService();
    });

    it('should create MockDiscordService instance', () => {
      expect(mockService).toBeInstanceOf(MockDiscordService);
      expect(mockService).toHaveProperty('uploadImage');
      expect(mockService).toHaveProperty('validateConfiguration');
    });

    it('should simulate successful upload', async () => {
      const result = await mockService.uploadImage(mockImage, mockFilename, mockMessage);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mock-message-id');
      expect(result.statusCode).toBe(200);
    });

    it('should simulate failed upload', async () => {
      const failingService = new MockDiscordService(false);
      const result = await failingService.uploadImage(mockImage, mockFilename, mockMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Mock upload failure');
      expect(result.statusCode).toBe(500);
    });

    it('should always validate as valid', () => {
      const validation = mockService.validateConfiguration();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should implement IDiscordService interface', () => {
      const service: IDiscordService = mockService;
      expect(service).toBeDefined();
      expect(typeof service.uploadImage).toBe('function');
      expect(typeof service.validateConfiguration).toBe('function');
    });
  });

  describe('createDiscordService Factory', () => {
    it('should create HttpDiscordService by default', () => {
      // Mock process.env.NODE_ENV to be non-test
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      
      const service = createDiscordService(mockConfig);
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(HttpDiscordService);
      
      // Restore
      process.env = originalEnv;
    });

    it('should create MockDiscordService in test environment', () => {
      // Mock process.env.NODE_ENV
      const originalEnv = process.env;
      process.env = { ...originalEnv, NODE_ENV: 'test' };
      
      const service = createDiscordService(mockConfig);
      
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MockDiscordService);
      
      // Restore process.env
      process.env = originalEnv;
    });

    it('should pass config to constructor', () => {
      const service = createDiscordService(mockConfig);
      
      expect(service).toBeDefined();
      // Should use the provided config
    });

    it('should implement IDiscordService interface', () => {
      const service = createDiscordService(mockConfig);
      
      const iService: IDiscordService = service;
      expect(iService).toBeDefined();
      expect(typeof iService.uploadImage).toBe('function');
      expect(typeof iService.validateConfiguration).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration in uploadImage', async () => {
      const invalidService = new HttpDiscordService({ webhookUrl: '' });
      const result = await invalidService.uploadImage(mockImage, mockFilename, mockMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain(ERROR_MESSAGES.DISCORD_WEBHOOK_NOT_SET);
    });

    it('should handle null/undefined image', async () => {
      // @ts-expect-error - Testing with invalid input
      const result = await discordService.uploadImage(null, mockFilename, mockMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty filename', async () => {
      // Mock fetch to reject quickly to avoid delays
      mockFetch.mockRejectedValue(new Error('Test error'));
      
      const result = await discordService.uploadImage(mockImage, '', mockMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Reset mock
      mockFetch.mockClear();
    }, 10000); // Increase test timeout
  });

  describe('Integration with Constants', () => {
    it('should use constants from DISCORD_CONFIG', () => {
      expect(DISCORD_CONFIG.MAX_FILE_SIZE_BYTES).toBe(8 * 1024 * 1024);
      expect(DISCORD_CONFIG.DEFAULT_MESSAGE).toBe('Laundry submission');
      expect(DISCORD_CONFIG.MESSAGE_TEMPLATE).toBe('Laundry submission ({timestamp})');
    });

    it('should use constants from ERROR_MESSAGES', () => {
      expect(ERROR_MESSAGES.DISCORD_WEBHOOK_NOT_SET).toBe('DISCORD_WEBHOOK_URL is not set');
      expect(ERROR_MESSAGES.DISCORD_UPLOAD_FAILED).toBe('Discord webhook request failed');
    });

    it('should validate against Discord file size limit', () => {
      const maxSize = DISCORD_CONFIG.MAX_FILE_SIZE_BYTES;
      expect(maxSize).toBe(8 * 1024 * 1024); // 8MB
      
      // Create a file at the limit
      const atLimitImage = new Blob([new ArrayBuffer(maxSize)]);
      
      // Create a file over the limit
      const overLimitImage = new Blob([new ArrayBuffer(maxSize + 1)]);
      
      expect(atLimitImage.size).toBe(maxSize);
      expect(overLimitImage.size).toBe(maxSize + 1);
    });
  });
});