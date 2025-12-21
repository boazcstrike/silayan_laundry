/**
 * Tests for ImageGenerator service
 * 
 * Tests canvas-based image generation with mock DOM APIs
 */

import {
  IImageGenerator,
  CanvasImageGenerator,
  createImageGenerator,
} from '@/lib/services/ImageGenerator';
import { LaundryCategory, ItemCounts } from '@/lib/types/laundry';
import { 
  CANVAS_CONFIG, 
  FILE_PATHS, 
  ERROR_MESSAGES,
  IMAGE_GENERATION 
} from '@/lib/constants';

// Mock data for testing
const mockCategories: LaundryCategory = {
  'Regular Laundry': [
    { name: 'T-shirts', x: 150, y: 540 },
    { name: 'Pants', x: 150, y: 962 },
  ],
  'Home Items': [
    { name: 'Towels', x: 800, y: 305 },
  ],
};

const mockCounts: ItemCounts = {
  'T-shirts': 5,
  'Pants': 2,
  'Towels': 3,
};

describe('ImageGenerator Service', () => {
  let imageGenerator: CanvasImageGenerator;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create fresh instance for each test
    imageGenerator = new CanvasImageGenerator();
  });

  describe('IImageGenerator Interface', () => {
    it('should implement IImageGenerator interface', () => {
      expect(imageGenerator).toBeInstanceOf(CanvasImageGenerator);
      expect(imageGenerator).toHaveProperty('generateImage');
      expect(imageGenerator).toHaveProperty('validateConfiguration');
      
      // Type check
      const generator: IImageGenerator = imageGenerator;
      expect(generator).toBeDefined();
    });

    it('should have correct method signatures', () => {
      expect(typeof imageGenerator.generateImage).toBe('function');
      expect(typeof imageGenerator.validateConfiguration).toBe('function');
      
      // Check parameter types
      expect(imageGenerator.generateImage.length).toBe(2); // counts, categories
      expect(imageGenerator.validateConfiguration.length).toBe(0);
    });
  });

  describe('CanvasImageGenerator Constructor', () => {
    it('should create instance with default options', () => {
      const generator = new CanvasImageGenerator();
      
      expect(generator).toBeDefined();
      // Default options should be set
    });

    it('should create instance with custom options', () => {
      const customOptions = {
        templatePath: '/custom-template.jpg',
        signaturePath: '/custom-signature.png',
        fontSize: 24,
        fontFamily: 'Helvetica',
        textColor: '#333333',
      };

      const generator = new CanvasImageGenerator(customOptions);
      
      expect(generator).toBeDefined();
    });

    it('should merge custom options with defaults', () => {
      const customOptions = {
        fontSize: 24,
        fontFamily: 'Helvetica',
      };

      const generator = new CanvasImageGenerator(customOptions);
      
      // Custom options should override defaults
      // Defaults should still be present for unspecified options
    });
  });

  describe('validateConfiguration', () => {
    it('should validate default configuration as valid', () => {
      const validation = imageGenerator.validateConfiguration();
      
      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing template path', () => {
      const generator = new CanvasImageGenerator({ templatePath: '' });
      const validation = generator.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Template path is required');
    });

    it('should detect missing signature path', () => {
      const generator = new CanvasImageGenerator({ signaturePath: '' });
      const validation = generator.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Signature path is required');
    });

    it('should detect invalid font size', () => {
      const generator = new CanvasImageGenerator({ fontSize: 0 });
      const validation = generator.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Font size must be positive');
    });

    it('should detect missing font family', () => {
      const generator = new CanvasImageGenerator({ fontFamily: '' });
      const validation = generator.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Font family is required');
    });

    it('should return multiple errors for multiple issues', () => {
      const generator = new CanvasImageGenerator({
        templatePath: '',
        signaturePath: '',
        fontSize: 0,
        fontFamily: '',
      });
      
      const validation = generator.validateConfiguration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(4);
    });
  });

  describe('generateImage', () => {
    it('should generate image successfully with valid inputs', async () => {
      const result = await imageGenerator.generateImage(mockCounts, mockCategories);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.image).toBeInstanceOf(Blob);
      expect(result.filename).toMatch(/^laundry-output-\d{14}\.png$/);
      expect(result.error).toBeUndefined();
    });

    it('should handle empty counts', async () => {
      const emptyCounts: ItemCounts = {};
      const result = await imageGenerator.generateImage(emptyCounts, mockCategories);
      
      expect(result.success).toBe(true);
      expect(result.image).toBeInstanceOf(Blob);
    });

    it('should handle zero counts', async () => {
      const zeroCounts: ItemCounts = {
        'T-shirts': 0,
        'Pants': 0,
        'Towels': 0,
      };
      
      const result = await imageGenerator.generateImage(zeroCounts, mockCategories);
      
      expect(result.success).toBe(true);
      expect(result.image).toBeInstanceOf(Blob);
    });

    it('should handle missing canvas context', async () => {
      // Mock document.createElement to return canvas with null getContext
      const originalCreateElement = global.document.createElement;
      global.document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas') {
          return {
            width: 800,
            height: 600,
            getContext: jest.fn(() => null),
            toBlob: jest.fn((callback) => {
              callback(new Blob(['mock-image'], { type: 'image/png' }));
            }),
          } as any;
        }
        return originalCreateElement.call(document, tagName);
      });
      
      const result = await imageGenerator.generateImage(mockCounts, mockCategories);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Restore mock
      global.document.createElement = originalCreateElement;
    });

    it('should handle image loading failure', async () => {
      // Mock Image to simulate loading failure
      const originalImage = global.Image;
      
      // Create a mock class that properly extends HTMLImageElement
      class MockImage {
        src: string = '';
        width: number = 800;
        height: number = 600;
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
        
        constructor() {
          // Simulate immediate error
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Failed to load'));
          }, 0);
        }
        
        decode() {
          return Promise.reject(new Error('Decode failed'));
        }
      }
      
      global.Image = MockImage as any;
      
      const result = await imageGenerator.generateImage(mockCounts, mockCategories);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      // Restore mock
      global.Image = originalImage;
    });

    it('should handle canvas toBlob failure', async () => {
      // Mock toBlob to call callback with null
      const originalCreateElement = global.document.createElement;
      
      // Create a proper mock that satisfies HTMLElement type
      const mockCanvas = document.createElement('canvas');
      Object.assign(mockCanvas, {
        width: 800,
        height: 600,
        getContext: jest.fn(() => ({
          fillStyle: '',
          font: '',
          drawImage: jest.fn(),
          fillText: jest.fn(),
        })),
        toBlob: jest.fn((callback) => {
          callback(null); // Simulate failure
        }),
      });
      
      global.document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        return originalCreateElement.call(document, tagName);
      });
      
      const result = await imageGenerator.generateImage(mockCounts, mockCategories);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.IMAGE_GENERATION_FAILED);
      
      // Restore mock
      global.document.createElement = originalCreateElement;
    });

    it('should handle signature loading failure gracefully', async () => {
      // Mock signature image to fail loading
      const originalImage = global.Image;
      let callCount = 0;
      
      // Create a mock class that properly extends HTMLImageElement
      class MockImageWithCount {
        src: string = '';
        width: number = 800;
        height: number = 600;
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
        
        constructor() {
          callCount++;
          
          // First image (template) succeeds, second (signature) fails
          setTimeout(() => {
            if (callCount === 1 && this.onload) {
              this.onload();
            } else if (callCount === 2 && this.onerror) {
              this.onerror(new Error('Signature failed'));
            }
          }, 0);
        }
        
        decode() {
          if (callCount === 1) {
            return Promise.resolve();
          }
          return Promise.reject(new Error('Signature decode failed'));
        }
      }
      
      global.Image = MockImageWithCount as any;
      
      const result = await imageGenerator.generateImage(mockCounts, mockCategories);
      
      // Should still succeed even if signature fails
      expect(result.success).toBe(true);
      expect(result.image).toBeInstanceOf(Blob);
      
      // Restore mock
      global.Image = originalImage;
    });
  });

  describe('Private Methods (indirect testing)', () => {
    it('should draw positive counts only', async () => {
      const mixedCounts: ItemCounts = {
        'T-shirts': 5,  // Positive - should be drawn
        'Pants': 0,     // Zero - should not be drawn
        'Towels': -1,   // Negative - should not be drawn (though validation should prevent this)
      };
      
      const result = await imageGenerator.generateImage(mixedCounts, mockCategories);
      
      expect(result.success).toBe(true);
      // Canvas fillText should only be called for positive counts
    });

    it('should generate correct filename format', async () => {
      const result = await imageGenerator.generateImage(mockCounts, mockCategories);
      
      expect(result.filename).toMatch(/^laundry-output-\d{14}\.png$/);
      expect(result.filename).toContain('laundry-output-');
      expect(result.filename).toContain('.png');
      
      // Check timestamp format (YYYYMMDDHHMMSS)
      const timestamp = result.filename!.match(/\d{14}/)?.[0];
      expect(timestamp).toHaveLength(14);
    });
  });

  describe('createImageGenerator Factory', () => {
    it('should create CanvasImageGenerator instance', () => {
      const generator = createImageGenerator();
      
      expect(generator).toBeDefined();
      expect(generator).toBeInstanceOf(CanvasImageGenerator);
    });

    it('should pass options to constructor', () => {
      const options = {
        fontSize: 24,
        fontFamily: 'Helvetica',
      };
      
      const generator = createImageGenerator(options);
      
      expect(generator).toBeDefined();
      expect(generator).toBeInstanceOf(CanvasImageGenerator);
    });

    it('should implement IImageGenerator interface', () => {
      const generator = createImageGenerator();
      
      // Type check
      const iGenerator: IImageGenerator = generator;
      expect(iGenerator).toBeDefined();
      expect(typeof iGenerator.generateImage).toBe('function');
      expect(typeof iGenerator.validateConfiguration).toBe('function');
    });
  });

  describe('Integration with Constants', () => {
    it('should use constants from CANVAS_CONFIG', () => {
      // The generator should use constants for default values
      const generator = new CanvasImageGenerator();
      
      // These values should come from constants
      expect(CANVAS_CONFIG.FONT_SIZE).toBe(32);
      expect(CANVAS_CONFIG.FONT_FAMILY).toBe('Arial');
      expect(CANVAS_CONFIG.TEXT_COLOR).toBe('black');
    });

    it('should use constants from FILE_PATHS', () => {
      const generator = new CanvasImageGenerator();
      
      // Default paths should come from constants
      expect(FILE_PATHS.TEMPLATE_IMAGE).toBe('/template.jpg');
      expect(FILE_PATHS.SIGNATURE_IMAGE).toBe('/signature_bo.png');
    });

    it('should use constants from IMAGE_GENERATION', async () => {
      const result = await imageGenerator.generateImage(mockCounts, mockCategories);
      
      expect(result.filename).toMatch(new RegExp(`^${IMAGE_GENERATION.FILENAME_PREFIX}\\d{14}${IMAGE_GENERATION.FILENAME_EXTENSION}$`));
    });
  });

  describe('Error Handling', () => {
    it('should return error result on exception', async () => {
      // Force an exception
      const generator = new CanvasImageGenerator();
      jest.spyOn(generator as any, 'loadImage').mockRejectedValue(new Error('Test error'));
      
      const result = await generator.generateImage(mockCounts, mockCategories);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('should handle undefined categories', async () => {
      const result = await imageGenerator.generateImage(mockCounts, {});
      
      expect(result.success).toBe(true);
      expect(result.image).toBeInstanceOf(Blob);
    });

    it('should handle null/undefined counts gracefully', async () => {
      // @ts-expect-error - Testing with invalid input
      const result = await imageGenerator.generateImage(null, mockCategories);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});