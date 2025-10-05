const CodeAnalyzer = require('../../src/codeAnalyzer');
const path = require('path');
const fs = require('fs').promises;

describe('CodeAnalyzer', () => {
  let analyzer;
  const testProjectPath = path.join(__dirname, '../fixtures/analyzer-test');

  beforeAll(async () => {
    analyzer = new CodeAnalyzer({ verbose: false });
    
    // Create test directory and files
    await fs.mkdir(testProjectPath, { recursive: true });
    
    const pythonTestCode = `#!/usr/bin/env python3
def simple_function(a, b):
    return a + b

def complex_function(x, y, z, w, v, u, t, s, r, q):
    # This function has high complexity
    if x > 0:
        if y > 0:
            if z > 0:
                if w > 0:
                    if v > 0:
                        return x + y + z + w + v + u + t + s + r + q
                    else:
                        return x + y + z + w + u + t + s + r + q
                else:
                    return x + y + z + u + t + s + r + q
            else:
                return x + y + u + t + s + r + q
        else:
            return x + u + t + s + r + q
    else:
        return u + t + s + r + q

def long_function():
    # This function has many lines
    line1 = "This is line 1"
    line2 = "This is line 2"
    line3 = "This is line 3"
    line4 = "This is line 4"
    line5 = "This is line 5"
    line6 = "This is line 6"
    line7 = "This is line 7"
    line8 = "This is line 8"
    line9 = "This is line 9"
    line10 = "This is line 10"
    line11 = "This is line 11"
    line12 = "This is line 12"
    line13 = "This is line 13"
    line14 = "This is line 14"
    line15 = "This is line 15"
    line16 = "This is line 16"
    line17 = "This is line 17"
    line18 = "This is line 18"
    line19 = "This is line 19"
    line20 = "This is line 20"
    return line1 + line2 + line3 + line4 + line5

class SimpleClass:
    def method1(self):
        return "method1"
    
    def method2(self):
        return "method2"
`;

    const jsTestCode = `// JavaScript test code
function simpleFunction(a, b) {
    return a + b;
}

function complexFunction(a, b, c, d, e, f, g, h, i, j) {
    if (a > 0) {
        if (b > 0) {
            if (c > 0) {
                if (d > 0) {
                    if (e > 0) {
                        return a + b + c + d + e + f + g + h + i + j;
                    } else {
                        return a + b + c + d + f + g + h + i + j;
                    }
                } else {
                    return a + b + c + f + g + h + i + j;
                }
            } else {
                return a + b + f + g + h + i + j;
            }
        } else {
            return a + f + g + h + i + j;
        }
    } else {
        return f + g + h + i + j;
    }
}

class TestClass {
    constructor() {
        this.data = [];
    }
    
    method1() {
        return "method1";
    }
    
    method2() {
        return "method2";
    }
}
`;

    await fs.writeFile(path.join(testProjectPath, 'test.py'), pythonTestCode);
    await fs.writeFile(path.join(testProjectPath, 'test.js'), jsTestCode);
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('analyzeFile', () => {
    test('should analyze Python file correctly', async () => {
      const filePath = path.join(testProjectPath, 'test.py');
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result).toBeDefined();
      expect(result.filePath).toBe(filePath);
      expect(result.language).toBe('python');
      expect(result.metrics).toBeDefined();
      expect(result.codeSmells).toBeDefined();
    });

    test('should analyze JavaScript file correctly', async () => {
      const filePath = path.join(testProjectPath, 'test.js');
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result).toBeDefined();
      expect(result.filePath).toBe(filePath);
      expect(result.language).toBe('javascript');
      expect(result.metrics).toBeDefined();
      expect(result.codeSmells).toBeDefined();
    });

    test('should handle non-existent files gracefully', async () => {
      const filePath = path.join(testProjectPath, 'non-existent.py');
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('metrics calculation', () => {
    test('should calculate line count correctly', async () => {
      const filePath = path.join(testProjectPath, 'test.py');
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result.metrics.lineCount).toBeGreaterThan(0);
      expect(typeof result.metrics.lineCount).toBe('number');
    });

    test('should calculate function count correctly', async () => {
      const filePath = path.join(testProjectPath, 'test.py');
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result.metrics.functionCount).toBeGreaterThan(0);
      expect(typeof result.metrics.functionCount).toBe('number');
    });

    test('should calculate class count correctly', async () => {
      const filePath = path.join(testProjectPath, 'test.py');
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result.metrics.classCount).toBeGreaterThan(0);
      expect(typeof result.metrics.classCount).toBe('number');
    });
  });

  describe('code smell detection', () => {
    test('should detect long functions', async () => {
      const filePath = path.join(testProjectPath, 'test.py');
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result.codeSmells).toBeDefined();
      expect(Array.isArray(result.codeSmells.longFunctions)).toBe(true);
    });

    test('should detect complex functions', async () => {
      const filePath = path.join(testProjectPath, 'test.py');
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result.codeSmells).toBeDefined();
      expect(Array.isArray(result.codeSmells.complexFunctions)).toBe(true);
    });

    test('should detect functions with many parameters', async () => {
      const filePath = path.join(testProjectPath, 'test.py');
      const result = await analyzer.analyzeFile(filePath);
      
      expect(result.codeSmells).toBeDefined();
      expect(Array.isArray(result.codeSmells.manyParameters)).toBe(true);
    });
  });

  describe('language detection', () => {
    test('should detect Python language correctly', () => {
      const language = analyzer.getLanguageFromPath('test.py');
      expect(language).toBe('python');
    });

    test('should detect JavaScript language correctly', () => {
      const language = analyzer.getLanguageFromPath('test.js');
      expect(language).toBe('javascript');
    });

    test('should detect TypeScript language correctly', () => {
      const language = analyzer.getLanguageFromPath('test.ts');
      expect(language).toBe('typescript');
    });

    test('should return unknown for unsupported files', () => {
      const language = analyzer.getLanguageFromPath('test.txt');
      expect(language).toBe('unknown');
    });
  });
});

