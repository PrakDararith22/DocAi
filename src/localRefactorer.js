const fs = require('fs').promises;

/**
 * Local Refactoring Engine
 * Provides code analysis and refactoring suggestions without AI
 */
class LocalRefactorer {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Analyze Python code and provide technical refactoring suggestions
   */
  async getSuggestions(code, language, focusAreas = ['all'], filePath = null) {
    if (language !== 'python' && language !== 'py') {
      return [];
    }

    const suggestions = [];
    const lines = code.split('\n');
    const functionLines = this.findFunctions(lines);

    // Check for performance improvements in algorithms
    this.checkAlgorithmOptimizations(lines, suggestions);
    
    // Check for redundant operations
    this.checkRedundantOperations(lines, suggestions);
    
    // Check for better data structures
    this.checkDataStructureOptimizations(lines, suggestions);
    
    // Check for code structure improvements
    this.checkStructureImprovements(lines, suggestions, functionLines);
    
    // Check for memory optimizations
    this.checkMemoryOptimizations(lines, suggestions);

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  checkAlgorithmOptimizations(lines, suggestions) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for inefficient string concatenation in loops
      if (line.includes('for ') && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.includes('+=') && nextLine.includes('"')) {
          suggestions.push({
            id: suggestions.length + 1,
            type: 'performance',
            title: 'Use list join instead of string concatenation',
            description: 'String concatenation in loops is inefficient. Use list.join() for better performance.',
            impact: 'high',
            lineStart: i + 1,
            lineEnd: i + 2,
            originalCode: `${line}\n    ${nextLine}`,
            refactoredCode: `${line}\n    # Use list comprehension and join for better performance\n    # result = ''.join([item for item in items])`,
            reason: 'String concatenation creates new objects each time, list.join() is O(n)',
            estimatedImprovement: '10x faster for large datasets'
          });
        }
      }
      
