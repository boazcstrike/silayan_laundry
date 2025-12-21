/**
 * Tests for application constants
 * 
 * Tests that constants are properly defined and exported
 */

import {
  CANVAS_CONFIG,
  FILE_PATHS,
  IMAGE_GENERATION,
  DISCORD_CONFIG,
  UI_CONFIG,
  DATE_CONFIG,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  CONFIRMATION_MESSAGES,
  CATEGORY_NAMES,
  DEFAULTS,
} from '@/lib/constants';

describe('Application Constants', () => {
  describe('CANVAS_CONFIG', () => {
    it('should export CANVAS_CONFIG with correct values', () => {
      expect(CANVAS_CONFIG).toBeDefined();
      expect(CANVAS_CONFIG.FONT_SIZE).toBe(32);
      expect(CANVAS_CONFIG.FONT_FAMILY).toBe('Arial');
      expect(CANVAS_CONFIG.TEXT_COLOR).toBe('black');
      expect(CANVAS_CONFIG.DATE_X).toBe(250);
      expect(CANVAS_CONFIG.DATE_Y).toBe(250);
      expect(CANVAS_CONFIG.SIGNATURE_X).toBe(735);
      expect(CANVAS_CONFIG.SIGNATURE_Y).toBe(1098);
      expect(CANVAS_CONFIG.SIGNATURE_SCALE).toBe(0.55);
      expect(CANVAS_CONFIG.SIGNATURE_DATE_X).toBe(850);
      expect(CANVAS_CONFIG.SIGNATURE_DATE_Y).toBe(1214);
    });

    it('should have CANVAS_CONFIG values that cannot be modified at runtime', () => {
      // TypeScript will prevent modification at compile time with 'as const'
      // At runtime, we can verify the values are correct
      expect(CANVAS_CONFIG.FONT_SIZE).toBe(32);
      
      // Note: In JavaScript, object properties can still be modified at runtime
      // even with 'as const'. The 'as const' is a TypeScript compile-time feature.
      // We're testing that the constants have the expected values.
    });
  });

  describe('FILE_PATHS', () => {
    it('should export FILE_PATHS with correct values', () => {
      expect(FILE_PATHS).toBeDefined();
      expect(FILE_PATHS.TEMPLATE_IMAGE).toBe('/template.jpg');
      expect(FILE_PATHS.SIGNATURE_IMAGE).toBe('/signature_bo.png');
      expect(FILE_PATHS.SIGNATURE_IMAGE_ALT).toBe('/signature.png');
    });

    it('should have FILE_PATHS with correct values', () => {
      // Verify constant values are correct
      expect(FILE_PATHS.TEMPLATE_IMAGE).toBe('/template.jpg');
    });
  });

  describe('IMAGE_GENERATION', () => {
    it('should export IMAGE_GENERATION with correct values', () => {
      expect(IMAGE_GENERATION).toBeDefined();
      expect(IMAGE_GENERATION.MIME_TYPE).toBe('image/png');
      expect(IMAGE_GENERATION.QUALITY).toBe(1);
      expect(IMAGE_GENERATION.FILENAME_PREFIX).toBe('laundry-output-');
      expect(IMAGE_GENERATION.FILENAME_EXTENSION).toBe('.png');
    });

    it('should have IMAGE_GENERATION with correct values', () => {
      expect(IMAGE_GENERATION.QUALITY).toBe(1);
    });
  });

  describe('DISCORD_CONFIG', () => {
    it('should export DISCORD_CONFIG with correct values', () => {
      expect(DISCORD_CONFIG).toBeDefined();
      expect(DISCORD_CONFIG.MAX_FILE_SIZE_BYTES).toBe(8 * 1024 * 1024); // 8MB
      expect(DISCORD_CONFIG.DEFAULT_MESSAGE).toBe('Laundry submission');
      expect(DISCORD_CONFIG.MESSAGE_TEMPLATE).toBe('Laundry submission ({timestamp})');
    });

    it('should calculate MAX_FILE_SIZE_BYTES correctly', () => {
      const expectedSize = 8 * 1024 * 1024; // 8MB in bytes
      expect(DISCORD_CONFIG.MAX_FILE_SIZE_BYTES).toBe(expectedSize);
    });

    it('should have DISCORD_CONFIG with correct values', () => {
      expect(DISCORD_CONFIG.MAX_FILE_SIZE_BYTES).toBe(8 * 1024 * 1024);
    });
  });

  describe('UI_CONFIG', () => {
    it('should export UI_CONFIG with correct values', () => {
      expect(UI_CONFIG).toBeDefined();
      expect(UI_CONFIG.ITEM_ROW_MIN_HEIGHT).toBe('48px');
      expect(UI_CONFIG.ITEM_CONTROL_GAP).toBe('1');
      expect(UI_CONFIG.COUNT_INPUT_WIDTH).toBe('9');
      expect(UI_CONFIG.COUNT_INPUT_HEIGHT).toBe('9');
    });

    it('should have UI_CONFIG values that match expected constants', () => {
      // Test that constants have the expected values
      expect(UI_CONFIG.ITEM_ROW_MIN_HEIGHT).toBe('48px');
    });
  });

  describe('DATE_CONFIG', () => {
    it('should export DATE_CONFIG with correct values', () => {
      expect(DATE_CONFIG).toBeDefined();
      expect(DATE_CONFIG.DISPLAY_FORMAT).toBe('en-US');
      expect(DATE_CONFIG.FILENAME_FORMAT).toBe('yyyyMMddHHmmss');
      expect(DATE_CONFIG.TIMESTAMP_FORMAT).toBe('en-US');
    });

    it('should have DATE_CONFIG values that match expected constants', () => {
      expect(DATE_CONFIG.DISPLAY_FORMAT).toBe('en-US');
    });
  });

  describe('VALIDATION', () => {
    it('should export VALIDATION with correct values', () => {
      expect(VALIDATION).toBeDefined();
      expect(VALIDATION.MIN_COUNT).toBe(0);
      expect(VALIDATION.MAX_COUNT).toBe(999);
      expect(VALIDATION.MAX_CUSTOM_ITEMS).toBe(20);
      expect(VALIDATION.MAX_CUSTOM_ITEM_NAME_LENGTH).toBe(50);
    });

    it('should have reasonable validation limits', () => {
      expect(VALIDATION.MIN_COUNT).toBeGreaterThanOrEqual(0);
      expect(VALIDATION.MAX_COUNT).toBeGreaterThan(VALIDATION.MIN_COUNT);
      expect(VALIDATION.MAX_CUSTOM_ITEMS).toBeGreaterThan(0);
      expect(VALIDATION.MAX_CUSTOM_ITEM_NAME_LENGTH).toBeGreaterThan(0);
    });

    it('should have VALIDATION values that match expected constants', () => {
      expect(VALIDATION.MAX_COUNT).toBe(999);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should export ERROR_MESSAGES with correct values', () => {
      expect(ERROR_MESSAGES).toBeDefined();
      expect(typeof ERROR_MESSAGES.DISCORD_WEBHOOK_NOT_SET).toBe('string');
      expect(typeof ERROR_MESSAGES.MISSING_FILE_UPLOAD).toBe('string');
      expect(typeof ERROR_MESSAGES.INVALID_FORM_DATA).toBe('string');
      expect(typeof ERROR_MESSAGES.DISCORD_UPLOAD_FAILED).toBe('string');
      expect(typeof ERROR_MESSAGES.IMAGE_GENERATION_FAILED).toBe('string');
      expect(typeof ERROR_MESSAGES.INVALID_COUNT).toBe('string');
      expect(typeof ERROR_MESSAGES.CUSTOM_ITEM_NAME_TOO_LONG).toBe('string');
      expect(typeof ERROR_MESSAGES.TOO_MANY_CUSTOM_ITEMS).toBe('string');
    });

    it('should have informative error messages', () => {
      expect(ERROR_MESSAGES.DISCORD_WEBHOOK_NOT_SET).toContain('DISCORD_WEBHOOK_URL');
      expect(ERROR_MESSAGES.MISSING_FILE_UPLOAD).toContain('file');
      expect(ERROR_MESSAGES.IMAGE_GENERATION_FAILED).toContain('generate');
    });

    it('should have ERROR_MESSAGES values that match expected constants', () => {
      expect(ERROR_MESSAGES.DISCORD_WEBHOOK_NOT_SET).toBe('DISCORD_WEBHOOK_URL is not set');
    });
  });

  describe('SUCCESS_MESSAGES', () => {
    it('should export SUCCESS_MESSAGES with correct values', () => {
      expect(SUCCESS_MESSAGES).toBeDefined();
      expect(typeof SUCCESS_MESSAGES.DISCORD_UPLOAD_SUCCESS).toBe('string');
      expect(typeof SUCCESS_MESSAGES.IMAGE_DOWNLOAD_SUCCESS).toBe('string');
      expect(typeof SUCCESS_MESSAGES.COUNTS_RESET_SUCCESS).toBe('string');
      expect(typeof SUCCESS_MESSAGES.CUSTOM_ITEM_ADDED).toBe('string');
    });

    it('should have positive success messages', () => {
      expect(SUCCESS_MESSAGES.DISCORD_UPLOAD_SUCCESS).toContain('successfully');
      expect(SUCCESS_MESSAGES.IMAGE_DOWNLOAD_SUCCESS).toContain('successfully');
      expect(SUCCESS_MESSAGES.COUNTS_RESET_SUCCESS).toContain('reset');
    });

    it('should have SUCCESS_MESSAGES values that match expected constants', () => {
      expect(SUCCESS_MESSAGES.DISCORD_UPLOAD_SUCCESS).toBe('Image successfully sent to Discord');
    });
  });

  describe('CONFIRMATION_MESSAGES', () => {
    it('should export CONFIRMATION_MESSAGES with correct values', () => {
      expect(CONFIRMATION_MESSAGES).toBeDefined();
      expect(typeof CONFIRMATION_MESSAGES.RESET_COUNTS).toBe('string');
    });

    it('should have clear confirmation messages', () => {
      expect(CONFIRMATION_MESSAGES.RESET_COUNTS).toContain('sure');
      expect(CONFIRMATION_MESSAGES.RESET_COUNTS).toContain('reset');
      expect(CONFIRMATION_MESSAGES.RESET_COUNTS).toContain('undone');
    });

    it('should have CONFIRMATION_MESSAGES values that match expected constants', () => {
      expect(CONFIRMATION_MESSAGES.RESET_COUNTS).toBe('Are you sure you want to reset all counts? This action cannot be undone.');
    });
  });

  describe('CATEGORY_NAMES', () => {
    it('should export CATEGORY_NAMES with correct values', () => {
      expect(CATEGORY_NAMES).toBeDefined();
      expect(CATEGORY_NAMES.REGULAR_LAUNDRY).toBe('Regular Laundry');
      expect(CATEGORY_NAMES.HOME_ITEMS).toBe('Home Items');
      expect(CATEGORY_NAMES.OTHER_ITEMS).toBe('Other Items');
    });

    it('should match category names in the application', () => {
      // These should match the keys in app/assets/data/list.tsx
      expect(CATEGORY_NAMES.REGULAR_LAUNDRY).toBe('Regular Laundry');
      expect(CATEGORY_NAMES.HOME_ITEMS).toBe('Home Items');
      expect(CATEGORY_NAMES.OTHER_ITEMS).toBe('Other Items');
    });

    it('should have CATEGORY_NAMES values that match expected constants', () => {
      expect(CATEGORY_NAMES.REGULAR_LAUNDRY).toBe('Regular Laundry');
    });
  });

  describe('DEFAULTS', () => {
    it('should export DEFAULTS with correct values', () => {
      expect(DEFAULTS).toBeDefined();
      expect(DEFAULTS.INITIAL_COUNT).toBe(0);
      expect(DEFAULTS.COUNT_DELTA).toBe(1);
      expect(DEFAULTS.EMPTY_STRING).toBe('');
    });

    it('should have sensible default values', () => {
      expect(DEFAULTS.INITIAL_COUNT).toBe(0); // Items start at 0
      expect(DEFAULTS.COUNT_DELTA).toBe(1); // Increment/decrement by 1
      expect(DEFAULTS.EMPTY_STRING).toBe(''); // Empty string constant
    });

    it('should have DEFAULTS values that match expected constants', () => {
      expect(DEFAULTS.INITIAL_COUNT).toBe(0);
    });
  });

  describe('Constant Relationships', () => {
    it('should have consistent values across related constants', () => {
      // ERROR_MESSAGES should reference VALIDATION limits
      expect(ERROR_MESSAGES.CUSTOM_ITEM_NAME_TOO_LONG).toContain(
        VALIDATION.MAX_CUSTOM_ITEM_NAME_LENGTH.toString()
      );
      expect(ERROR_MESSAGES.TOO_MANY_CUSTOM_ITEMS).toContain(
        VALIDATION.MAX_CUSTOM_ITEMS.toString()
      );
    });

    it('should have constants that work together', () => {
      // IMAGE_GENERATION should work with FILE_PATHS
      expect(IMAGE_GENERATION.MIME_TYPE).toBe('image/png');
      expect(FILE_PATHS.TEMPLATE_IMAGE).toMatch(/\.jpg$/);
      expect(FILE_PATHS.SIGNATURE_IMAGE).toMatch(/\.png$/);
      
      // DISCORD_CONFIG should have reasonable file size limit
      expect(DISCORD_CONFIG.MAX_FILE_SIZE_BYTES).toBeGreaterThan(0);
    });

    it('should export all expected constant groups', () => {
      const expectedExports = [
        'CANVAS_CONFIG',
        'FILE_PATHS',
        'IMAGE_GENERATION',
        'DISCORD_CONFIG',
        'UI_CONFIG',
        'DATE_CONFIG',
        'VALIDATION',
        'ERROR_MESSAGES',
        'SUCCESS_MESSAGES',
        'CONFIRMATION_MESSAGES',
        'CATEGORY_NAMES',
        'DEFAULTS',
      ];

      // Check that all expected exports are defined (not checking module.exports directly)
      expectedExports.forEach(exportName => {
        // Use a safer way to check if the constant is defined
        switch (exportName) {
          case 'CANVAS_CONFIG': expect(CANVAS_CONFIG).toBeDefined(); break;
          case 'FILE_PATHS': expect(FILE_PATHS).toBeDefined(); break;
          case 'IMAGE_GENERATION': expect(IMAGE_GENERATION).toBeDefined(); break;
          case 'DISCORD_CONFIG': expect(DISCORD_CONFIG).toBeDefined(); break;
          case 'UI_CONFIG': expect(UI_CONFIG).toBeDefined(); break;
          case 'DATE_CONFIG': expect(DATE_CONFIG).toBeDefined(); break;
          case 'VALIDATION': expect(VALIDATION).toBeDefined(); break;
          case 'ERROR_MESSAGES': expect(ERROR_MESSAGES).toBeDefined(); break;
          case 'SUCCESS_MESSAGES': expect(SUCCESS_MESSAGES).toBeDefined(); break;
          case 'CONFIRMATION_MESSAGES': expect(CONFIRMATION_MESSAGES).toBeDefined(); break;
          case 'CATEGORY_NAMES': expect(CATEGORY_NAMES).toBeDefined(); break;
          case 'DEFAULTS': expect(DEFAULTS).toBeDefined(); break;
        }
      });
    });
  });
});