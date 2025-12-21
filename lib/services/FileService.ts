/**
 * File service for downloading files in the browser
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Only handles file downloads
 * - Interface Segregation: Small, focused interface
 */



/**
 * Interface for file service
 */
export interface IFileService {
  /**
   * Download a blob as a file
   * @param blob File blob to download
   * @param filename Name for downloaded file
   * @returns Promise resolving to download result
   */
  downloadBlob(blob: Blob, filename: string): Promise<DownloadResult>;
  
  /**
   * Create a blob from text content
   * @param content Text content
   * @param mimeType MIME type for blob
   * @returns Blob containing the text
   */
  createTextBlob(content: string, mimeType?: string): Blob;
  
  /**
   * Read blob as text
   * @param blob Blob to read
   * @returns Promise resolving to text content
   */
  readBlobAsText(blob: Blob): Promise<string>;
}

/**
 * Result of a download operation
 */
export interface DownloadResult {
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Filename that was downloaded */
  filename?: string;
  /** File size in bytes */
  fileSize?: number;
}

/**
 * Browser-based file service implementation
 * Uses DOM APIs for file operations
 */
export class BrowserFileService implements IFileService {
  constructor() {
    // Check if we're in a browser environment
    if (typeof globalThis.window === 'undefined' || typeof globalThis.document === 'undefined') {
      throw new Error('FileService requires browser environment');
    }
  }

  /**
   * Download a blob as a file
   */
  async downloadBlob(blob: Blob, filename: string): Promise<DownloadResult> {
    try {
      // Validate inputs
      if (!blob || !(blob instanceof Blob)) {
        return {
          success: false,
          error: 'Invalid blob provided',
        };
      }
      
      if (!filename || typeof filename !== 'string') {
        return {
          success: false,
          error: 'Invalid filename provided',
        };
      }
      
      // Create download link
      const link = document.createElement('a');
      link.download = filename;
      link.href = URL.createObjectURL(blob);
      
      // Trigger download
      link.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(link.href), 0);
      
      return {
        success: true,
        filename,
        fileSize: blob.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown download error',
      };
    }
  }

  /**
   * Create a blob from text content
   */
  createTextBlob(content: string, mimeType: string = 'text/plain'): Blob {
    return new Blob([content], { type: mimeType });
  }

  /**
   * Read blob as text
   */
  readBlobAsText(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve(reader.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read blob as text'));
      };
      
      reader.readAsText(blob);
    });
  }
}

/**
 * Mock file service for testing
 */
export class MockFileService implements IFileService {
  private downloads: Array<{ filename: string; size: number }> = [];
  private shouldSucceed: boolean;

  constructor(shouldSucceed: boolean = true) {
    this.shouldSucceed = shouldSucceed;
  }

  async downloadBlob(_blob: Blob, filename: string): Promise<DownloadResult> {
    if (!this.shouldSucceed) {
      return {
        success: false,
        error: 'Mock download failure',
      };
    }
    
    this.downloads.push({ filename, size: 1024 }); // Mock 1KB file
    return {
      success: true,
      filename,
      fileSize: 1024,
    };
  }

  createTextBlob(content: string, mimeType?: string): Blob {
    return new Blob([content], { type: mimeType || 'text/plain' });
  }

  async readBlobAsText(blob: Blob): Promise<string> {
    // Mock implementation that reads blob content without FileReader
    return new Promise((resolve) => {
      // In test environment, extract content from blob
      // Use type assertions for test-specific properties
      const testBlob = blob as unknown as { _buffer?: Uint8Array; _data?: { _buffer?: Uint8Array } };
      if (testBlob._buffer) {
        resolve(Buffer.from(testBlob._buffer).toString('utf-8'));
      } else if (testBlob._data && testBlob._data._buffer) {
        resolve(Buffer.from(testBlob._data._buffer).toString('utf-8'));
      } else if (blob.size === 0) {
        resolve('');
      } else {
        // Fallback
        resolve('mock-text-content');
      }
    });
  }

  /**
   * Get download history (for testing)
   */
  getDownloadHistory(): Array<{ filename: string; size: number }> {
    return [...this.downloads];
  }

  /**
   * Clear download history (for testing)
   */
  clearDownloadHistory(): void {
    this.downloads = [];
  }
}

/**
 * Factory function to create file service
 */
export function createFileService(): IFileService {
  // In test environment, use mock service
  if (process.env.NODE_ENV === 'test') {
    return new MockFileService();
  }
  
  // Check if we're in a browser environment
  if (typeof globalThis.window === 'undefined' || typeof globalThis.document === 'undefined') {
    throw new Error('FileService requires browser environment');
  }
  
  return new BrowserFileService();
}