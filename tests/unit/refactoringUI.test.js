const RefactoringUI = require('../../src/refactoringUI');

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn()
}));

const inquirer = require('inquirer');

describe('RefactoringUI', () => {
  let ui;

  beforeEach(() => {
    ui = new RefactoringUI({ verbose: false });
    jest.clearAllMocks();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultUI = new RefactoringUI();
      expect(defaultUI.options).toBeDefined();
      expect(defaultUI.verbose).toBe(false);
    });

    test('should initialize with custom options', () => {
      const customUI = new RefactoringUI({ verbose: true });
      expect(customUI.verbose).toBe(true);
    });
  });

  describe('showSuggestions', () => {
    test('should display suggestions correctly', async () => {
      const suggestions = [
        {
          type: 'performance',
          description: 'Use list comprehension instead of for loop',
          impact: 'medium',
          reasoning: 'List comprehensions are more efficient',
          before: 'for i in range(len(data)):\n    result.append(data[i])',
          after: 'result = [x for x in data]',
          startLine: 5,
          endLine: 7
        },
        {
          type: 'readability',
          description: 'Simplify nested if statements',
          impact: 'high',
          reasoning: 'Reduces cognitive complexity',
          before: 'if a:\n    if b:\n        return c',
          after: 'if a and b:\n    return c',
          startLine: 10,
          endLine: 12
        }
      ];

      inquirer.prompt.mockResolvedValue({ selectedSuggestions: [0, 1] });

      const result = await ui.showSuggestions(suggestions);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    test('should handle empty suggestions array', async () => {
      const suggestions = [];

      const result = await ui.showSuggestions(suggestions);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    test('should handle user selecting no suggestions', async () => {
      const suggestions = [
        {
          type: 'performance',
          description: 'Test suggestion',
          impact: 'low',
          reasoning: 'Test reasoning',
          before: 'old code',
          after: 'new code',
          startLine: 1,
          endLine: 2
        }
      ];

      inquirer.prompt.mockResolvedValue({ selectedSuggestions: [] });

      const result = await ui.showSuggestions(suggestions);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('showPreview', () => {
    test('should display preview of changes', () => {
      const suggestion = {
        type: 'performance',
        description: 'Use list comprehension',
        impact: 'medium',
        reasoning: 'More efficient and pythonic',
        before: 'for i in range(len(data)):\n    result.append(data[i])',
        after: 'result = [x for x in data]',
        startLine: 5,
        endLine: 7
      };

      // Should not throw error
      expect(() => ui.showPreview(suggestion)).not.toThrow();
      expect(console.log).toHaveBeenCalled();
    });

    test('should handle suggestion without before/after code', () => {
      const suggestion = {
        type: 'performance',
        description: 'Test suggestion',
        impact: 'low',
        reasoning: 'Test reasoning'
      };

      // Should not throw error even with missing fields
      expect(() => ui.showPreview(suggestion)).not.toThrow();
    });
  });

  describe('confirmApply', () => {
    test('should confirm application of changes', async () => {
      const suggestions = [
        {
          type: 'performance',
          description: 'Test suggestion',
          impact: 'medium'
        }
      ];

      inquirer.prompt.mockResolvedValue({ confirm: true });

      const result = await ui.confirmApply(suggestions);
      
      expect(result).toBe(true);
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    test('should handle user declining to apply changes', async () => {
      const suggestions = [
        {
          type: 'readability',
          description: 'Test suggestion',
          impact: 'high'
        }
      ];

      inquirer.prompt.mockResolvedValue({ confirm: false });

      const result = await ui.confirmApply(suggestions);
      
      expect(result).toBe(false);
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    test('should handle empty suggestions array', async () => {
      const suggestions = [];

      const result = await ui.confirmApply(suggestions);
      
      expect(result).toBe(false);
    });
  });

  describe('showResults', () => {
    test('should display successful results', () => {
      const results = {
        success: true,
        appliedCount: 3,
        totalCount: 5,
        skippedCount: 2,
        filePath: 'test.py'
      };

      // Should not throw error
      expect(() => ui.showResults(results)).not.toThrow();
      expect(console.log).toHaveBeenCalled();
    });

    test('should display error results', () => {
      const results = {
        success: false,
        error: 'File not found',
        filePath: 'test.py'
      };

      // Should not throw error
      expect(() => ui.showResults(results)).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle results without file path', () => {
      const results = {
        success: true,
        appliedCount: 1,
        totalCount: 1
      };

      // Should not throw error
      expect(() => ui.showResults(results)).not.toThrow();
    });
  });

  describe('utility methods', () => {
    test('should show info messages', () => {
      ui.showInfo('Test info message');
      expect(console.log).toHaveBeenCalled();
    });

    test('should show warning messages', () => {
      ui.showWarning('Test warning message');
      expect(console.warn).toHaveBeenCalled();
    });

    test('should show error messages', () => {
      ui.showError('Test error message');
      expect(console.error).toHaveBeenCalled();
    });

    test('should show success messages', () => {
      ui.showSuccess('Test success message');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('formatting', () => {
    test('should format impact levels with colors', () => {
      const highImpact = ui.formatImpact('high');
      const mediumImpact = ui.formatImpact('medium');
      const lowImpact = ui.formatImpact('low');
      
      expect(typeof highImpact).toBe('string');
      expect(typeof mediumImpact).toBe('string');
      expect(typeof lowImpact).toBe('string');
    });

    test('should format suggestion types with colors', () => {
      const performance = ui.formatType('performance');
      const readability = ui.formatType('readability');
      const bestPractices = ui.formatType('best-practices');
      const design = ui.formatType('design');
      
      expect(typeof performance).toBe('string');
      expect(typeof readability).toBe('string');
      expect(typeof bestPractices).toBe('string');
      expect(typeof design).toBe('string');
    });

    test('should handle unknown impact levels', () => {
      const unknown = ui.formatImpact('unknown');
      expect(typeof unknown).toBe('string');
    });

    test('should handle unknown suggestion types', () => {
      const unknown = ui.formatType('unknown');
      expect(typeof unknown).toBe('string');
    });
  });
});

