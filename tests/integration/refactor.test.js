const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

describe('Refactor Integration Tests', () => {
  const cliPath = path.join(__dirname, '../../bin/docai.js');
  const testProjectPath = path.join(__dirname, '../fixtures/refactor-test');

  beforeAll(async () => {
    // Create test project directory
    await fs.mkdir(testProjectPath, { recursive: true });
    
    // Create test files for refactoring
    const pythonTestFile = `#!/usr/bin/env python3
"""
Test file for refactoring
"""

def inefficient_function(data):
    result = []
    for i in range(len(data)):
        if data[i] % 2 == 0:
            result.append(data[i] * 2)
    return result

def long_function_with_many_parameters(a, b, c, d, e, f, g, h, i, j):
    # This function has too many parameters
    total = a + b + c + d + e + f + g + h + i + j
    if total > 100:
        if total > 200:
            if total > 300:
                return "very high"
            else:
                return "high"
        else:
            return "medium"
    else:
        return "low"

class BadlyDesignedClass:
    def __init__(self):
        self.data = []
        self.count = 0
        self.total = 0
        
    def add_and_calculate(self, item):
        # This method does too many things
        self.data.append(item)
        self.count += 1
        self.total += item
        print(f"Added {item}, count: {self.count}, total: {self.total}")
        if self.count > 10:
            print("Warning: too many items")
        return self.total / self.count
`;

    const jsTestFile = `// Test JavaScript file for refactoring
function inefficientLoop(arr) {
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        for (var j = 0; j < arr.length; j++) {
            if (i !== j && arr[i] === arr[j]) {
                result.push(arr[i]);
            }
        }
    }
    return result;
}

function complexFunction(x, y, z) {
    if (x > 0) {
        if (y > 0) {
            if (z > 0) {
                if (x + y + z > 100) {
                    return "all positive and large sum";
                } else {
                    return "all positive and small sum";
                }
            } else {
                return "x and y positive, z negative";
            }
        } else {
            return "x positive, y negative";
        }
    } else {
        return "x negative";
    }
}

class PoorlyDesignedClass {
    constructor() {
        this.data = [];
        this.processedData = [];
        this.errors = [];
    }
    
    processEverything(input) {
        // This method does too many things
        try {
            this.data.push(input);
            let processed = input.toUpperCase();
            this.processedData.push(processed);
            console.log("Processed:", processed);
            return processed;
        } catch (error) {
            this.errors.push(error);
            console.error("Error:", error);
            return null;
        }
    }
}
`;

    await fs.writeFile(path.join(testProjectPath, 'test_refactor.py'), pythonTestFile);
    await fs.writeFile(path.join(testProjectPath, 'test_refactor.js'), jsTestFile);
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Command parsing', () => {
    test('should show help for refactor command', async () => {
      const result = await runCLI(['refactor', '--help']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Analyze and refactor code');
      expect(result.stdout).toContain('--perf');
      expect(result.stdout).toContain('--read');
      expect(result.stdout).toContain('--best');
      expect(result.stdout).toContain('--design');
    });

    test('should show refactor command in main help', async () => {
      const result = await runCLI(['--help']);
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('refactor');
    });
  });

  describe('Refactor mode flags', () => {
    test('should accept performance mode flag', async () => {
      const result = await runCLI(['refactor', '--perf', '--help']);
      expect(result.code).toBe(0);
    });

    test('should accept readability mode flag', async () => {
      const result = await runCLI(['refactor', '--read', '--help']);
      expect(result.code).toBe(0);
    });

    test('should accept best practices mode flag', async () => {
      const result = await runCLI(['refactor', '--best', '--help']);
      expect(result.code).toBe(0);
    });

    test('should accept design patterns mode flag', async () => {
      const result = await runCLI(['refactor', '--design', '--help']);
      expect(result.code).toBe(0);
    });
  });

  describe('File processing', () => {
    test('should process Python files for refactoring', async () => {
      // Set up Gemini environment for testing
      process.env.GOOGLE_API_KEY = 'test-gemini-key';
      
      const result = await runCLI([
        'refactor',
        '--perf',
        '--project', testProjectPath,
        'test_refactor.py'
      ], { cwd: testProjectPath });
      
      // Should complete without crashing (may show warnings about API)
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('DocAI Refactoring');
      
      delete process.env.GOOGLE_API_KEY;
    });

    test('should process JavaScript files for refactoring', async () => {
      // Set up Gemini environment for testing
      process.env.GOOGLE_API_KEY = 'test-gemini-key';
      
      const result = await runCLI([
        'refactor',
        '--read',
        '--project', testProjectPath,
        'test_refactor.js'
      ], { cwd: testProjectPath });
      
      // Should complete without crashing (may show warnings about API)
      expect(result.code).toBe(0);
      expect(result.stdout).toContain('DocAI Refactoring');
      
      delete process.env.GOOGLE_API_KEY;
    });
  });

  describe('Error handling', () => {
    test('should handle non-existent files gracefully', async () => {
      const result = await runCLI([
        'refactor',
        '--perf',
        'non_existent_file.py'
      ], { cwd: testProjectPath });
      
      // Should handle gracefully (may exit with error code but shouldn't crash)
      expect(result.stderr).not.toContain('TypeError');
      expect(result.stderr).not.toContain('ReferenceError');
    });

    test('should handle missing project directory', async () => {
      const result = await runCLI([
        'refactor',
        '--best',
        '--project', '/non/existent/directory',
        'test.py'
      ]);
      
      // Should handle gracefully
      expect(result.stderr).not.toContain('TypeError');
      expect(result.stderr).not.toContain('ReferenceError');
    });
  });

  // Helper function to run CLI commands
  function runCLI(args, options = {}) {
    return new Promise((resolve) => {
      const child = spawn('node', [cliPath, ...args], {
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr
        });
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill();
        resolve({
          code: -1,
          stdout,
          stderr: stderr + '\nTimeout after 10 seconds'
        });
      }, 10000);
    });
  }
});

