const CodeAnalyzer = require('./codeAnalyzer');
const BackupManager = require('./backupManager');
const { createAIProvider } = require('./aiProviderFactory');
const LocalRefactorer = require('./localRefactorer');

/**
 * Code Refactorer
 * Main refactoring logic with AI-powered suggestions
 */
class CodeRefactorer {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.analyzer = new CodeAnalyzer(options);
    this.backupManager = new BackupManager(options);
    this.aiProvider = createAIProvider(options);
    this.localRefactorer = new LocalRefactorer(options);
  }

  /**
   * Main entry point - Refactor a file
   * @param {string} filePath - Path to file
   * @param {Array} focusAreas - Focus areas
   * @returns {Promise<Object>} Refactoring result
   */
  async refactorFile(filePath, focusAreas = ['all']) {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Read file
    const code = await fs.readFile(filePath, 'utf-8');
    const language = this.analyzer.detectLanguage(filePath);
    
    // Get suggestions
    const suggestions = await this.getSuggestions(code, language, focusAreas);
    
    return {
      filePath,
      language,
      code,
      suggestions
    };
  }

  /**
   * Get refactoring suggestions from AI
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @param {Array} focusAreas - Focus areas (performance, readability, etc.)
   * @param {string} filePath - File path (optional, for better analysis)
   * @returns {Promise<Array>} Refactoring suggestions
   */
  async getSuggestions(code, language, focusAreas = ['all'], filePath = null) {
    try {
      // Try AI first
      if (this.verbose) {
        console.log('🤖 Requesting AI suggestions...');
      }
      
      // Analyze code first - use filePath if available for proper parsing
      const analysis = filePath 
        ? await this.analyzer.analyzeFile(filePath)
        : { metrics: { language, lineCount: code.split('\n').length, functionCount: 0, complexity: 1 }, smells: {} };
      
      // Build AI prompt based on focus areas
      const prompt = this.buildPrompt(code, language, focusAreas, analysis);
      
      // Get AI response
      const response = await this.aiProvider.generateDocumentation(prompt);
      
      if (!response.success) {
        throw new Error(`AI provider error: ${response.error}`);
      }
      
      // Parse and validate response
      const suggestions = this.parseResponse(response.text);
      
      // Filter by focus areas and limit to 3-5
      const filtered = this.filterSuggestions(suggestions, focusAreas);
      
      return filtered.slice(0, 5); // Max 5 suggestions
    } catch (error) {
      // Fallback to local refactorer
      console.log('⚠️  AI provider failed, using local analysis...');
      
      try {
        const localSuggestions = await this.localRefactorer.getSuggestions(code, language, focusAreas, filePath);
        return localSuggestions;
      } catch (localError) {
        throw new Error(`Both AI and local refactoring failed: ${error.message}, ${localError.message}`);
      }
    }
  }

  /**
   * Build AI prompt based on focus areas
   * @param {string} code - Source code
   * @param {string} language - Programming language
   * @param {Array} focusAreas - Focus areas
   * @param {Object} analysis - Code analysis results
   * @returns {string} AI prompt
   */
  buildPrompt(code, language, focusAreas, analysis) {
    const focusDescription = this.getFocusDescription(focusAreas);
    const explainMode = this.options.explain ? '\n7. Include detailed "explanation" field with technical details' : '';
    
    const prompt = `You are an expert code refactoring assistant. Analyze this ${language} code and suggest refactorings.

FOCUS AREAS: ${focusDescription}

CODE TO ANALYZE:
\`\`\`${language}
${code}
\`\`\`

CODE METRICS:
- Lines: ${analysis.metrics.lineCount}
- Functions: ${analysis.metrics.functionCount}
- Complexity: ${analysis.metrics.complexity}

IMPORTANT INSTRUCTIONS:
1. Provide 3-5 specific, actionable refactoring suggestions
2. Focus ONLY on the specified areas: ${focusDescription}
3. Each suggestion must include exact line numbers and code
4. Respond ONLY with valid JSON (no markdown, no explanations outside JSON)
5. Preserve the original code's functionality
6. Keep suggestions focused and practical${explainMode}

REQUIRED JSON FORMAT:
{
  "suggestions": [
    {
      "id": 1,
      "type": "performance|readability|best-practice|design-pattern",
      "title": "Short description (max 60 chars)",
      "description": "Detailed explanation of the improvement",
      "impact": "high|medium|low",
      "lineStart": 10,
      "lineEnd": 15,
      "originalCode": "exact code from lines 10-15",
      "refactoredCode": "improved version of the code",
      "reason": "Why this improves the code (benefits)",
      "estimatedImprovement": "e.g., '2x faster', 'more readable', 'follows PEP8'"${this.options.explain ? ',\n      "explanation": "Technical details about why this works, how it improves performance/readability, what patterns it follows"' : ''}
    }
  ]
}

Respond with valid JSON only:`;

    return prompt;
  }

  /**
   * Get focus description for prompt
   * @param {Array} focusAreas - Focus areas
   * @returns {string} Description
   */
  getFocusDescription(focusAreas) {
    if (focusAreas.includes('all')) {
      return 'All types (performance, readability, best practices, design patterns)';
    }
    
    const descriptions = {
      'performance': 'Performance optimizations (speed, memory, efficiency)',
      'readability': 'Readability improvements (clarity, naming, structure)',
      'best-practices': 'Best practices (conventions, standards, patterns)',
      'design-patterns': 'Design patterns (SOLID, DRY, separation of concerns)'
    };
    
    return focusAreas.map(area => descriptions[area] || area).join(', ');
  }

  /**
   * Parse AI response and extract suggestions
   * @param {string} response - AI response
   * @returns {Array} Parsed suggestions
   */
  parseResponse(response) {
    try {
      // Try direct JSON parse
      const parsed = JSON.parse(response);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid response format: missing suggestions array');
      }
      
      // Validate each suggestion
      parsed.suggestions.forEach((suggestion, index) => {
        this.validateSuggestion(suggestion, index);
      });
      
      return parsed.suggestions;
    } catch (error) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            parsed.suggestions.forEach((suggestion, index) => {
              this.validateSuggestion(suggestion, index);
            });
            return parsed.suggestions;
          }
        } catch (e) {
          // Fall through to error
        }
      }
      
      // Try to extract any JSON object
      const anyJsonMatch = response.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
      if (anyJsonMatch) {
        try {
          const parsed = JSON.parse(anyJsonMatch[0]);
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
            parsed.suggestions.forEach((suggestion, index) => {
              this.validateSuggestion(suggestion, index);
            });
            return parsed.suggestions;
          }
        } catch (e) {
          // Fall through to error
        }
      }
      
      throw new Error(`Could not parse AI response as JSON: ${error.message}`);
    }
  }

  /**
   * Validate a single suggestion
   * @param {Object} suggestion - Suggestion object
   * @param {number} index - Suggestion index
   */
  validateSuggestion(suggestion, index) {
    const required = ['type', 'title', 'lineStart', 'lineEnd', 'originalCode', 'refactoredCode'];
    
    for (const field of required) {
      if (!suggestion[field]) {
        throw new Error(`Suggestion ${index + 1} missing required field: ${field}`);
      }
    }
    
    // Validate line numbers
    if (suggestion.lineStart < 1 || suggestion.lineEnd < suggestion.lineStart) {
      throw new Error(`Suggestion ${index + 1} has invalid line numbers`);
    }
    
    // Validate type
    const validTypes = ['performance', 'readability', 'best-practice', 'design-pattern'];
    if (!validTypes.includes(suggestion.type)) {
      throw new Error(`Suggestion ${index + 1} has invalid type: ${suggestion.type}`);
    }
    
    // Validate impact
    if (suggestion.impact && !['high', 'medium', 'low'].includes(suggestion.impact)) {
      suggestion.impact = 'medium'; // Default
    }
    
    // Ensure no actual change
    if (suggestion.originalCode.trim() === suggestion.refactoredCode.trim()) {
      throw new Error(`Suggestion ${index + 1} has no actual changes`);
    }
  }

  /**
   * Filter suggestions by focus areas
   * @param {Array} suggestions - All suggestions
   * @param {Array} focusAreas - Focus areas
   * @returns {Array} Filtered suggestions
   */
  filterSuggestions(suggestions, focusAreas) {
    if (focusAreas.includes('all')) {
      return suggestions;
    }
    
    return suggestions.filter(suggestion => {
      return focusAreas.includes(suggestion.type) || 
             focusAreas.includes(suggestion.type.replace('-', '_'));
    });
  }

  /**
   * Apply selected refactorings to code
   * @param {string} filePath - File path
   * @param {string} code - Original code
   * @param {Array} selectedSuggestions - Selected suggestions
   * @returns {Promise<Object>} Result
   */
  async applyRefactorings(filePath, code, selectedSuggestions) {
    try {
      // Create backup first
      if (this.verbose) {
        console.log('💾 Creating backup...');
      }
      await this.backupManager.createBackup(filePath);
      
      // Sort suggestions by line number (bottom to top to preserve line numbers)
      const sorted = [...selectedSuggestions].sort((a, b) => b.lineStart - a.lineStart);
      
      let modifiedCode = code;
      const applied = [];
      const failed = [];
      
      // Apply each refactoring
      for (const suggestion of sorted) {
        try {
          modifiedCode = this.applySingleRefactoring(modifiedCode, suggestion);
          applied.push(suggestion);
        } catch (error) {
          failed.push({
            suggestion,
            error: error.message
          });
        }
      }
      
      return {
        success: failed.length === 0,
        modifiedCode,
        applied,
        failed
      };
    } catch (error) {
      throw new Error(`Failed to apply refactorings: ${error.message}`);
    }
  }

  /**
   * Apply a single refactoring
   * @param {string} code - Current code
   * @param {Object} suggestion - Suggestion to apply
   * @returns {string} Modified code
   */
  applySingleRefactoring(code, suggestion) {
    const lines = code.split('\n');
    
    // Validate line numbers
    if (suggestion.lineStart < 1 || suggestion.lineEnd > lines.length) {
      throw new Error(`Invalid line numbers: ${suggestion.lineStart}-${suggestion.lineEnd}`);
    }
    
    // Get original lines
    const startIndex = suggestion.lineStart - 1;
    const endIndex = suggestion.lineEnd;
    const originalLines = lines.slice(startIndex, endIndex);
    
    // Detect indentation from first line
    const indentation = this.getIndentation(originalLines[0]);
    
    // Apply indentation to refactored code
    const refactoredLines = suggestion.refactoredCode.split('\n');
    const indentedRefactored = refactoredLines.map((line, index) => {
      // Keep empty lines empty
      if (line.trim() === '') return '';
      // First line keeps original indentation
      if (index === 0) return indentation + line.trimStart();
      // Other lines: detect relative indentation
      const relativeIndent = line.match(/^\s*/)[0];
      return indentation + relativeIndent + line.trimStart();
    });
    
    // Replace lines
    const before = lines.slice(0, startIndex);
    const after = lines.slice(endIndex);
    const result = [...before, ...indentedRefactored, ...after];
    
    return result.join('\n');
  }

  /**
   * Get indentation from a line
   * @param {string} line - Code line
   * @returns {string} Indentation string
   */
  getIndentation(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  /**
   * Validate syntax of refactored code
   * @param {string} code - Code to validate
   * @param {string} language - Programming language
   * @returns {Promise<boolean>} Is valid
   */
  async validateSyntax(code, language) {
    // For MVP, we'll do basic validation
    // Future: Use language-specific parsers
    
    if (language === 'python') {
      // Check for basic Python syntax issues
      const lines = code.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for unmatched brackets
        const openBrackets = (line.match(/\(/g) || []).length;
        const closeBrackets = (line.match(/\)/g) || []).length;
        if (openBrackets !== closeBrackets) {
          // This is OK if it spans multiple lines
          continue;
        }
        
        // Check for basic syntax errors
        if (line.trim().endsWith(':') && i < lines.length - 1) {
          const nextLine = lines[i + 1];
          if (nextLine.trim() && !nextLine.startsWith(' ') && !nextLine.startsWith('\t')) {
            return false; // Indentation error
          }
        }
      }
    }
    
    // Basic validation passed
    return true;
  }

  /**
   * Preview changes before applying
   * @param {string} originalCode - Original code
   * @param {string} refactoredCode - Refactored code
   * @param {Object} suggestion - Suggestion details
   * @returns {Object} Preview data
   */
  previewChanges(originalCode, refactoredCode, suggestion) {
    const originalLines = originalCode.split('\n');
    const refactoredLines = refactoredCode.split('\n');
    
    const startIndex = suggestion.lineStart - 1;
    const endIndex = suggestion.lineEnd;
    
    // Get context (3 lines before and after)
    const contextBefore = originalLines.slice(Math.max(0, startIndex - 3), startIndex);
    const contextAfter = originalLines.slice(endIndex, Math.min(originalLines.length, endIndex + 3));
    
    const original = originalLines.slice(startIndex, endIndex);
    const refactored = suggestion.refactoredCode.split('\n');
    
    return {
      contextBefore,
      original,
      refactored,
      contextAfter,
      lineStart: suggestion.lineStart,
      lineEnd: suggestion.lineEnd,
      type: suggestion.type,
      impact: suggestion.impact,
      reason: suggestion.reason
    };
  }
}

module.exports = CodeRefactorer;
