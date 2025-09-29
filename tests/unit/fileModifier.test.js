const FileModifier = require('../../src/fileModifier');
const fs = require('fs').promises;
const path = require('path');

describe('FileModifier', () => {
  let fileModifier;
  const testDir = path.join(__dirname, '../fixtures/file-modifier-test');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    
    fileModifier = new FileModifier({
      verbose: false,
      force: false
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('insertPythonDocstring', () => {
    test('should insert docstring after function definition', async () => {
      const testFile = path.join(testDir, 'test.py');
      const originalContent = `def calculate_sum(a, b):
    return a + b`;
      
      await fs.writeFile(testFile, originalContent, 'utf-8');
      
      const lines = originalContent.split('\n');
      const item = {
        type: 'function',
        name: 'calculate_sum',
        line: 1,
        docstring: '"""Calculate the sum of two numbers.\n\n    Args:\n        a (int): First number\n        b (int): Second number\n\n    Returns:\n        int: Sum of a and b\n    """',
        language: 'python'
      };
      
      const result = fileModifier.insertDocstringAtLine(lines, item, '\n');
      
      expect(result.success).toBe(true);
      expect(result.lines.length).toBeGreaterThanOrEqual(lines.length);
      expect(result.lines[1]).toContain('"""Calculate the sum');
    });

    test('should handle existing docstring with --force', async () => {
      const testFile = path.join(testDir, 'test.py');
      const originalContent = `def calculate_sum(a, b):
    """Old docstring."""
    return a + b`;
      
      await fs.writeFile(testFile, originalContent, 'utf-8');
      
      const lines = originalContent.split('\n');
      const item = {
        type: 'function',
        name: 'calculate_sum',
        line: 1,
        docstring: '"""New docstring."""',
        language: 'python'
      };
      
      const forceModifier = new FileModifier({
        verbose: false,
        force: true
      });
      
      const result = forceModifier.insertDocstringAtLine(lines, item, '\n');
      
      expect(result.success).toBe(true);
      expect(result.lines[1]).toContain('"""New docstring."""');
    });

    test('should skip existing docstring without --force', async () => {
      const testFile = path.join(testDir, 'test.py');
      const originalContent = `def calculate_sum(a, b):
    """Old docstring."""
    return a + b`;
      
      await fs.writeFile(testFile, originalContent, 'utf-8');
      
      const lines = originalContent.split('\n');
      const item = {
        type: 'function',
        name: 'calculate_sum',
        line: 1,
        docstring: '"""New docstring."""',
        language: 'python'
      };
      
      const result = fileModifier.insertDocstringAtLine(lines, item, '\n');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('insertJSDoc', () => {
    test('should insert JSDoc before function declaration', async () => {
      const testFile = path.join(testDir, 'test.js');
      const originalContent = `function calculateSum(a, b) {
    return a + b;
}`;
      
      await fs.writeFile(testFile, originalContent, 'utf-8');
      
      const lines = originalContent.split('\n');
      const item = {
        type: 'function',
        name: 'calculateSum',
        line: 1,
        docstring: '/**\n * Calculate the sum of two numbers.\n * @param {number} a - First number\n * @param {number} b - Second number\n * @returns {number} Sum of a and b\n */',
        language: 'javascript'
      };
      
      const result = fileModifier.insertDocstringAtLine(lines, item, '\n');
      
      expect(result.success).toBe(true);
      expect(result.lines[0]).toContain('/**');
      // Check that the docstring content is in the result
      const docstringLine = result.lines.find(line => line.includes('Calculate the sum'));
      expect(docstringLine).toBeDefined();
    });
  });

  describe('formatDocstring', () => {
    test('should format Python docstring correctly', () => {
      const docstring = '"""Calculate sum.\n\n    Args:\n        a: First number\n        b: Second number\n\n    Returns:\n        Sum of a and b\n    """';
      const result = fileModifier.formatDocstring(docstring, 'python', 'def test():');
      
      expect(result).toContain('"""');
      expect(result).toContain('Calculate sum');
    });

    test('should format JSDoc correctly', () => {
      const docstring = '/**\n * Calculate sum.\n * @param {number} a - First number\n * @param {number} b - Second number\n * @returns {number} Sum\n */';
      const result = fileModifier.formatDocstring(docstring, 'javascript', 'function test() {');
      
      expect(result).toContain('/**');
      expect(result).toContain('Calculate sum');
    });
  });

  describe('extractIndentation', () => {
    test('should extract indentation from line', () => {
      expect(fileModifier.extractIndentation('    def test():')).toBe('    ');
      expect(fileModifier.extractIndentation('\tdef test():')).toBe('\t');
      expect(fileModifier.extractIndentation('def test():')).toBe('');
    });
  });
});