      // Check for nested loops that could be optimized
      if (line.includes('for ') && line.includes(' in ')) {
        let nestedLoopFound = false;
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].trim().includes('for ') && lines[j].trim().includes(' in ')) {
            nestedLoopFound = true;
            break;
          }
        }
        if (nestedLoopFound) {
          suggestions.push({
            id: suggestions.length + 1,
            type: 'performance',
            title: 'Consider optimizing nested loops',
            description: 'Nested loops can often be optimized using sets, dictionaries, or list comprehensions.',
            impact: 'medium',
            lineStart: i + 1,
            lineEnd: i + 1,
            originalCode: line,
            refactoredCode: '# Consider using set operations or dictionary lookups for O(1) access',
            reason: 'Nested loops are O(n²), can often be reduced to O(n)',
            estimatedImprovement: 'Significantly faster for large datasets'
          });
        }
      }
    }
  }

  checkRedundantOperations(lines, suggestions) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for redundant list() calls
      if (line.includes('list(') && line.includes('.split(')) {
        suggestions.push({
          id: suggestions.length + 1,
          type: 'performance',
          title: 'Remove redundant list() call',
          description: 'str.split() already returns a list, no need to wrap it in list().',
          impact: 'low',
          lineStart: i + 1,
          lineEnd: i + 1,
          originalCode: line,
          refactoredCode: line.replace(/list\(([^)]+\.split\([^)]*\))\)/, '$1'),
          reason: 'Eliminates unnecessary function call overhead',
          estimatedImprovement: 'Slightly faster execution'
        });
      }
      
      // Check for inefficient membership testing
      if (line.includes(' in [') || line.includes(' in (')) {
        suggestions.push({
          id: suggestions.length + 1,
          type: 'performance',
          title: 'Use set for membership testing',
          description: 'Membership testing in lists/tuples is O(n), use sets for O(1) lookup.',
          impact: 'medium',
          lineStart: i + 1,
          lineEnd: i + 1,
          originalCode: line,
          refactoredCode: line.replace(/in \[([^\]]+)\]/, 'in {$1}').replace(/in \(([^)]+)\)/, 'in {$1}'),
          reason: 'Set lookup is O(1) vs O(n) for lists',
          estimatedImprovement: 'Much faster for large collections'
        });
      }
    }
  }

  checkDataStructureOptimizations(lines, suggestions) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for dictionary get() usage
      if (line.includes('if ') && line.includes(' in ') && line.includes(':') && 
          i + 1 < lines.length && lines[i + 1].trim().includes('[')) {
        suggestions.push({
          id: suggestions.length + 1,
          type: 'readability',
          title: 'Use dict.get() with default value',
          description: 'Replace if-key-in-dict pattern with dict.get() for cleaner code.',
          impact: 'low',
          lineStart: i + 1,
          lineEnd: i + 2,
          originalCode: `${line}\n    ${lines[i + 1].trim()}`,
          refactoredCode: '# Use: value = dict.get(key, default_value)',
          reason: 'More Pythonic and reduces code complexity',
          estimatedImprovement: 'Cleaner, more readable code'
        });
      }
      
      // Check for collections.defaultdict opportunity
      if (line.includes('= {}') && i > 0) {
        let hasKeyCheck = false;
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
          if (lines[j].includes('if ') && lines[j].includes(' not in ')) {
            hasKeyCheck = true;
            break;
          }
        }
        if (hasKeyCheck) {
          suggestions.push({
            id: suggestions.length + 1,
            type: 'best-practice',
            title: 'Consider using collections.defaultdict',
            description: 'Use defaultdict to eliminate key existence checks.',
            impact: 'medium',
            lineStart: i + 1,
            lineEnd: i + 1,
            originalCode: line,
            refactoredCode: 'from collections import defaultdict\n# Use: dict_name = defaultdict(list)  # or int, set, etc.',
            reason: 'Eliminates need for key existence checks',
            estimatedImprovement: 'Cleaner code, fewer bugs'
          });
        }
      }
    }
  }

  checkStructureImprovements(lines, suggestions, functionLines) {
    // Check for functions that are too long
    for (const func of functionLines) {
      const funcLength = func.endLine - func.startLine;
      if (funcLength > 20) {
        suggestions.push({
          id: suggestions.length + 1,
          type: 'design-pattern',
          title: `Break down large function ${func.name}()`,
          description: `Function ${func.name} is ${funcLength} lines long. Consider breaking it into smaller functions.`,
          impact: 'medium',
          lineStart: func.startLine + 1,
          lineEnd: func.endLine + 1,
          originalCode: `# Function is ${funcLength} lines long`,
          refactoredCode: '# Break into smaller, focused functions with single responsibilities',
          reason: 'Smaller functions are easier to test, debug, and maintain',
          estimatedImprovement: 'Better maintainability and testability'
        });
      }
    }
    
    // Check for magic numbers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const magicNumbers = line.match(/\b(?!0|1)\d{2,}\b/g);
      if (magicNumbers && !line.includes('#') && !line.includes('range(')) {
        suggestions.push({
          id: suggestions.length + 1,
          type: 'best-practice',
          title: 'Replace magic numbers with named constants',
          description: `Line contains magic numbers: ${magicNumbers.join(', ')}. Use named constants instead.`,
          impact: 'low',
          lineStart: i + 1,
          lineEnd: i + 1,
          originalCode: line,
          refactoredCode: '# Define constants at module level: CONSTANT_NAME = value',
          reason: 'Named constants make code self-documenting and easier to maintain',
          estimatedImprovement: 'More maintainable code'
        });
      }
    }
  }

  checkMemoryOptimizations(lines, suggestions) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for list comprehensions that could be generators
      if (line.includes('[') && line.includes('for ') && line.includes(' in ') && 
          (line.includes('sum(') || line.includes('max(') || line.includes('min('))) {
        suggestions.push({
          id: suggestions.length + 1,
          type: 'performance',
          title: 'Use generator expression instead of list comprehension',
          description: 'For functions like sum(), max(), min(), use generator expressions to save memory.',
          impact: 'medium',
          lineStart: i + 1,
          lineEnd: i + 1,
          originalCode: line,
          refactoredCode: line.replace(/\[([^\]]+)\]/, '($1)'),
          reason: 'Generator expressions use less memory and can be faster',
          estimatedImprovement: 'Lower memory usage, potentially faster'
        });
      }
    }
  }

  findFunctions(lines) {
    const functions = [];
    let currentIndent = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (trimmed.startsWith('def ')) {
        const match = trimmed.match(/def\s+(\w+)\s*\(/);
        if (match) {
          const funcName = match[1];
          const indent = line.length - line.trimStart().length;
          
          // Find the end of the function
          let endLine = i;
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            const nextTrimmed = nextLine.trim();
            const nextIndent = nextLine.length - nextLine.trimStart().length;
            
            if (nextTrimmed && nextIndent <= indent) {
              endLine = j - 1;
              break;
            }
            if (j === lines.length - 1) {
              endLine = j;
            }
          }
          
          functions.push({
            name: funcName,
            startLine: i,
            endLine: endLine,
            indent: indent
          });
        }
      }
    }
    
    return functions;
  }

  hasDocstring(lines, funcStartLine) {
    // Check if the next non-empty line after function definition is a docstring
    for (let i = funcStartLine + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      return line.startsWith('"""') || line.startsWith("'''");
    }
    return false;
  }

  isEmpty(lines, startLine, endLine) {
    for (let i = startLine + 1; i <= endLine; i++) {
      const line = lines[i]?.trim();
      if (line && line !== 'pass') {
        return false;
      }
    }
    return true;
  }

  generateDocstring(funcName) {
    const descriptions = {
      'test_function': 'Test function placeholder.',
      'main': 'Main function entry point.',
      'init': 'Initialize the object.',
      'setup': 'Set up the environment.',
      'cleanup': 'Clean up resources.'
    };
    
    return descriptions[funcName] || `${funcName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} function.`;
  }

  suggestVariableName(singleLetter) {
    const suggestions = {
      'a': 'value',
      'b': 'result',
      'c': 'count',
      'd': 'data',
      'e': 'element',
      'f': 'file',
      'g': 'group',
      'h': 'height',
      'k': 'key',
      'l': 'length',
      'm': 'message',
      'o': 'object',
      'p': 'point',
      'q': 'query',
      'r': 'response',
      's': 'string',
      't': 'text',
      'u': 'user',
      'v': 'value',
      'w': 'width',
      'z': 'size'
    };
    
    return suggestions[singleLetter] || 'value';
  }
}

module.exports = LocalRefactorer;
