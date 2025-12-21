/**
 * Tests for laundry type definitions
 * 
 * Tests TypeScript interfaces and type guards for the laundry application
 */

import {
  LaundryItem,
  LaundryCategory,
  ItemCounts,
  ImageGenerationOptions,
  ImageGenerationResult,
  DiscordUploadResult,
  CustomItem,
  LaundryAppState,
  ValidationResult,
  UpdateCountFunction,
  SetCountFunction,
} from '@/lib/types/laundry';

describe('Laundry Type Definitions', () => {
  describe('LaundryItem Interface', () => {
    it('should create a valid LaundryItem', () => {
      const item: LaundryItem = {
        name: 'T-shirts',
        x: 150,
        y: 540,
        group: 'uppers',
      };

      expect(item).toBeDefined();
      expect(item.name).toBe('T-shirts');
      expect(item.x).toBe(150);
      expect(item.y).toBe(540);
      expect(item.group).toBe('uppers');
    });

    it('should allow LaundryItem without group', () => {
      const item: LaundryItem = {
        name: 'Pants',
        x: 150,
        y: 962,
      };

      expect(item).toBeDefined();
      expect(item.name).toBe('Pants');
      expect(item.x).toBe(150);
      expect(item.y).toBe(962);
      expect(item.group).toBeUndefined();
    });

    it('should enforce required properties', () => {
      // @ts-expect-error - Testing TypeScript type checking
      const invalidItem: LaundryItem = {
        name: 'Invalid',
        // Missing x and y
      };

      // Runtime check
      expect(invalidItem.name).toBe('Invalid');
      expect(invalidItem.x).toBeUndefined();
      expect(invalidItem.y).toBeUndefined();
    });
  });

  describe('LaundryCategory Type', () => {
    it('should create a valid LaundryCategory', () => {
      const category: LaundryCategory = {
        'Regular Laundry': [
          { name: 'T-shirts', x: 150, y: 540 },
          { name: 'Pants', x: 150, y: 962 },
        ],
        'Home Items': [
          { name: 'Towels', x: 800, y: 305 },
        ],
      };

      expect(category).toBeDefined();
      expect(Object.keys(category)).toHaveLength(2);
      expect(category['Regular Laundry']).toHaveLength(2);
      expect(category['Home Items']).toHaveLength(1);
    });

    it('should allow empty categories', () => {
      const category: LaundryCategory = {};

      expect(category).toBeDefined();
      expect(Object.keys(category)).toHaveLength(0);
    });
  });

  describe('ItemCounts Type', () => {
    it('should create valid ItemCounts', () => {
      const counts: ItemCounts = {
        'T-shirts': 5,
        'Pants': 2,
        'Towels': 3,
      };

      expect(counts).toBeDefined();
      expect(counts['T-shirts']).toBe(5);
      expect(counts['Pants']).toBe(2);
      expect(counts['Towels']).toBe(3);
    });

    it('should allow zero counts', () => {
      const counts: ItemCounts = {
        'T-shirts': 0,
        'Pants': 0,
      };

      expect(counts).toBeDefined();
      expect(counts['T-shirts']).toBe(0);
      expect(counts['Pants']).toBe(0);
    });

    it('should allow empty counts', () => {
      const counts: ItemCounts = {};

      expect(counts).toBeDefined();
      expect(Object.keys(counts)).toHaveLength(0);
    });
  });

  describe('ImageGenerationOptions Interface', () => {
    it('should create valid ImageGenerationOptions with all properties', () => {
      const options: ImageGenerationOptions = {
        templatePath: '/template.jpg',
        signaturePath: '/signature.png',
        fontSize: 32,
        fontFamily: 'Arial',
        textColor: 'black',
      };

      expect(options).toBeDefined();
      expect(options.templatePath).toBe('/template.jpg');
      expect(options.signaturePath).toBe('/signature.png');
      expect(options.fontSize).toBe(32);
      expect(options.fontFamily).toBe('Arial');
      expect(options.textColor).toBe('black');
    });

    it('should allow ImageGenerationOptions with only required properties', () => {
      const options: ImageGenerationOptions = {
        templatePath: '/template.jpg',
        signaturePath: '/signature.png',
      };

      expect(options).toBeDefined();
      expect(options.templatePath).toBe('/template.jpg');
      expect(options.signaturePath).toBe('/signature.png');
      expect(options.fontSize).toBeUndefined();
      expect(options.fontFamily).toBeUndefined();
      expect(options.textColor).toBeUndefined();
    });
  });

  describe('ImageGenerationResult Interface', () => {
    it('should create successful ImageGenerationResult', () => {
      const mockBlob = new Blob(['mock-image'], { type: 'image/png' });
      const result: ImageGenerationResult = {
        success: true,
        image: mockBlob,
        filename: 'laundry-output-20250101.png',
      };

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.image).toBe(mockBlob);
      expect(result.filename).toBe('laundry-output-20250101.png');
      expect(result.error).toBeUndefined();
    });

    it('should create failed ImageGenerationResult', () => {
      const result: ImageGenerationResult = {
        success: false,
        error: 'Failed to generate image',
      };

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate image');
      expect(result.image).toBeUndefined();
      expect(result.filename).toBeUndefined();
    });
  });

  describe('DiscordUploadResult Interface', () => {
    it('should create successful DiscordUploadResult', () => {
      const result: DiscordUploadResult = {
        success: true,
        messageId: '1234567890',
        statusCode: 200,
      };

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('1234567890');
      expect(result.statusCode).toBe(200);
      expect(result.error).toBeUndefined();
    });

    it('should create failed DiscordUploadResult', () => {
      const result: DiscordUploadResult = {
        success: false,
        error: 'Upload failed',
        statusCode: 500,
      };

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
      expect(result.statusCode).toBe(500);
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('CustomItem Interface', () => {
    it('should create valid CustomItem', () => {
      const now = new Date();
      const item: CustomItem = {
        name: 'Custom Item 1',
        count: 3,
        addedAt: now,
      };

      expect(item).toBeDefined();
      expect(item.name).toBe('Custom Item 1');
      expect(item.count).toBe(3);
      expect(item.addedAt).toBe(now);
    });

    it('should allow zero count for CustomItem', () => {
      const now = new Date();
      const item: CustomItem = {
        name: 'Custom Item 2',
        count: 0,
        addedAt: now,
      };

      expect(item).toBeDefined();
      expect(item.name).toBe('Custom Item 2');
      expect(item.count).toBe(0);
      expect(item.addedAt).toBe(now);
    });
  });

  describe('LaundryAppState Interface', () => {
    it('should create valid LaundryAppState', () => {
      const mockBlob = new Blob(['mock-image'], { type: 'image/png' });
      const state: LaundryAppState = {
        predefinedItems: {
          'T-shirts': 5,
          'Pants': 2,
        },
        customItems: [
          {
            name: 'Custom Item',
            count: 3,
            addedAt: new Date(),
          },
        ],
        lastGeneratedImage: mockBlob,
        lastUploadResult: {
          success: true,
          messageId: '1234567890',
        },
        isGeneratingImage: false,
        isUploadingToDiscord: false,
      };

      expect(state).toBeDefined();
      expect(state.predefinedItems['T-shirts']).toBe(5);
      expect(state.predefinedItems['Pants']).toBe(2);
      expect(state.customItems).toHaveLength(1);
      expect(state.customItems[0].name).toBe('Custom Item');
      expect(state.lastGeneratedImage).toBe(mockBlob);
      expect(state.lastUploadResult?.success).toBe(true);
      expect(state.isGeneratingImage).toBe(false);
      expect(state.isUploadingToDiscord).toBe(false);
    });

    it('should allow LaundryAppState without optional properties', () => {
      const state: LaundryAppState = {
        predefinedItems: {},
        customItems: [],
        isGeneratingImage: false,
        isUploadingToDiscord: false,
      };

      expect(state).toBeDefined();
      expect(Object.keys(state.predefinedItems)).toHaveLength(0);
      expect(state.customItems).toHaveLength(0);
      expect(state.lastGeneratedImage).toBeUndefined();
      expect(state.lastUploadResult).toBeUndefined();
      expect(state.isGeneratingImage).toBe(false);
      expect(state.isUploadingToDiscord).toBe(false);
    });
  });

  describe('ValidationResult Interface', () => {
    it('should create valid ValidationResult', () => {
      const result: ValidationResult = {
        isValid: true,
      };

      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.suggestion).toBeUndefined();
    });

    it('should create invalid ValidationResult with error', () => {
      const result: ValidationResult = {
        isValid: false,
        error: 'Count must be positive',
        suggestion: 'Please enter a number greater than 0',
      };

      expect(result).toBeDefined();
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Count must be positive');
      expect(result.suggestion).toBe('Please enter a number greater than 0');
    });
  });

  describe('Function Types', () => {
    it('should define UpdateCountFunction type', () => {
      const updateCount: UpdateCountFunction = (itemName, delta, isCustom = false) => {
        // Implementation would update counts
        void itemName;
        void delta;
        void isCustom;
      };

      expect(typeof updateCount).toBe('function');
      // Note: Default parameters don't count toward .length in JavaScript
      // The function has 3 parameters, but .length counts only required parameters
      expect(updateCount.length).toBe(2); // itemName, delta (isCustom has default)
    });

    it('should define SetCountFunction type', () => {
      const setCount: SetCountFunction = (itemName, count, isCustom = false) => {
        // Implementation would set count directly
        void itemName;
        void count;
        void isCustom;
      };

      expect(typeof setCount).toBe('function');
      // Note: Default parameters don't count toward .length in JavaScript
      // The function has 3 parameters, but .length counts only required parameters
      expect(setCount.length).toBe(2); // itemName, count (isCustom has default)
    });
  });

  describe('Type Compatibility', () => {
    it('should allow LaundryItem arrays to be assigned to LaundryCategory values', () => {
      const items: LaundryItem[] = [
        { name: 'T-shirts', x: 150, y: 540 },
        { name: 'Pants', x: 150, y: 962 },
      ];

      const category: LaundryCategory = {
        'Regular Laundry': items,
      };

      expect(category['Regular Laundry']).toBe(items);
    });

    it('should allow ItemCounts to be used with LaundryItem names', () => {
      const items: LaundryItem[] = [
        { name: 'T-shirts', x: 150, y: 540 },
        { name: 'Pants', x: 150, y: 962 },
      ];

      const counts: ItemCounts = {
        'T-shirts': 5,
        'Pants': 2,
      };

      // This should compile without errors
      expect(counts[items[0].name]).toBe(5);
      expect(counts[items[1].name]).toBe(2);
    });
  });
});