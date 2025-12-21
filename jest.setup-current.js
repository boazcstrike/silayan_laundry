// Jest setup file
require('@testing-library/jest-dom');

// Mock global objects for testing
// Preserve URL constructor but mock static methods
const OriginalURL = global.URL;
global.URL = OriginalURL;
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Add TextDecoder for blob reading in tests
global.TextDecoder = class TextDecoder {
  constructor() {}
  decode(buffer) {
    return Buffer.from(buffer).toString('utf-8');
  }
};

global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: '',
  font: '',
  drawImage: jest.fn(),
  fillText: jest.fn(),
}));

global.Image = class {
  constructor() {
    this.src = '';
    this.width = 800;
    this.height = 600;
    this.onload = null;
    this.onerror = null;
  }

  set src(value) {
    // Store the src
    this._src = value;
    
    // Automatically trigger onload after a short delay to simulate image loading
    if (this.onload) {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  }

  get src() {
    return this._src || '';
  }

  decode() {
    return Promise.resolve();
  }
};

global.FileReader = class {
  constructor() {
    this.result = null;
    this.onload = null;
    this.onerror = null;
    this.readyState = 0;
  }

  readAsText(blob) {
    this.readyState = 1; // LOADING
    setTimeout(() => {
      if (this.onload) {
        try {
          // Extract content from blob using the same logic as MockFileService
          const blobAny = blob;
          if (blobAny._buffer) {
            this.result = Buffer.from(blobAny._buffer).toString('utf-8');
          } else if (blobAny._data && blobAny._data._buffer) {
            this.result = Buffer.from(blobAny._data._buffer).toString('utf-8');
          } else if (blob.size === 0) {
            this.result = '';
          } else {
            // Fallback - read actual content if possible
            // Try to get the content from the blob's internal structure
            const parts = blobAny._parts || [];
            if (parts.length > 0 && typeof parts[0] === 'string') {
              this.result = parts[0];
            } else {
              this.result = 'mock-text-content';
            }
          }
          this.readyState = 2; // DONE
          this.onload();
        } catch (error) {
          if (this.onerror) this.onerror();
        }
      }
    }, 0);
  }
};

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock document.createElement for testing
const originalCreateElement = global.document.createElement;
global.document.createElement = jest.fn((tagName) => {
  if (tagName === 'canvas') {
    return {
      width: 800,
      height: 600,
      getContext: jest.fn(() => ({
        fillStyle: '',
        font: '',
        drawImage: jest.fn(),
        fillText: jest.fn(),
      })),
      toBlob: jest.fn((callback) => {
        callback(new Blob(['mock-image'], { type: 'image/png' }));
      }),
    };
  }
  
  if (tagName === 'a') {
    return {
      download: '',
      href: '',
      click: jest.fn(),
    };
  }
  
  return originalCreateElement.call(document, tagName);
});

// Mock console methods to keep test output clean
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// Mock window.location.reload for testing (assign if writable) - disabled due to conflicts
// try {
//   global.window.location.reload = jest.fn();
// } catch (e) {
//   // If assignment fails, try defineProperty with writable true
//   Object.defineProperty(global.window.location, 'reload', {
//     writable: true,
//     value: jest.fn(),
//   });
// }