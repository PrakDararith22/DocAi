const { generateDocumentation } = require('../../src/index');
const fs = require('fs').promises;
const path = require('path');

// Mock the AI provider factory to return a fast mock provider
jest.mock('../../src/aiProviderFactory', () => ({
  createAIProvider: jest.fn(() => ({
    testConnection: jest.fn().mockResolvedValue({ success: true, message: 'Mock connection successful' }),
    generateDocumentation: jest.fn().mockResolvedValue({ 
      success: true, 
      text: '"""Mock generated docstring for performance testing."""' 
    }),
    getStatus: jest.fn().mockReturnValue({ hasApiKey: true })
  }))
}));

describe('Performance Tests', () => {
  const testProjectPath = path.join(__dirname, '../fixtures/performance-test');

  beforeAll(async () => {
    // Create test files for performance testing
    await fs.mkdir(testProjectPath, { recursive: true });
    
    // Create multiple test files
    for (let i = 0; i < 10; i++) {
      const content = `#!/usr/bin/env python3
"""
Performance test file ${i}
"""

def function_${i}_1(a, b):
    return a + b

def function_${i}_2(data):
    return data.upper()

class Processor_${i}:
    def __init__(self):
        self.data = []
    
    def process(self, item):
        self.data.append(item)
        return len(self.data)
`;
      await fs.writeFile(path.join(testProjectPath, `test_${i}.py`), content, 'utf-8');
    }
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Memory usage', () => {
    test('should stay under memory limit', async () => {
      const initialMemory = process.memoryUsage();
      
      const options = {
        project: testProjectPath,
        lang: 'py',
        lowLevel: true,
        inline: true,
        verbose: false,
        provider: 'gemini',
        gemini_api_key: 'test_key',
        maxMemory: 100 // 100MB limit
      };

      await generateDocumentation(options);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
      
      expect(memoryIncrease).toBeLessThan(100); // Should be under 100MB
    });
  });

  describe('Processing time', () => {
    test('should process files within reasonable time', async () => {
      const startTime = Date.now();
      
      const options = {
        project: testProjectPath,
        lang: 'py',
        lowLevel: true,
        inline: true,
        verbose: false,
        provider: 'gemini',
        gemini_api_key: 'test_key'
      };

      await generateDocumentation(options);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });

  describe('Concurrency', () => {
    test('should handle different concurrency levels', async () => {
      const concurrencyLevels = [1, 3, 5, 10];
      
      for (const concurrency of concurrencyLevels) {
        const startTime = Date.now();
        
        const options = {
          project: testProjectPath,
          lang: 'py',
          lowLevel: true,
          inline: true,
          verbose: false,
          provider: 'gemini',
        gemini_api_key: 'test_key',
          concurrency: concurrency
        };

        await generateDocumentation(options);
        
        const duration = Date.now() - startTime;
        console.log(`Concurrency ${concurrency}: ${duration}ms`);
        
        expect(duration).toBeLessThan(30000);
      }
    });
  });

  describe('Large file handling', () => {
    test('should handle large files', async () => {
      // Create a large file
      const largeFilePath = path.join(testProjectPath, 'large_file.py');
      let content = '#!/usr/bin/env python3\n"""Large file for testing"""\n\n';
      
      // Generate a large file with many functions
      for (let i = 0; i < 100; i++) {
        content += `def large_function_${i}(param1, param2, param3):
    """Large function ${i}"""
    result = param1 + param2 + param3
    for j in range(100):
        result += j
    return result

`;
      }
      
      await fs.writeFile(largeFilePath, content, 'utf-8');
      
      const startTime = Date.now();
      
      const options = {
        project: testProjectPath,
        lang: 'py',
        lowLevel: true,
        inline: true,
        verbose: false,
        provider: 'gemini',
        gemini_api_key: 'test_key'
      };

      await generateDocumentation(options);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      
      // Clean up large file
      await fs.unlink(largeFilePath);
    });
  });

  describe('Error recovery', () => {
    test('should continue processing after errors', async () => {
      // Create a file with syntax errors
      const errorFilePath = path.join(testProjectPath, 'error_file.py');
      const errorContent = `def invalid_syntax():
    if True
        return "error"
`;
      await fs.writeFile(errorFilePath, errorContent, 'utf-8');
      
      const options = {
        project: testProjectPath,
        lang: 'py',
        lowLevel: true,
        inline: true,
        verbose: false,
        provider: 'gemini',
        gemini_api_key: 'test_key',
        skipErrors: true
      };

      // Should not throw error
      await expect(generateDocumentation(options)).resolves.not.toThrow();
      
      // Clean up error file
      await fs.unlink(errorFilePath);
    });
  });
});
