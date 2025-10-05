const CodeRefactorer = require('../../src/codeRefactorer');
const path = require('path');
const fs = require('fs').promises;

// Mock the AI provider factory
jest.mock('../../src/aiProviderFactory', () => ({
  createAIProvider: jest.fn(() => ({
    testConnection: jest.fn().mockResolvedValue({ success: true, message: 'Mock connection successful' }),
    generateDocumentation: jest.fn().mockResolvedValue({ 
      success: true, 
      text: JSON.stringify({
        suggestions: [
          {
            type: 'performance',
            description: 'Use list comprehension instead of for loop',
            impact: 'medium',
            reasoning: 'List comprehensions are more efficient and pythonic',
            before: 'for i in range(len(data)):\n    if data[i] % 2 == 0:\n        result.append(data[i] * 2)',
            after: 'result = [x * 2 for x in data if x % 2 == 0]',
            startLine: 5,
            endLine: 8
          }
        ]
      })
    }),
    getStatus: jest.fn().mockReturnValue({ hasApiKey: true })
  }))
}));

describe('CodeRefactorer', () => {
  let refactorer;
  const testProjectPath = path.join(__dirname, '../fixtures/refactor-test');

  beforeAll(async () => {
    // Create test directory and files
    await fs.mkdir(testProjectPath, { recursive: true });
    
    const pythonTestCode = `#!/usr/bin/env python3
def inefficient_function(data):
    result = []
    for i in range(len(data)):
        if data[i] % 2 == 0:
            result.append(data[i] * 2)
    return result

def complex_function(a, b, c, d, e):
    if a > 0:
        if b > 0:
            if c > 0:
                return a + b + c + d + e
            else:
                return a + b + d + e
        else:
            return a + d + e
    else:
        return d + e
`;

    await fs.writeFile(path.join(testProjectPath, 'test_refactor.py'), pythonTestCode);
  });

  beforeEach(() => {
    refactorer = new CodeRefactorer({
      verbose: false,
      provider: 'gemini',
      gemini_api_key: 'test_key'
    });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultRefactorer = new CodeRefactorer();
      expect(defaultRefactorer.options).toBeDefined();
      expect(defaultRefactorer.analyzer).toBeDefined();
      expect(defaultRefactorer.aiAPI).toBeDefined();
    });

    test('should initialize with custom options', () => {
      const customOptions = {
        verbose: true,
        focusAreas: ['performance'],
        minImpact: 'high'
      };
      const customRefactorer = new CodeRefactorer(customOptions);
      expect(customRefactorer.options.verbose).toBe(true);
      expect(customRefactorer.options.focusAreas).toEqual(['performance']);
      expect(customRefactorer.options.minImpact).toBe('high');
    });
  });

  describe('refactorFile', () => {
    test('should refactor Python file successfully', async () => {
      const filePath = path.join(testProjectPath, 'test_refactor.py');
      const result = await refactorer.refactorFile(filePath);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    test('should handle non-existent files gracefully', async () => {
      const filePath = path.join(testProjectPath, 'non-existent.py');
      const result = await refactorer.refactorFile(filePath);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should filter suggestions by focus areas', async () => {
      refactorer.options.focusAreas = ['performance'];
      const filePath = path.join(testProjectPath, 'test_refactor.py');
      const result = await refactorer.refactorFile(filePath);
      
      expect(result.success).toBe(true);
      if (result.suggestions.length > 0) {
        result.suggestions.forEach(suggestion => {
          expect(['performance', 'all']).toContain(suggestion.type);
        });
      }
    });

    test('should filter suggestions by minimum impact', async () => {
      refactorer.options.minImpact = 'high';
      const filePath = path.join(testProjectPath, 'test_refactor.py');
      const result = await refactorer.refactorFile(filePath);
      
      expect(result.success).toBe(true);
      if (result.suggestions.length > 0) {
        result.suggestions.forEach(suggestion => {
          expect(['high']).toContain(suggestion.impact);
        });
      }
    });
  });

  describe('getSuggestions', () => {
    test('should generate suggestions for code analysis', async () => {
      const analysis = {
        filePath: path.join(testProjectPath, 'test_refactor.py'),
        language: 'python',
        codeSmells: {
          longFunctions: [],
          complexFunctions: [
            {
              name: 'complex_function',
              complexity: 8,
              startLine: 9,
              endLine: 19
            }
          ],
          manyParameters: []
        },
        metrics: {
          lineCount: 20,
          functionCount: 2,
          classCount: 0
        }
      };

      const suggestions = await refactorer.getSuggestions(analysis, ['readability']);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should handle AI API errors gracefully', async () => {
      // Mock AI API to return error
      refactorer.aiAPI.generateDocumentation = jest.fn().mockResolvedValue({
        success: false,
        error: 'API Error'
      });

      const analysis = {
        filePath: 'test.py',
        language: 'python',
        codeSmells: { longFunctions: [], complexFunctions: [], manyParameters: [] },
        metrics: { lineCount: 10, functionCount: 1, classCount: 0 }
      };

      const suggestions = await refactorer.getSuggestions(analysis, ['performance']);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(0); // Should return empty array on error
    });
  });

  describe('applyRefactorings', () => {
    test('should apply refactoring suggestions to file', async () => {
      const filePath = path.join(testProjectPath, 'test_refactor.py');
      const suggestions = [
        {
          type: 'performance',
          description: 'Use list comprehension',
          startLine: 4,
          endLine: 6,
          before: '    for i in range(len(data)):\n        if data[i] % 2 == 0:\n            result.append(data[i] * 2)',
          after: '    result = [x * 2 for x in data if x % 2 == 0]'
        }
      ];

      const result = await refactorer.applyRefactorings(filePath, suggestions);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.appliedCount).toBeDefined();
      expect(typeof result.appliedCount).toBe('number');
    });

    test('should handle file modification errors gracefully', async () => {
      const filePath = '/non/existent/file.py';
      const suggestions = [
        {
          type: 'performance',
          description: 'Test suggestion',
          startLine: 1,
          endLine: 2,
          before: 'old code',
          after: 'new code'
        }
      ];

      const result = await refactorer.applyRefactorings(filePath, suggestions);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('prompt generation', () => {
    test('should create performance refactoring prompt', () => {
      const analysis = {
        filePath: 'test.py',
        language: 'python',
        codeSmells: { longFunctions: [], complexFunctions: [], manyParameters: [] },
        metrics: { lineCount: 10, functionCount: 1, classCount: 0 }
      };

      const prompt = refactorer.createRefactoringPrompt(analysis, ['performance']);
      
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('performance');
      expect(prompt).toContain('python');
    });

    test('should create readability refactoring prompt', () => {
      const analysis = {
        filePath: 'test.js',
        language: 'javascript',
        codeSmells: { longFunctions: [], complexFunctions: [], manyParameters: [] },
        metrics: { lineCount: 15, functionCount: 2, classCount: 1 }
      };

      const prompt = refactorer.createRefactoringPrompt(analysis, ['readability']);
      
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt).toContain('readability');
      expect(prompt).toContain('javascript');
    });
  });

  describe('suggestion filtering', () => {
    test('should filter suggestions by impact level', () => {
      const suggestions = [
        { impact: 'low', type: 'performance' },
        { impact: 'medium', type: 'readability' },
        { impact: 'high', type: 'best-practices' }
      ];

      const filtered = refactorer.filterSuggestionsByImpact(suggestions, 'medium');
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(s => ['medium', 'high'].includes(s.impact))).toBe(true);
    });

    test('should filter suggestions by focus areas', () => {
      const suggestions = [
        { type: 'performance', impact: 'medium' },
        { type: 'readability', impact: 'high' },
        { type: 'best-practices', impact: 'low' }
      ];

      const filtered = refactorer.filterSuggestionsByFocus(suggestions, ['performance', 'readability']);
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(s => ['performance', 'readability'].includes(s.type))).toBe(true);
    });
  });
});

