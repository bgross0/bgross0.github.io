// Test setup and configuration

// Mock browser globals for Node.js testing environment
global.window = {
  eventBus: {
    emit: jest.fn(),
    subscribe: jest.fn()
  }
};

global.document = {
  getElementById: jest.fn(),
  querySelector: jest.fn(),
  addEventListener: jest.fn()
};

// Load required modules
global.spanTables = require('../src/data/span-tables.js');
global.materials = require('../src/data/materials.js');
global.engineUtils = require('../src/js/engine/utils.js');

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn()
};