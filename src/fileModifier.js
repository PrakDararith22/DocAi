const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * Safe File Modifier
 * Handles safe insertion of docstrings while preserving code structure
 */
class FileModifier {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.force = options.force || false;
  }

  /**
   * Insert docstrings into files
   * @param {Array} generationResults - Results from DocumentationGenerator
   * @param {Object} backupManager - Backup manager instance
   * @returns {Promise<Object>} Modification results
   */
  async insertDocstrings(generationResults, backupManager) {
    const results = {
      successful: [],
      failed: [],
      summary: {
        totalFiles: 0,
        modifiedFiles: 0,
        skippedFiles: 0,
        errorFiles: 0
      }
    };

    // Group by file
    const filesToModify = this.groupByFile(generationResults.generated);
    results.summary.totalFiles = Object.keys(filesToModify).length;

    for (const [filePath, items] of Object.entries(filesToModify)) {
      try {
        const result = await this.modifyFile(filePath, items, backupManager);
        
        if (result.success) {
          results.successful.push(result);
          results.summary.modifiedFiles++;
        } else {
          results.failed.push(result);
          results.summary.errorFiles++;
        }
      } catch (error) {
        results.failed.push({
          filePath: filePath,
          success: false,
          error: error.message
        });
        results.summary.errorFiles++;
      }
    }

    if (this.verbose) {
      this.logModificationResults(results);
    }

    return results;
  }

  /**
   * Modify a single file with docstrings
   * @param {string} filePath - File path to modify
   * @param {Array} items - Items to insert (functions/classes)
   * @param {Object} backupManager - Backup manager instance
   * @returns {Promise<Object>} Modification result
   */
  async modifyFile(filePath, items, backupManager) {
    try {
      // Read original file
      const originalContent = await fs.readFile(filePath, 'utf-8');
      const lines = originalContent.split('\n');
      const lineEnding = this.detectLineEnding(originalContent);
      
      // Sort items by line number (descending) to avoid line number shifts
      const sortedItems = items.sort((a, b) => b.line - a.line);
      
      let modifiedLines = [...lines];
      let modifications = 0;

      for (const item of sortedItems) {
        const insertResult = this.insertDocstringAtLine(
          modifiedLines, 
          item, 
          lineEnding
        );
        
        if (insertResult.success) {
          modifiedLines = insertResult.lines;
          modifications++;
        }
      }

      if (modifications > 0) {
        // Write modified content atomically
        const modifiedContent = modifiedLines.join(lineEnding);
        await this.writeFileAtomically(filePath, modifiedContent);
        
        // Validate file integrity
        await this.validateFileIntegrity(filePath, originalContent);

        return {
          success: true,
          filePath: filePath,
          modifications: modifications,
          items: items.map(item => item.name)
        };
      } else {
        return {
          success: true,
          filePath: filePath,
          modifications: 0,
          message: 'No modifications needed'
        };
      }

    } catch (error) {
      // Restore from backup if modification failed
      if (backupManager.hasBackup(filePath)) {
        await backupManager.restoreFromBackup(filePath);
      }
      
      return {
        success: false,
        filePath: filePath,
        error: error.message
      };
    }
  }

  /**
   * Insert docstring at specific line
   * @param {Array} lines - File lines
   * @param {Object} item - Item to insert docstring for
   * @param {string} lineEnding - Line ending character
   * @returns {Object} Insertion result
   */
  insertDocstringAtLine(lines, item, lineEnding) {
    try {
      const lineIndex = item.line - 1; // Convert to 0-based index
      
      if (lineIndex < 0 || lineIndex >= lines.length) {
        return {
          success: false,
          error: `Invalid line number: ${item.line}`
        };
      }

      const targetLine = lines[lineIndex];
      const docstring = this.formatDocstring(item.docstring, item.language, targetLine);

      if (item.language === 'python') {
        return this.insertPythonDocstring(lines, lineIndex, docstring, item);
      } else if (item.language === 'javascript' || item.language === 'typescript') {
        return this.insertJSDoc(lines, lineIndex, docstring, item);
      } else {
        return {
          success: false,
          error: `Unsupported language: ${item.language}`
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Insert Python docstring
   * @param {Array} lines - File lines
   * @param {number} lineIndex - Line index
   * @param {string} docstring - Docstring content
   * @param {Object} item - Item information
   * @returns {Object} Insertion result
   */
  insertPythonDocstring(lines, lineIndex, docstring, item) {
    const targetLine = lines[lineIndex];
    const indent = this.extractIndentation(targetLine);
    
    // Find the end of the function/class definition
    let insertIndex = lineIndex + 1;
    
    // Skip empty lines and comments
    while (insertIndex < lines.length && 
           (lines[insertIndex].trim() === '' || lines[insertIndex].trim().startsWith('#'))) {
      insertIndex++;
    }

    // Check if docstring already exists
    if (insertIndex < lines.length && lines[insertIndex].trim().startsWith('"""')) {
      if (!this.force) {
        return {
          success: false,
          error: 'Docstring already exists (use --force to replace)'
        };
      }
      
      // Remove existing docstring
      const endIndex = this.findDocstringEnd(lines, insertIndex);
      lines.splice(insertIndex, endIndex - insertIndex + 1);
    }

    // Insert new docstring
    const docstringLines = docstring.split('\n');
    const indentedDocstring = docstringLines.map(line => 
      line.trim() ? indent + line : line
    );
    
    lines.splice(insertIndex, 0, ...indentedDocstring);

    return {
      success: true,
      lines: lines
    };
  }

  /**
   * Insert JSDoc comment
   * @param {Array} lines - File lines
   * @param {number} lineIndex - Line index
   * @param {string} docstring - JSDoc content
   * @param {Object} item - Item information
   * @returns {Object} Insertion result
   */
  insertJSDoc(lines, lineIndex, docstring, item) {
    const targetLine = lines[lineIndex];
    const indent = this.extractIndentation(targetLine);
    
    // Find insertion point (before the function/class)
    let insertIndex = lineIndex;
    
    // Move up to find the right insertion point
    while (insertIndex > 0 && 
           (lines[insertIndex - 1].trim() === '' || 
            lines[insertIndex - 1].trim().startsWith('//') ||
            lines[insertIndex - 1].trim().startsWith('*'))) {
      insertIndex--;
    }

    // Check if JSDoc already exists
    if (insertIndex > 0 && lines[insertIndex - 1].trim().startsWith('/**')) {
      if (!this.force) {
        return {
          success: false,
          error: 'JSDoc already exists (use --force to replace)'
        };
      }
      
      // Remove existing JSDoc
      const startIndex = this.findJSDocStart(lines, insertIndex - 1);
      lines.splice(startIndex, insertIndex - startIndex);
      insertIndex = startIndex;
    }

    // Insert new JSDoc
    const jsdocLines = docstring.split('\n');
    const indentedJSDoc = jsdocLines.map(line => 
      line.trim() ? indent + line : line
    );
    
    lines.splice(insertIndex, 0, ...indentedJSDoc);

    return {
      success: true,
      lines: lines
    };
  }

  /**
   * Format docstring for insertion
   * @param {string} docstring - Raw docstring
   * @param {string} language - Programming language
   * @param {string} targetLine - Target line for indentation reference
   * @returns {string} Formatted docstring
   */
  formatDocstring(docstring, language, targetLine) {
    if (language === 'python') {
      // Ensure proper Python docstring format
      if (!docstring.trim().startsWith('"""')) {
        return `"""${docstring.trim()}\n    """`;
      }
      return docstring.trim();
    } else if (language === 'javascript' || language === 'typescript') {
      // Ensure proper JSDoc format
      if (!docstring.trim().startsWith('/**')) {
        const lines = docstring.trim().split('\n');
        const jsdoc = ['/**'];
        lines.forEach(line => {
          jsdoc.push(` * ${line.trim()}`);
        });
        jsdoc.push(' */');
        return jsdoc.join('\n');
      }
      return docstring.trim();
    }
    
    return docstring;
  }

  /**
   * Extract indentation from line
   * @param {string} line - Line to extract indentation from
   * @returns {string} Indentation string
   */
  extractIndentation(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  /**
   * Find the end of a Python docstring
   * @param {Array} lines - File lines
   * @param {number} startIndex - Start index of docstring
   * @returns {number} End index of docstring
   */
  findDocstringEnd(lines, startIndex) {
    for (let i = startIndex; i < lines.length; i++) {
      if (lines[i].trim().endsWith('"""')) {
        return i;
      }
    }
    return startIndex;
  }

  /**
   * Find the start of a JSDoc comment
   * @param {Array} lines - File lines
   * @param {number} endIndex - End index of JSDoc
   * @returns {number} Start index of JSDoc
   */
  findJSDocStart(lines, endIndex) {
    for (let i = endIndex; i >= 0; i--) {
      if (lines[i].trim().startsWith('/**')) {
        return i;
      }
    }
    return endIndex;
  }

  /**
   * Detect line ending character
   * @param {string} content - File content
   * @returns {string} Line ending character
   */
  detectLineEnding(content) {
    if (content.includes('\r\n')) {
      return '\r\n'; // Windows
    } else if (content.includes('\n')) {
      return '\n'; // Unix/Linux/macOS
    } else if (content.includes('\r')) {
      return '\r'; // Old Mac
    }
    return '\n'; // Default
  }

  /**
   * Write file atomically
   * @param {string} filePath - File path to write
   * @param {string} content - File content
   * @returns {Promise<void>}
   */
  async writeFileAtomically(filePath, content) {
    const tempPath = filePath + '.tmp';
    
    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, content, 'utf-8');
      
      // Atomic rename
      await fs.rename(tempPath, filePath);
      
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Validate file integrity after modification
   * @param {string} filePath - File path to validate
   * @param {string} originalContent - Original file content
   * @returns {Promise<void>}
   */
  async validateFileIntegrity(filePath, originalContent) {
    try {
      const modifiedContent = await fs.readFile(filePath, 'utf-8');
      
      // Basic validation: file should be readable and not empty
      if (modifiedContent.length === 0) {
        throw new Error('File is empty after modification');
      }
      
      // Check if file is significantly different (should be longer)
      if (modifiedContent.length < originalContent.length * 0.5) {
        throw new Error('File content appears corrupted after modification');
      }
      
    } catch (error) {
      throw new Error(`File integrity validation failed: ${error.message}`);
    }
  }

  /**
   * Group generation results by file
   * @param {Array} generated - Generated documentation results
   * @returns {Object} Grouped results by file path
   */
  groupByFile(generated) {
    const grouped = {};
    
    generated.forEach(item => {
      if (!grouped[item.file]) {
        grouped[item.file] = [];
      }
      grouped[item.file].push(item);
    });
    
    return grouped;
  }

  /**
   * Log modification results
   * @param {Object} results - Modification results
   */
  logModificationResults(results) {
    console.log(chalk.blue('\n📝 File Modification Results:'));
    console.log(chalk.gray('============================='));
    console.log(chalk.green(`✅ Modified: ${results.summary.modifiedFiles} files`));
    console.log(chalk.yellow(`⏭️  Skipped: ${results.summary.skippedFiles} files`));
    console.log(chalk.red(`❌ Errors: ${results.summary.errorFiles} files`));
    
    if (results.successful.length > 0) {
      console.log(chalk.cyan('\n📋 Successfully Modified Files:'));
      results.successful.forEach((result, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${path.basename(result.filePath)} (${result.modifications} changes)`));
      });
    }
    
    if (results.failed.length > 0) {
      console.log(chalk.red('\n❌ Failed Modifications:'));
      results.failed.forEach((failure, index) => {
        console.log(chalk.red(`  ${index + 1}. ${path.basename(failure.filePath)}: ${failure.error}`));
      });
    }
  }
}

module.exports = FileModifier;
