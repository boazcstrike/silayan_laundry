/**
 * Tests for API type definitions
 * 
 * Tests TypeScript interfaces for API requests and responses
 */

import {
  DiscordUploadRequest,
  DiscordUploadResponse,
  ApiErrorResponse,
  ApiSuccessResponse,
  ApiResponse,
  HealthCheckResponse,
  ConfigResponse,
} from '@/lib/types/api';

describe('API Type Definitions', () => {
  describe('DiscordUploadRequest Interface', () => {
    it('should create valid DiscordUploadRequest with file', () => {
      const file = new File(['mock-image'], 'laundry.png', { type: 'image/png' });
      const request: DiscordUploadRequest = {
        file,
      };

      expect(request).toBeDefined();
      expect(request.file).toBe(file);
      expect(request.message).toBeUndefined();
    });

    it('should create DiscordUploadRequest with file and message', () => {
      const file = new File(['mock-image'], 'laundry.png', { type: 'image/png' });
      const request: DiscordUploadRequest = {
        file,
        message: 'Laundry submission',
      };

      expect(request).toBeDefined();
      expect(request.file).toBe(file);
      expect(request.message).toBe('Laundry submission');
    });

    it('should require file property', () => {
      // @ts-expect-error - Testing TypeScript type checking
      const invalidRequest: DiscordUploadRequest = {
        // Missing file
        message: 'Test',
      };

      // Runtime check
      expect(invalidRequest.file).toBeUndefined();
      expect(invalidRequest.message).toBe('Test');
    });
  });

  describe('DiscordUploadResponse Interface', () => {
    it('should create successful DiscordUploadResponse', () => {
      const response: DiscordUploadResponse = {
        success: true,
        messageId: '1234567890',
        statusCode: 200,
      };

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.messageId).toBe('1234567890');
      expect(response.statusCode).toBe(200);
      expect(response.error).toBeUndefined();
    });

    it('should create failed DiscordUploadResponse', () => {
      const response: DiscordUploadResponse = {
        success: false,
        error: 'Upload failed',
        statusCode: 500,
      };

      expect(response).toBeDefined();
      expect(response.success).toBe(false);
      expect(response.error).toBe('Upload failed');
      expect(response.statusCode).toBe(500);
      expect(response.messageId).toBeUndefined();
    });

    it('should allow DiscordUploadResponse without statusCode', () => {
      const response: DiscordUploadResponse = {
        success: true,
      };

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.messageId).toBeUndefined();
      expect(response.error).toBeUndefined();
      expect(response.statusCode).toBeUndefined();
    });
  });

  describe('ApiErrorResponse Interface', () => {
    it('should create valid ApiErrorResponse', () => {
      const error: ApiErrorResponse = {
        error: 'Internal server error',
        status: 500,
        details: 'Database connection failed',
      };

      expect(error).toBeDefined();
      expect(error.error).toBe('Internal server error');
      expect(error.status).toBe(500);
      expect(error.details).toBe('Database connection failed');
    });

    it('should create ApiErrorResponse without details', () => {
      const error: ApiErrorResponse = {
        error: 'Not found',
        status: 404,
      };

      expect(error).toBeDefined();
      expect(error.error).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.details).toBeUndefined();
    });

    it('should require error and status properties', () => {
      // @ts-expect-error - Testing TypeScript type checking
      const invalidError: ApiErrorResponse = {
        // Missing error and status
        details: 'Test',
      };

      // Runtime check
      expect(invalidError.error).toBeUndefined();
      expect(invalidError.status).toBeUndefined();
      expect(invalidError.details).toBe('Test');
    });
  });

  describe('ApiSuccessResponse Interface', () => {
    it('should create ApiSuccessResponse with data', () => {
      const success: ApiSuccessResponse<{ id: string }> = {
        success: true,
        data: { id: '123' },
      };

      expect(success).toBeDefined();
      expect(success.success).toBe(true);
      expect(success.data).toEqual({ id: '123' });
    });

    it('should create ApiSuccessResponse with different data types', () => {
      const stringResponse: ApiSuccessResponse<string> = {
        success: true,
        data: 'Success message',
      };

      const arrayResponse: ApiSuccessResponse<number[]> = {
        success: true,
        data: [1, 2, 3],
      };

      expect(stringResponse.data).toBe('Success message');
      expect(arrayResponse.data).toEqual([1, 2, 3]);
    });

    it('should require success and data properties', () => {
      // @ts-expect-error - Testing TypeScript type checking
      const invalidSuccess: ApiSuccessResponse = {
        // Missing data
        success: true,
      };

      // Runtime check
      expect(invalidSuccess.success).toBe(true);
      expect(invalidSuccess.data).toBeUndefined();
    });
  });

  describe('ApiResponse Type', () => {
    it('should allow ApiSuccessResponse as ApiResponse', () => {
      const response: ApiResponse<{ id: string }> = {
        success: true,
        data: { id: '123' },
      };

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect((response as ApiSuccessResponse).data).toEqual({ id: '123' });
    });

    it('should allow ApiErrorResponse as ApiResponse', () => {
      const response: ApiResponse = {
        error: 'Not found',
        status: 404,
      };

      expect(response).toBeDefined();
      expect((response as ApiErrorResponse).error).toBe('Not found');
      expect((response as ApiErrorResponse).status).toBe(404);
    });

    it('should discriminate between success and error responses', () => {
      const successResponse: ApiResponse<{ id: string }> = {
        success: true,
        data: { id: '123' },
      };

      const errorResponse: ApiResponse = {
        error: 'Error',
        status: 500,
      };

      // Type guard check
      if ('success' in successResponse && successResponse.success) {
        expect(successResponse.data.id).toBe('123');
      }

      if ('error' in errorResponse) {
        expect(errorResponse.error).toBe('Error');
        expect(errorResponse.status).toBe(500);
      }
    });
  });

  describe('HealthCheckResponse Interface', () => {
    it('should create valid HealthCheckResponse', () => {
      const health: HealthCheckResponse = {
        status: 'healthy',
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
        details: {
          database: 'connected',
          cache: 'active',
        },
      };

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.version).toBe('1.0.0');
      expect(health.timestamp).toBe('2024-01-01T00:00:00Z');
      expect(health.details).toEqual({
        database: 'connected',
        cache: 'active',
      });
    });

    it('should create HealthCheckResponse without details', () => {
      const health: HealthCheckResponse = {
        status: 'degraded',
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(health).toBeDefined();
      expect(health.status).toBe('degraded');
      expect(health.version).toBe('1.0.0');
      expect(health.timestamp).toBe('2024-01-01T00:00:00Z');
      expect(health.details).toBeUndefined();
    });

    it('should only allow specific status values', () => {
      const healthy: HealthCheckResponse = {
        status: 'healthy',
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const degraded: HealthCheckResponse = {
        status: 'degraded',
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const unhealthy: HealthCheckResponse = {
        status: 'unhealthy',
        version: '1.0.0',
        timestamp: '2024-01-01T00:00:00Z',
      };

      expect(healthy.status).toBe('healthy');
      expect(degraded.status).toBe('degraded');
      expect(unhealthy.status).toBe('unhealthy');
    });
  });

  describe('ConfigResponse Interface', () => {
    it('should create valid ConfigResponse', () => {
      const config: ConfigResponse = {
        discordEnabled: true,
        maxFileSize: 8 * 1024 * 1024, // 8MB
        allowedFileTypes: ['image/png', 'image/jpeg'],
        version: '1.0.0',
      };

      expect(config).toBeDefined();
      expect(config.discordEnabled).toBe(true);
      expect(config.maxFileSize).toBe(8 * 1024 * 1024);
      expect(config.allowedFileTypes).toEqual(['image/png', 'image/jpeg']);
      expect(config.version).toBe('1.0.0');
    });

    it('should create ConfigResponse with discord disabled', () => {
      const config: ConfigResponse = {
        discordEnabled: false,
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedFileTypes: ['image/png'],
        version: '1.0.0',
      };

      expect(config).toBeDefined();
      expect(config.discordEnabled).toBe(false);
      expect(config.maxFileSize).toBe(5 * 1024 * 1024);
      expect(config.allowedFileTypes).toEqual(['image/png']);
      expect(config.version).toBe('1.0.0');
    });

    it('should require all properties', () => {
      // @ts-expect-error - Testing TypeScript type checking
      const invalidConfig: ConfigResponse = {
        discordEnabled: true,
        // Missing other properties
      };

      // Runtime check
      expect(invalidConfig.discordEnabled).toBe(true);
      expect(invalidConfig.maxFileSize).toBeUndefined();
      expect(invalidConfig.allowedFileTypes).toBeUndefined();
      expect(invalidConfig.version).toBeUndefined();
    });
  });

  describe('Type Compatibility', () => {
    it('should allow DiscordUploadResponse to be used as ApiResponse', () => {
      const discordResponse: DiscordUploadResponse = {
        success: true,
        messageId: '123',
      };

      // DiscordUploadResponse is not directly assignable to ApiResponse
      // because ApiResponse is a union of ApiSuccessResponse and ApiErrorResponse
      // We need to convert it to the appropriate type
      const apiResponse: ApiResponse<DiscordUploadResponse> = {
        success: true,
        data: discordResponse,
      };

      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data.messageId).toBe('123');
    });

    it('should allow ApiErrorResponse to be returned from API functions', () => {
      function handleError(): ApiErrorResponse {
        return {
          error: 'Validation failed',
          status: 400,
          details: 'Invalid file format',
        };
      }

      const error = handleError();
      expect(error.error).toBe('Validation failed');
      expect(error.status).toBe(400);
      expect(error.details).toBe('Invalid file format');
    });

    it('should allow generic ApiResponse with typed data', () => {
      function getConfig(): ApiResponse<ConfigResponse> {
        return {
          success: true,
          data: {
            discordEnabled: true,
            maxFileSize: 8 * 1024 * 1024,
            allowedFileTypes: ['image/png'],
            version: '1.0.0',
          },
        };
      }

      const response = getConfig();
      
      // Type guard to check if it's a success response
      if ('success' in response && response.success) {
        expect(response.data.discordEnabled).toBe(true);
        expect(response.data.maxFileSize).toBe(8 * 1024 * 1024);
        expect(response.data.allowedFileTypes).toEqual(['image/png']);
        expect(response.data.version).toBe('1.0.0');
      } else {
        // This should not happen in this test
        fail('Expected success response but got error');
      }
    });
  });
});