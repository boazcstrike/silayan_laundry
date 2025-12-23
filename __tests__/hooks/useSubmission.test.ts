/**
 * Tests for useSubmission custom hook
 * 
 * Tests submission recording functionality with mocked fetch API
 */

import { renderHook, act } from '@testing-library/react';
import { useSubmission } from '@/hooks/useSubmission';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Default mock implementation - success
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ ok: true, submissionId: 1 }),
  });
});

afterAll(() => {
  mockConsoleError.mockRestore();
});

describe('useSubmission', () => {
  describe('initial state', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSubmission());
      
      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.recordSubmission).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('recordSubmission - success cases', () => {
    it('should record submission successfully and return submissionId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ ok: true, submissionId: 42 }),
      });
      
      const { result } = renderHook(() => useSubmission());
      const counts = { 'Tshirt': 5, 'Pants': 3 };
      
      let submissionId: number | null = null;
      await act(async () => {
        submissionId = await result.current.recordSubmission(counts, 'discord', true);
      });
      
      expect(submissionId).toBe(42);
      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBeNull();
      
      // Check fetch call
      expect(mockFetch).toHaveBeenCalledWith('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          counts,
          channel: 'discord',
          channelSuccess: true,
        }),
      });
    });

    it('should record download submission correctly', async () => {
      const { result } = renderHook(() => useSubmission());
      const counts = { 'Towel': 10 };
      
      await act(async () => {
        await result.current.recordSubmission(counts, 'download', true);
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          counts,
          channel: 'download',
          channelSuccess: true,
        }),
      });
    });

    it('should record failed submission (channelSuccess=false)', async () => {
      const { result } = renderHook(() => useSubmission());
      const counts = { 'Shirt': 2 };
      
      await act(async () => {
        await result.current.recordSubmission(counts, 'discord', false);
      });
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.channelSuccess).toBe(false);
    });

    it('should handle all channel types', async () => {
      const { result } = renderHook(() => useSubmission());
      const counts = { 'Item': 1 };
      const channels = ['download', 'discord', 'whatsapp', 'viber', 'messenger'] as const;
      
      for (const channel of channels) {
        await act(async () => {
          await result.current.recordSubmission(counts, channel, true);
        });
        
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        const callBody = JSON.parse(lastCall[1].body);
        expect(callBody.channel).toBe(channel);
      }
    });
  });

  describe('recordSubmission - error cases', () => {
    it('should handle HTTP error response and return null', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Internal server error' }),
      });
      
      const { result } = renderHook(() => useSubmission());
      const counts = { 'Tshirt': 5 };
      
      let submissionId: number | null = null;
      await act(async () => {
        submissionId = await result.current.recordSubmission(counts, 'discord', true);
      });
      
      expect(submissionId).toBeNull();
      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBe('Internal server error');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle HTTP error with empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockRejectedValue(new Error('Cannot parse JSON')),
      });
      
      const { result } = renderHook(() => useSubmission());
      const counts = { 'Tshirt': 5 };
      
      let submissionId: number | null = null;
      await act(async () => {
        submissionId = await result.current.recordSubmission(counts, 'discord', true);
      });
      
      expect(submissionId).toBeNull();
      expect(result.current.error).toContain('Failed to record submission (400)');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));
      
      const { result } = renderHook(() => useSubmission());
      const counts = { 'Tshirt': 5 };
      
      let submissionId: number | null = null;
      await act(async () => {
        submissionId = await result.current.recordSubmission(counts, 'discord', true);
      });
      
      expect(submissionId).toBeNull();
      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).toBe('Network failure');
    });

    it('should handle non-Error thrown objects', async () => {
      mockFetch.mockRejectedValue('String error');
      
      const { result } = renderHook(() => useSubmission());
      const counts = { 'Tshirt': 5 };
      
      let submissionId: number | null = null;
      await act(async () => {
        submissionId = await result.current.recordSubmission(counts, 'discord', true);
      });
      
      expect(submissionId).toBeNull();
      expect(result.current.error).toBe('Unknown error recording submission');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockFetch.mockRejectedValue(new Error('Test error'));
      
      const { result } = renderHook(() => useSubmission());
      
      // Create an error first
      await act(async () => {
        await result.current.recordSubmission({ 'Item': 1 }, 'discord', true);
      });
      
      expect(result.current.error).toBe('Test error');
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('error persistence', () => {
    it('should clear previous error on new submission attempt', async () => {
      const { result } = renderHook(() => useSubmission());
      
      // First attempt - error
      mockFetch.mockRejectedValueOnce(new Error('First error'));
      
      await act(async () => {
        await result.current.recordSubmission({ 'Item': 1 }, 'discord', true);
      });
      
      expect(result.current.error).toBe('First error');
      
      // Second attempt - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ ok: true, submissionId: 2 }),
      });
      
      await act(async () => {
        await result.current.recordSubmission({ 'Item': 1 }, 'discord', true);
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('hook API', () => {
    it('should return correct API structure', () => {
      const { result } = renderHook(() => useSubmission());
      
      expect(result.current).toHaveProperty('recordSubmission');
      expect(result.current).toHaveProperty('isRecording');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('clearError');
      
      expect(typeof result.current.recordSubmission).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.isRecording).toBe('boolean');
      expect(result.current.error).toBe(null);
    });
  });

  describe('state isolation', () => {
    it('should isolate state between hook instances', () => {
      const { result: result1 } = renderHook(() => useSubmission());
      const { result: result2 } = renderHook(() => useSubmission());
      
      // Both should be independent
      expect(result1.current.isRecording).toBe(false);
      expect(result2.current.isRecording).toBe(false);
      expect(result1.current.error).toBeNull();
      expect(result2.current.error).toBeNull();
    });
  });

  describe('empty counts', () => {
    it('should handle empty counts object', async () => {
      const { result } = renderHook(() => useSubmission());
      const counts = {};
      
      let submissionId: number | null = null;
      await act(async () => {
        submissionId = await result.current.recordSubmission(counts, 'download', true);
      });
      
      expect(submissionId).toBe(1); // Default mock returns 1
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle counts with zero values', async () => {
      const { result } = renderHook(() => useSubmission());
      const counts = { 'Tshirt': 0, 'Pants': 0 };
      
      await act(async () => {
        await result.current.recordSubmission(counts, 'download', true);
      });
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.counts).toEqual({ 'Tshirt': 0, 'Pants': 0 });
    });
  });
});
