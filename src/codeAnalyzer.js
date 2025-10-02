const fs = require('fs').promises;
const path = require('path');
const PythonParser = require('./pythonParser');
const JSParser = require('./jsParser');

/**
 * Code Analyzer
 * Analyzes code structure, metrics, and identifies improvement opportunities
 */
class CodeAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    // Use existing parsers (per README.md design specification)
    this.pythonParser = new PythonParser({ ...options, skipErrors: true });
    this.jsParser = new JSParser({ ...options, skipErrors: true });
  }

  /**
   * Analyze a file and return metrics and code smells
   * @param {string} filePath - Path to file
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeFile(filePath) {
    try {
      // Read file
      const code = await fs.readFile(filePath, 'utf-8');
      const language = this.detectLanguage(filePath);

      // Check file size limit (1,000 lines)
      const lineCount = this.getLineCount(code);
      if (lineCount > 1000) {
        throw new Error(`File too large (${lineCount} lines). Maximum: 1,000 lines.`);
      }

      // Get metrics (use parser for accurate function count)
      const functionCount = await this.getFunctionCount(code, language, filePath);
      const metrics = {
        language,
        lineCount,
        functionCount,
        complexity: this.getComplexity(code, language),
        averageLineLength: this.getAverageLineLength(code)
      };

      // Detect code smells
      const smells = {
        longFunctions: this.findLongFunctions(code, language),
        duplicateCode: this.findDuplicateCode(code),
        complexConditions: this.findComplexConditions(code, language),
        longLines: this.findLongLines(code)
      };

      return {
        filePath,
        code,
        metrics,
        smells,
        suggestions: this.generateSuggestions(metrics, smells)
      };
    } catch (error) {
      throw new Error(`Failed to analyze ${filePath}: ${error.message}`);
    }
  }

  /**
   * Detect programming language from file extension
   * @param {string} filePath - File path
   * @returns {string} Language name
   */
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap = {
      '.py': 'python',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rb': 'ruby',
      '.php': 'php'
    };
    
    return languageMap[ext] || 'unknown';
  }

  /**
   * Get line count
   * @param {string} code - Source code
   * @returns {number} Number of lines
   */
  getLineCount(code) {
    return code.split('\n').length;
  }

  /**
   * Get average line length
   * @param {string} code - Source code
   * @returns {number} Average line length
   */
  getAverageLineLength(code) {
    const lines = code.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return 0;
    
    const totalLength = lines.reduce((sum, line) => sum + line.length, 0);
    return Math.round(totalLength / lines.length);
  }

  /**
   * Get function count using proper AST parsers
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @param {string} filePath - File path for parser
   * @returns {Promise<number>} Number of functions
   */
  async getFunctionCount(code, language, filePath) {
    // Use proper parsers per design specification
    try {
      if (language === 'python' && filePath) {
        const parseResult = await this.pythonParser.parseFile(filePath);
        return parseResult.functions ? parseResult.functions.length : 0;
      } else if ((language === 'javascript' || language === 'typescript') && filePath) {
        const parseResult = await this.jsParser.parseFile(filePath);
        return parseResult.functions ? parseResult.functions.length : 0;
      }
    } catch (error) {
      // Fallback to regex if parser fails
      if (this.verbose) {
        console.log(`Parser failed, using regex fallback: ${error.message}`);
      }
    }
    
    // Fallback: simple pattern matching
    let pattern;
    switch (language) {
      case 'python':
        pattern = /^\s*def\s+\w+\s*\(/gm;
        break;
      case 'javascript':
      case 'typescript':
        pattern = /function\s+\w+\s*\(|const\s+\w+\s*=\s*\(|let\s+\w+\s*=\s*\(|var\s+\w+\s*=\s*\(/gm;
        break;
      default:
        return 0;
    }
    
    const matches = code.match(pattern);
    return matches ? matches.length : 0;
  }

  /**
   * Calculate cyclomatic complexity (simplified)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {number} Complexity score
   */
  getComplexity(code, language) {
    // Count decision points: if, for, while, case, &&, ||, ?
    const patterns = [
      /\bif\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /&&/g,
      /\|\|/g,
      /\?/g
    ];
    
    let complexity = 1; // Base complexity
    
    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }

  /**
   * Find long functions (> 50 lines)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Array} Long functions
   */
  findLongFunctions(code, language) {
    const longFunctions = [];
    const lines = code.split('\n');
    
    if (language === 'python') {
      // Find Python functions
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\s*def\s+(\w+)\s*\(/);
        if (match) {
          const functionName = match[1];
          const startLine = i + 1;
          const indent = lines[i].match(/^\s*/)[0].length;
          
          // Find end of function (next def or class at same/lower indent)
          let endLine = i + 1;
          for (let j = i + 1; j < lines.length; j++) {
            const currentIndent = lines[j].match(/^\s*/)[0].length;
            if (lines[j].trim() && currentIndent <= indent && 
                (lines[j].match(/^\s*def\s+/) || lines[j].match(/^\s*class\s+/))) {
              endLine = j;
              break;
            }
            endLine = j + 1;
          }
          
          const functionLength = endLine - startLine;
          if (functionLength > 50) {
            longFunctions.push({
              name: functionName,
              startLine,
              endLine,
              length: functionLength,
              reason: `Function is ${functionLength} lines long (> 50 lines)`
            });
          }
        }
      }
    }
    
    if (language === 'javascript' || language === 'typescript') {
      // Find JS/TS functions (simplified)
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*\(/);
        if (match) {
          const functionName = match[1] || match[2];
          const startLine = i + 1;
          
          // Find closing brace (simplified)
          let braceCount = 0;
          let endLine = i + 1;
          for (let j = i; j < lines.length; j++) {
            braceCount += (lines[j].match(/{/g) || []).length;
            braceCount -= (lines[j].match(/}/g) || []).length;
            if (braceCount === 0 && j > i) {
              endLine = j + 1;
              break;
            }
          }
          
          const functionLength = endLine - startLine;
          if (functionLength > 50) {
            longFunctions.push({
              name: functionName,
              startLine,
              endLine,
              length: functionLength,
              reason: `Function is ${functionLength} lines long (> 50 lines)`
            });
          }
        }
      }
    }
    
    return longFunctions;
  }

  /**
   * Find duplicate code (simple line-based detection)
   * @param {string} code - Source code
   * @returns {Array} Duplicate code blocks
   */
  findDuplicateCode(code) {
    const duplicates = [];
    const lines = code.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 20); // Only check substantial lines
    
    const lineCount = {};
    
    // Count occurrences
    lines.forEach((line, index) => {
      if (!lineCount[line]) {
        lineCount[line] = [];
      }
      lineCount[line].push(index + 1);
    });
    
    // Find duplicates (appears 2+ times)
    Object.entries(lineCount).forEach(([line, occurrences]) => {
      if (occurrences.length >= 2) {
        duplicates.push({
          line: line.substring(0, 50) + (line.length > 50 ? '...' : ''),
          occurrences: occurrences.length,
          lines: occurrences,
          reason: `Line appears ${occurrences.length} times`
        });
      }
    });
    
    return duplicates.slice(0, 5); // Return top 5
  }

  /**
   * Find complex conditions (nested if, long conditions)
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @returns {Array} Complex conditions
   */
  findComplexConditions(code, language) {
    const complexConditions = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      // Check for long conditions (> 80 chars)
      if (line.includes('if') && line.length > 80) {
        complexConditions.push({
          line: index + 1,
          code: line.trim().substring(0, 60) + '...',
          reason: 'Long condition (> 80 characters)',
          type: 'long'
        });
      }
      
      // Check for multiple conditions (3+ && or ||)
      const andCount = (line.match(/&&/g) || []).length;
      const orCount = (line.match(/\|\|/g) || []).length;
      if (andCount + orCount >= 3) {
        complexConditions.push({
          line: index + 1,
          code: line.trim().substring(0, 60) + '...',
          reason: `Multiple conditions (${andCount + orCount} operators)`,
          type: 'multiple'
        });
      }
    });
    
    return complexConditions.slice(0, 5); // Return top 5
  }

  /**
   * Find long lines (> 100 characters)
   * @param {string} code - Source code
   * @returns {Array} Long lines
   */
  findLongLines(code) {
    const longLines = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      if (line.length > 100) {
        longLines.push({
          line: index + 1,
          length: line.length,
          preview: line.substring(0, 60) + '...',
          reason: `Line is ${line.length} characters (> 100)`
        });
      }
    });
    
    return longLines.slice(0, 10); // Return top 10
  }

  /**
   * Generate initial suggestions based on metrics and smells
   * @param {Object} metrics - Code metrics
   * @param {Object} smells - Code smells
   * @returns {Array} Suggestions
   */
  generateSuggestions(metrics, smells) {
    const suggestions = [];
    
    // High complexity
    if (metrics.complexity > 20) {
      suggestions.push({
        type: 'complexity',
        priority: 'high',
        message: `High complexity (${metrics.complexity}). Consider breaking down into smaller functions.`
      });
    }
    
    // Long functions
    if (smells.longFunctions.length > 0) {
      suggestions.push({
        type: 'long-function',
        priority: 'medium',
        message: `${smells.longFunctions.length} long function(s) found. Consider extracting smaller functions.`
      });
    }
    
    // Duplicate code
    if (smells.duplicateCode.length > 0) {
      suggestions.push({
        type: 'duplication',
        priority: 'medium',
        message: `${smells.duplicateCode.length} duplicate code pattern(s) found. Consider extracting to reusable functions.`
      });
    }
    
    // Complex conditions
    if (smells.complexConditions.length > 0) {
      suggestions.push({
        type: 'complex-condition',
        priority: 'low',
        message: `${smells.complexConditions.length} complex condition(s) found. Consider extracting to named functions.`
      });
    }
    
    return suggestions;
  }

  /**
   * Get code context around specific lines
   * @param {string} code - Source code
   * @param {number} startLine - Start line (1-indexed)
   * @param {number} endLine - End line (1-indexed)
   * @param {number} contextLines - Number of context lines before/after
   * @returns {Object} Code context
   */
  getCodeContext(code, startLine, endLine, contextLines = 3) {
    const lines = code.split('\n');
    
    const contextStart = Math.max(0, startLine - 1 - contextLines);
    const contextEnd = Math.min(lines.length, endLine + contextLines);
    
    return {
      before: lines.slice(contextStart, startLine - 1),
      target: lines.slice(startLine - 1, endLine),
      after: lines.slice(endLine, contextEnd),
      fullContext: lines.slice(contextStart, contextEnd)
    };
  }
}

module.exports = CodeAnalyzer;
