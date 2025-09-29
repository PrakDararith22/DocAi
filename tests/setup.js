// Jest setup file
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.HF_TOKEN = 'test_token_for_testing';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Global test utilities
global.testUtils = {
  createTestFile: async (filePath, content) => {
    const fs = require('fs').promises;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  },
  
  cleanupTestFile: async (filePath) => {
    const fs = require('fs').promises;
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  },
  
  createTestProject: async (projectPath) => {
    const fs = require('fs').promises;
    await fs.mkdir(projectPath, { recursive: true });
  },
  
  cleanupTestProject: async (projectPath) => {
    const fs = require('fs').promises;
    try {
      await fs.rm(projectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
};
