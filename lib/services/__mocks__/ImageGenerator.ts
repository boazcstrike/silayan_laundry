/**
 * Manual mock for ImageGenerator service
 */

// Mock functions that can be controlled in tests
export const mockGenerateImage = jest.fn();
export const mockValidateConfiguration = jest.fn();

// Mock implementation
export const createImageGenerator = jest.fn(() => ({
  generateImage: mockGenerateImage,
  validateConfiguration: mockValidateConfiguration,
}));

// Re-export the interface (type-only, no runtime effect)
export type { IImageGenerator } from '../ImageGenerator';

// Reset all mocks
export const resetMocks = () => {
  mockGenerateImage.mockClear();
  mockValidateConfiguration.mockClear();
  createImageGenerator.mockClear();
};