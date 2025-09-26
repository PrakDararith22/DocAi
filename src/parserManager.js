const PythonParser = require('./pythonParser');
const JSParser = require('./jsParser');
const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');

/**
 * Parser Manager
 * Coordinates Python and JavaScript/TypeScript parsers
 */
class ParserManager {
  constructor(options = {}) {
    this.options = options;
    this.pythonParser = new PythonParser(options);
    this.jsParser = new JSParser(options);
  }

  /**
   * Parse files based on their language
   * @param {Array} files - Array of file objects with language property
   * @returns {Promise<Object>} Combined parsing results
   */
  async parseFiles(files) {
    const spinner = ora('🔍 Parsing files...').start();
    
    try {
      // Group files by language
      const filesByLanguage = this.groupFilesByLanguage(files);
      
      const results = {
        python: [],
        javascript: [],
        typescript: [],
        errors: [],
        summary: {
          totalFiles: files.length,
          parsedFiles: 0,
          totalFunctions: 0,
          totalClasses: 0,
          errors: 0
        }
      };

      // Parse Python files
      if (filesByLanguage.python.length > 0) {
        spinner.text = `🐍 Parsing ${filesByLanguage.python.length} Python files...`;
        
        // Check if Python is available
        const pythonAvailable = await this.pythonParser.checkPythonAvailability();
        if (!pythonAvailable) {
          const error = 'Python interpreter not found. Please install Python to parse .py files.';
          console.warn(chalk.yellow(`Warning: ${error}`));
          results.errors.push(error);
        } else {
          try {
            const pythonResults = await this.pythonParser.parseFiles(filesByLanguage.python);
            results.python = pythonResults;
            this.updateSummary(results, pythonResults);
          } catch (error) {
            results.errors.push(`Python parsing error: ${error.message}`);
          }
        }
      }

      // Parse JavaScript files
      if (filesByLanguage.javascript.length > 0) {
        spinner.text = `📜 Parsing ${filesByLanguage.javascript.length} JavaScript files...`;
        
        try {
          const jsResults = await this.jsParser.parseFiles(filesByLanguage.javascript);
          results.javascript = jsResults;
          this.updateSummary(results, jsResults);
        } catch (error) {
          results.errors.push(`JavaScript parsing error: ${error.message}`);
        }
      }

      // Parse TypeScript files
      if (filesByLanguage.typescript.length > 0) {
        spinner.text = `📘 Parsing ${filesByLanguage.typescript.length} TypeScript files...`;
        
        try {
          const tsResults = await this.jsParser.parseFiles(filesByLanguage.typescript);
          results.typescript = tsResults;
          this.updateSummary(results, tsResults);
        } catch (error) {
          results.errors.push(`TypeScript parsing error: ${error.message}`);
        }
      }

      spinner.succeed(`✅ Parsed ${results.summary.parsedFiles} files successfully`);
      
      if (this.options.verbose) {
        this.logDetailedResults(results);
      }

      return results;

    } catch (error) {
      spinner.fail('❌ Parsing failed');
      throw error;
    }
  }

  /**
   * Group files by language
   * @param {Array} files - Array of file objects
   * @returns {Object} Files grouped by language
   */
  groupFilesByLanguage(files) {
    const grouped = {
      python: [],
      javascript: [],
      typescript: []
    };

    files.forEach(file => {
      switch (file.language) {
        case 'py':
          grouped.python.push(file);
          break;
        case 'js':
          grouped.javascript.push(file);
          break;
        case 'ts':
          grouped.typescript.push(file);
          break;
      }
    });

    return grouped;
  }

  /**
   * Update summary statistics
   * @param {Object} results - Results object to update
   * @param {Array} parseResults - Array of parse results
   */
  updateSummary(results, parseResults) {
    parseResults.forEach(result => {
      if (result.functions && result.classes) {
        results.summary.parsedFiles++;
        results.summary.totalFunctions += result.functions.length;
        results.summary.totalClasses += result.classes.length;
        results.summary.errors += result.errors ? result.errors.length : 0;
      }
    });
  }

