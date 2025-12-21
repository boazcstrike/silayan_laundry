/**
 * Image generation service for the Silayan Laundry application
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Only handles image generation
 * - Open/Closed: Can be extended without modification
 * - Dependency Inversion: Depends on abstractions (interfaces)
 */

import { 
  LaundryCategory, 
  ItemCounts, 
  ImageGenerationOptions,
  ImageGenerationResult 
} from '@/lib/types/laundry';
import { 
  CANVAS_CONFIG, 
  FILE_PATHS, 
  IMAGE_GENERATION,
  ERROR_MESSAGES 
} from '@/lib/constants';

/**
 * Interface for image generation service
 * Allows for different implementations (e.g., Canvas, SVG, PDF)
 */
export interface IImageGenerator {
  /**
   * Generate an image with laundry counts overlaid on template
   * @param counts Item counts to render
   * @param categories Laundry categories with coordinates
   * @returns Promise resolving to image generation result
   */
  generateImage(
    counts: ItemCounts, 
    categories: LaundryCategory
  ): Promise<ImageGenerationResult>;
  
  /**
   * Validate if image generation is possible with current configuration
   * @returns Validation result
   */
  validateConfiguration(): { isValid: boolean; errors: string[] };
}

/**
 * Canvas-based image generator implementation
 * Uses HTML Canvas API to render text on template image
 */
export class CanvasImageGenerator implements IImageGenerator {
  private options: ImageGenerationOptions;

  constructor(options?: Partial<ImageGenerationOptions>) {
    this.options = {
      templatePath: FILE_PATHS.TEMPLATE_IMAGE,
      signaturePath: FILE_PATHS.SIGNATURE_IMAGE,
      fontSize: CANVAS_CONFIG.FONT_SIZE,
      fontFamily: CANVAS_CONFIG.FONT_FAMILY,
      textColor: CANVAS_CONFIG.TEXT_COLOR,
      ...options,
    };
  }

  /**
   * Generate an image with laundry counts
   */
  async generateImage(
    counts: ItemCounts, 
    categories: LaundryCategory
  ): Promise<ImageGenerationResult> {
    try {
      // Load template image
      const template = await this.loadImage(this.options.templatePath);
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = template.width;
      canvas.height = template.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Draw template
      ctx.drawImage(template, 0, 0);
      
      // Configure text rendering
      ctx.fillStyle = this.options.textColor || CANVAS_CONFIG.TEXT_COLOR;
      ctx.font = `${this.options.fontSize || CANVAS_CONFIG.FONT_SIZE}px ${this.options.fontFamily || CANVAS_CONFIG.FONT_FAMILY}`;
      
      // Draw today's date
      const today = new Date().toLocaleDateString('en-US');
      ctx.fillText(today, CANVAS_CONFIG.DATE_X, CANVAS_CONFIG.DATE_Y);
      
      // Draw item counts
      this.drawItemCounts(ctx, counts, categories);
      
      // Draw signature and date
      await this.drawSignature(ctx);
      
      // Convert to blob
      const blob = await this.canvasToBlob(canvas);
      
      return {
        success: true,
        image: blob,
        filename: this.generateFilename(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.IMAGE_GENERATION_FAILED,
      };
    }
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.options.templatePath) {
      errors.push('Template path is required');
    }
    
    if (!this.options.signaturePath) {
      errors.push('Signature path is required');
    }
    
    if (!this.options.fontSize || this.options.fontSize <= 0) {
      errors.push('Font size must be positive');
    }
    
    if (!this.options.fontFamily) {
      errors.push('Font family is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Draw item counts on canvas
   */
  private drawItemCounts(
    ctx: CanvasRenderingContext2D,
    counts: ItemCounts,
    categories: LaundryCategory
  ): void {
    const drawIfPositive = (value: number, x: number, y: number) => {
      if (value > 0) {
        ctx.fillText(String(value), x, y);
      }
    };

    // Draw counts for each category
    Object.values(categories).forEach(categoryItems => {
      categoryItems.forEach(item => {
        const count = counts[item.name] || 0;
        drawIfPositive(count, item.x, item.y);
      });
    });
  }

  /**
   * Draw signature on canvas
   */
  private async drawSignature(ctx: CanvasRenderingContext2D): Promise<void> {
    try {
      const signature = await this.loadImage(this.options.signaturePath);
      
      ctx.drawImage(
        signature,
        CANVAS_CONFIG.SIGNATURE_X,
        CANVAS_CONFIG.SIGNATURE_Y,
        signature.width * CANVAS_CONFIG.SIGNATURE_SCALE,
        signature.height * CANVAS_CONFIG.SIGNATURE_SCALE
      );
      
      // Draw date near signature
      const today = new Date().toLocaleDateString('en-US');
      ctx.fillText(today, CANVAS_CONFIG.SIGNATURE_DATE_X, CANVAS_CONFIG.SIGNATURE_DATE_Y);
    } catch (error) {
      console.warn('Failed to load signature image:', error);
      // Continue without signature - not a critical failure
    }
  }

  /**
   * Load image from URL
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * Convert canvas to blob
   */
  private canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(ERROR_MESSAGES.IMAGE_GENERATION_FAILED));
            return;
          }
          resolve(blob);
        },
        IMAGE_GENERATION.MIME_TYPE,
        IMAGE_GENERATION.QUALITY
      );
    });
  }

  /**
   * Generate filename for downloaded image
   */
  private generateFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
    
    return `${IMAGE_GENERATION.FILENAME_PREFIX}${timestamp}${IMAGE_GENERATION.FILENAME_EXTENSION}`;
  }
}

/**
 * Factory function to create image generator
 */
export function createImageGenerator(
  options?: Partial<ImageGenerationOptions>
): IImageGenerator {
  return new CanvasImageGenerator(options);
}