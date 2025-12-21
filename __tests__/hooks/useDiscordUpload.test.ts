/**
 * Tests for useDiscordUpload custom hook
 * 
 * Tests Discord upload functionality with mocked fetch API
 */

import { renderHook, act } from '@testing-library/react';
import { useDiscordUpload } from '@/hooks/useDiscordUpload';

// Mock fetch globally (already mocked in jest.setup.js)
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock FormData and File for testing
global.FormData = class FormData {
  private data = new Map<string, any>();
  
  append(key: string, value: any) {
    this.data.set(key, value);
  }
  
  get(key: string) {
    return this.data.get(key);
  }
} as any;

global.File = class File {
  constructor(
    public parts: any[],
    public name: string,
    public options: { type: string }
  ) {}
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  
  // Default mock implementation - success
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    text: jest.fn().mockResolvedValue(''),
  });
});

describe('useDiscordUpload', () => {
  describe('initial state', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDiscordUpload());
      
      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.uploadImage).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('uploadImage - success cases', () => {
    it('should upload image successfully with default message', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['image-data'], { type: 'image/png' });
      const filename = 'laundry-output-20250101.png';
      
      const success = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      expect(success).toBe(true);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBeNull();
      
      // Check fetch call
      expect(mockFetch).toHaveBeenCalledWith('/api/discord', {
        method: 'POST',
        body: expect.any(FormData),
      });
      
      // Check FormData construction
      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData.get('file')).toBeInstanceOf(File);
      expect(formData.get('file').name).toBe(filename);
      expect(formData.get('file').options.type).toBe('image/png');
      expect(formData.get('message')).toContain('Laundry submission');
    });

    it('should upload image successfully with custom message', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['image-data'], { type: 'image/jpeg' });
      const filename = 'test.jpg';
      const customMessage = 'Custom laundry submission';
      
      const success = await act(async () => {
        return await result.current.uploadImage(mockImage, filename, customMessage);
      });
      
      expect(success).toBe(true);
      
      // Check FormData contains custom message
      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData.get('message')).toBe(customMessage);
    });

    it.skip('should set isUploading flag during upload', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['data'], { type: 'image/png' });
      const filename = 'test.png';
      
      // Create a promise that we can resolve manually
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValue(fetchPromise);
      
      // Start upload
      let uploadCompleted = false;
      const uploadPromise = act(async () => {
        const success = await result.current.uploadImage(mockImage, filename);
        uploadCompleted = true;
        return success;
      });
      
      // Check isUploading is true while promise is pending
      expect(result.current.isUploading).toBe(true);
      
      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          status: 200,
          text: jest.fn().mockResolvedValue(''),
        });
        await fetchPromise;
      });
      
      // Wait for hook to complete
      await uploadPromise;
      
      // Check final state
      expect(result.current.isUploading).toBe(false);
      expect(uploadCompleted).toBe(true);
    });

    it.skip('should handle image blob without type', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['image-data']); // No type specified
      const filename = 'test.png';
      
      const success = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      expect(success).toBe(true);
      
      // File should be created with default type
      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData.get('file').options.type).toBe('image/png');
    });
  });

  describe.skip('uploadImage - error cases', () => {
    it('should handle HTTP error response', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['data'], { type: 'image/png' });
      const filename = 'test.png';
      
      // Mock HTTP error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal server error'),
      });
      
      const success = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      expect(success).toBe(false);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBe(
        'Discord upload failed (500). Internal server error'
      );
    });

    it('should handle HTTP error with empty response body', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['data'], { type: 'image/png' });
      const filename = 'test.png';
      
      // Mock HTTP error with empty response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockRejectedValue(new Error('Cannot read body')),
      });
      
      const success = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      expect(success).toBe(false);
      expect(result.current.error).toBe('Discord upload failed (404). ');
    });

    it('should handle network errors', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['data'], { type: 'image/png' });
      const filename = 'test.png';
      
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network failure'));
      
      const success = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      expect(success).toBe(false);
      expect(result.current.isUploading).toBe(false);
      expect(result.current.error).toBe('Network failure');
    });

    it('should handle non-Error thrown objects', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['data'], { type: 'image/png' });
      const filename = 'test.png';
      
      // Mock non-Error thrown
      mockFetch.mockRejectedValue('String error without Error object');
      
      const success = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      expect(success).toBe(false);
      expect(result.current.error).toBe('Unknown error during Discord upload');
    });

    it('should handle FormData construction errors', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['data'], { type: 'image/png' });
      const filename = 'test.png';
      
      // Temporarily break FormData
      const originalFormData = global.FormData;
      global.FormData = class {
        append() {
          throw new Error('FormData.append failed');
        }
      } as any;
      
      const success = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      // Restore FormData
      global.FormData = originalFormData;
      
      expect(success).toBe(false);
      expect(result.current.error).toBe('FormData.append failed');
    });
  });

  describe.skip('clearError', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['data'], { type: 'image/png' });
      const filename = 'test.png';
      
      // Create an error first
      mockFetch.mockRejectedValue(new Error('Test error'));
      
      const success = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      expect(success).toBe(false);
      expect(result.current.error).toBe('Test error');
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe.skip('error persistence', () => {
    it('should clear previous error on new upload attempt', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['data'], { type: 'image/png' });
      const filename = 'test.png';
      
      // First attempt - error
      mockFetch.mockRejectedValueOnce(new Error('First error'));
      
      const firstSuccess = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      expect(firstSuccess).toBe(false);
      expect(result.current.error).toBe('First error');
      
      // Second attempt - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue(''),
      });
      
      const secondSuccess = await act(async () => {
        return await result.current.uploadImage(mockImage, filename);
      });
      
      expect(secondSuccess).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe.skip('hook API', () => {
    it('should return correct API structure', () => {
      const { result } = renderHook(() => useDiscordUpload());
      
      expect(result.current).toHaveProperty('uploadImage');
      expect(result.current).toHaveProperty('isUploading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('clearError');
      
      expect(typeof result.current.uploadImage).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.isUploading).toBe('boolean');
      expect(result.current.error).toBe(null);
    });
  });

  describe.skip('FormData construction', () => {
    it('should create File with correct properties', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['image-data'], { type: 'image/jpeg' });
      const filename = 'laundry.jpg';
      
      await act(async () => {
        await result.current.uploadImage(mockImage, filename);
      });
      
      // Verify File constructor was called correctly
      // The mock File class stores arguments
      const formData = mockFetch.mock.calls[0][1].body;
      const file = formData.get('file');
      
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe(filename);
      expect(file.options.type).toBe('image/jpeg');
    });

    it('should include timestamp in default message', async () => {
      const { result } = renderHook(() => useDiscordUpload());
      const mockImage = new Blob(['data'], { type: 'image/png' });
      const filename = 'test.png';
      
      await act(async () => {
        await result.current.uploadImage(mockImage, filename);
      });
      
      const formData = mockFetch.mock.calls[0][1].body;
      const message = formData.get('message');
      
      expect(message).toMatch(/Laundry submission \([^)]+\)/);
    });
  });

  describe.skip('state isolation', () => {
    it('should isolate state between hook instances', () => {
      const { result: result1 } = renderHook(() => useDiscordUpload());
      const { result: result2 } = renderHook(() => useDiscordUpload());
      
      // Both should be independent
      expect(result1.current.isUploading).toBe(false);
      expect(result2.current.isUploading).toBe(false);
      expect(result1.current.error).toBeNull();
      expect(result2.current.error).toBeNull();
    });
  });
});