  /**
   * Log detailed parsing results
   * @param {Object} results - Parsing results
   */
  logDetailedResults(results) {
    console.log(chalk.blue('\n📊 Parsing Results:'));
    console.log(chalk.gray('=================='));
    
    // Python results
    if (results.python.length > 0) {
      console.log(chalk.green('\n🐍 Python Files:'));
      results.python.forEach(result => {
        const funcCount = result.functions ? result.functions.length : 0;
        const classCount = result.classes ? result.classes.length : 0;
        const errorCount = result.errors ? result.errors.length : 0;
        
        console.log(chalk.gray(`  ${result.file_path}:`));
        console.log(chalk.gray(`    Functions: ${funcCount}, Classes: ${classCount}, Errors: ${errorCount}`));
        
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(error => {
            console.log(chalk.red(`    Error: ${error}`));
          });
        }
      });
    }

    // JavaScript results
    if (results.javascript.length > 0) {
      console.log(chalk.yellow('\n📜 JavaScript Files:'));
      results.javascript.forEach(result => {
        const funcCount = result.functions ? result.functions.length : 0;
        const classCount = result.classes ? result.classes.length : 0;
        const errorCount = result.errors ? result.errors.length : 0;
        
        console.log(chalk.gray(`  ${result.file_path}:`));
        console.log(chalk.gray(`    Functions: ${funcCount}, Classes: ${classCount}, Errors: ${errorCount}`));
        
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(error => {
            console.log(chalk.red(`    Error: ${error}`));
          });
        }
      });
    }

    // TypeScript results
    if (results.typescript.length > 0) {
      console.log(chalk.blue('\n📘 TypeScript Files:'));
      results.typescript.forEach(result => {
        const funcCount = result.functions ? result.functions.length : 0;
        const classCount = result.classes ? result.classes.length : 0;
        const errorCount = result.errors ? result.errors.length : 0;
        
        console.log(chalk.gray(`  ${result.file_path}:`));
        console.log(chalk.gray(`    Functions: ${funcCount}, Classes: ${classCount}, Errors: ${errorCount}`));
        
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(error => {
            console.log(chalk.red(`    Error: ${error}`));
          });
        }
      });
    }

    // Summary
    console.log(chalk.cyan('\n📈 Summary:'));
    console.log(chalk.gray(`  Total files: ${results.summary.totalFiles}`));
    console.log(chalk.green(`  Successfully parsed: ${results.summary.parsedFiles}`));
    console.log(chalk.blue(`  Total functions: ${results.summary.totalFunctions}`));
    console.log(chalk.blue(`  Total classes: ${results.summary.totalClasses}`));
    console.log(chalk.red(`  Total errors: ${results.summary.errors}`));
  }

  /**
   * Get all functions from all parsed files
   * @param {Object} results - Parsing results
   * @returns {Array} Flattened array of all functions
   */
  getAllFunctions(results) {
    const allFunctions = [];
    
    // Collect from all language results
    [...results.python, ...results.javascript, ...results.typescript].forEach(result => {
      if (result.functions) {
        result.functions.forEach(func => {
          allFunctions.push({
            ...func,
            file_path: result.file_path,
            language: this.getLanguageFromPath(result.file_path)
          });
        });
      }
    });

    return allFunctions;
  }

  /**
   * Get all classes from all parsed files
   * @param {Object} results - Parsing results
   * @returns {Array} Flattened array of all classes
   */
  getAllClasses(results) {
    const allClasses = [];
    
    // Collect from all language results
    [...results.python, ...results.javascript, ...results.typescript].forEach(result => {
      if (result.classes) {
        result.classes.forEach(cls => {
          allClasses.push({
            ...cls,
            file_path: result.file_path,
            language: this.getLanguageFromPath(result.file_path)
          });
        });
      }
    });

    return allClasses;
  }

  /**
   * Get language from file path
   * @param {string} filePath - File path
   * @returns {string} Language identifier
   */
  getLanguageFromPath(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      default: return 'unknown';
    }
  }
}

module.exports = ParserManager;
