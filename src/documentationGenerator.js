const chalk = require('chalk').default || require('chalk');
const HuggingFaceAPI = require('./huggingFaceAPI');
const DocumentationAnalyzer = require('./documentationAnalyzer');

/**
 * AI-Powered Documentation Generator
 * Generates contextual docstrings using AI and applies them to code
 */
class DocumentationGenerator {
  constructor(options = {}) {
    this.options = options;
    this.aiAPI = new HuggingFaceAPI(options);
    this.analyzer = new DocumentationAnalyzer(options);
    this.verbose = options.verbose || false;
  }

  /**
   * Generate documentation for all functions and classes
   * @param {Object} parseResults - Results from ParserManager
   * @param {Object} styleAnalysis - Style analysis results
   * @returns {Promise<Object>} Generation results
   */
  async generateDocumentation(parseResults, styleAnalysis) {
    const allFunctions = this.getAllFunctions(parseResults);
    const allClasses = this.getAllClasses(parseResults);
    
    const results = {
      generated: [],
      skipped: [],
      errors: [],
      summary: {
        totalFunctions: allFunctions.length,
        totalClasses: allClasses.length,
        generatedFunctions: 0,
        generatedClasses: 0,
        skippedFunctions: 0,
        skippedClasses: 0,
        errors: 0
      }
    };

    if (this.verbose) {
      console.log(chalk.blue('\n🤖 Starting AI-powered documentation generation...'));
      console.log(chalk.gray(`Found ${allFunctions.length} functions and ${allClasses.length} classes to process`));
    }

    // Generate documentation for functions
    for (const func of allFunctions) {
      try {
        if (func.has_docstring && !this.options.force) {
          results.skipped.push({
            type: 'function',
            name: func.name,
            file: func.file_path,
            reason: 'Already has documentation'
          });
          results.summary.skippedFunctions++;
          continue;
        }

        const docstring = await this.generateFunctionDocstring(func, styleAnalysis);
        if (docstring.success) {
          results.generated.push({
            type: 'function',
            name: func.name,
            file: func.file_path,
            line: func.line,
            docstring: docstring.text,
            language: func.language
          });
          results.summary.generatedFunctions++;
        } else {
          results.errors.push({
            type: 'function',
            name: func.name,
            file: func.file_path,
            error: docstring.error
          });
          results.summary.errors++;
        }
      } catch (error) {
        results.errors.push({
          type: 'function',
          name: func.name,
          file: func.file_path,
          error: error.message
        });
        results.summary.errors++;
      }
    }

    // Generate documentation for classes
    for (const cls of allClasses) {
      try {
        if (cls.has_docstring && !this.options.force) {
          results.skipped.push({
            type: 'class',
            name: cls.name,
            file: cls.file_path,
            reason: 'Already has documentation'
          });
          results.summary.skippedClasses++;
          continue;
        }

        const docstring = await this.generateClassDocstring(cls, styleAnalysis);
        if (docstring.success) {
          results.generated.push({
            type: 'class',
            name: cls.name,
            file: cls.file_path,
            line: cls.line,
            docstring: docstring.text,
            language: cls.language
          });
          results.summary.generatedClasses++;
        } else {
          results.errors.push({
            type: 'class',
            name: cls.name,
            file: cls.file_path,
            error: docstring.error
          });
          results.summary.errors++;
        }
      } catch (error) {
        results.errors.push({
          type: 'class',
          name: cls.name,
          file: cls.file_path,
          error: error.message
        });
        results.summary.errors++;
      }
    }

    if (this.verbose) {
      this.logGenerationResults(results);
    }

    return results;
  }

  /**
   * Generate docstring for a function
   * @param {Object} func - Function information
   * @param {Object} styleAnalysis - Style analysis
   * @returns {Promise<Object>} Generated docstring result
   */
  async generateFunctionDocstring(func, styleAnalysis) {
    const prompt = this.createFunctionPrompt(func, styleAnalysis);
    
    if (this.verbose) {
      console.log(chalk.gray(`  Generating docstring for function: ${func.name}()`));
    }

    const result = await this.aiAPI.generateDocumentation(prompt, {
      maxTokens: 256,
      temperature: 0.7
    });

    if (result.success) {
      // Post-process the generated docstring
      const processedDocstring = this.postProcessDocstring(result.text, func.language);
      return {
        success: true,
        text: processedDocstring
      };
    }

    return result;
  }

  /**
   * Generate docstring for a class
   * @param {Object} cls - Class information
   * @param {Object} styleAnalysis - Style analysis
   * @returns {Promise<Object>} Generated docstring result
   */
  async generateClassDocstring(cls, styleAnalysis) {
    const prompt = this.createClassPrompt(cls, styleAnalysis);
    
    if (this.verbose) {
      console.log(chalk.gray(`  Generating docstring for class: ${cls.name}`));
    }

    const result = await this.aiAPI.generateDocumentation(prompt, {
      maxTokens: 256,
      temperature: 0.7
    });

    if (result.success) {
      // Post-process the generated docstring
      const processedDocstring = this.postProcessDocstring(result.text, cls.language);
      return {
        success: true,
        text: processedDocstring
      };
    }

    return result;
  }

  /**
   * Create prompt for function docstring generation
   * @param {Object} func - Function information
   * @param {Object} styleAnalysis - Style analysis
   * @returns {string} Generated prompt
   */
  createFunctionPrompt(func, styleAnalysis) {
    const style = this.getRecommendedStyle(func.language, styleAnalysis);
    
    let prompt = `Generate a ${style} style docstring for this ${func.language} function:\n\n`;
    prompt += `def ${func.name}(`;
    
    if (func.params && func.params.length > 0) {
      prompt += func.params.map(param => param.name).join(', ');
    }
    
    prompt += `):\n`;
    
    if (func.return_type) {
      prompt += `    -> ${func.return_type}\n`;
    }
    
    prompt += `    pass\n\n`;
    prompt += `Requirements:\n`;
    prompt += `- Use ${style} style formatting\n`;
    prompt += `- Include parameter descriptions\n`;
    prompt += `- Include return value description\n`;
    prompt += `- Be concise but informative\n`;
    prompt += `- Only return the docstring content, no code\n\n`;
    prompt += `Docstring:`;

    return prompt;
  }

  /**
   * Create prompt for class docstring generation
   * @param {Object} cls - Class information
   * @param {Object} styleAnalysis - Style analysis
   * @returns {string} Generated prompt
   */
  createClassPrompt(cls, styleAnalysis) {
    const style = this.getRecommendedStyle(cls.language, styleAnalysis);
    
    let prompt = `Generate a ${style} style docstring for this ${cls.language} class:\n\n`;
    prompt += `class ${cls.name}:\n`;
    prompt += `    pass\n\n`;
    
    if (cls.methods && cls.methods.length > 0) {
      prompt += `Methods:\n`;
      cls.methods.forEach(method => {
        prompt += `- ${method.name}()\n`;
      });
      prompt += `\n`;
    }
    
    prompt += `Requirements:\n`;
    prompt += `- Use ${style} style formatting\n`;
    prompt += `- Describe the class purpose\n`;
    prompt += `- Mention key methods if any\n`;
    prompt += `- Be concise but informative\n`;
    prompt += `- Only return the docstring content, no code\n\n`;
    prompt += `Docstring:`;

    return prompt;
  }

  /**
   * Get recommended style for language
   * @param {string} language - Programming language
   * @param {Object} styleAnalysis - Style analysis
   * @returns {string} Recommended style
   */
  getRecommendedStyle(language, styleAnalysis) {
    if (language === 'python') {
      return styleAnalysis.project.python || 'google';
    } else if (language === 'javascript' || language === 'typescript') {
      return styleAnalysis.project.javascript || 'standard';
    }
    return 'google';
  }

  /**
   * Post-process generated docstring
   * @param {string} docstring - Raw generated docstring
   * @param {string} language - Programming language
   * @returns {string} Processed docstring
   */
  postProcessDocstring(docstring, language) {
    // Remove code blocks if present
    let processed = docstring.replace(/```[\s\S]*?```/g, '').trim();
    
    // Remove any remaining code markers
    processed = processed.replace(/^```.*$/gm, '').trim();
    
    // Ensure proper indentation for Python
    if (language === 'python') {
      processed = processed.split('\n').map(line => 
        line.trim() ? '    ' + line.trim() : line
      ).join('\n');
    }
    
    // Ensure proper formatting for JSDoc
    if (language === 'javascript' || language === 'typescript') {
      if (!processed.startsWith('/**')) {
        processed = '/**\n' + processed.split('\n').map(line => 
          line.trim() ? ' * ' + line.trim() : ' *'
        ).join('\n') + '\n */';
      }
    }
    
    return processed;
  }

  /**
   * Get all functions from parse results
   * @param {Object} parseResults - Parse results
   * @returns {Array} All functions
   */
  getAllFunctions(parseResults) {
    const allFunctions = [];
    
    [...parseResults.python, ...parseResults.javascript, ...parseResults.typescript].forEach(result => {
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
   * Get all classes from parse results
   * @param {Object} parseResults - Parse results
   * @returns {Array} All classes
   */
  getAllClasses(parseResults) {
    const allClasses = [];
    
    [...parseResults.python, ...parseResults.javascript, ...parseResults.typescript].forEach(result => {
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

  /**
   * Log generation results
   * @param {Object} results - Generation results
   */
  logGenerationResults(results) {
    console.log(chalk.blue('\n📝 Documentation Generation Results:'));
    console.log(chalk.gray('====================================='));
    
    console.log(chalk.green(`✅ Generated: ${results.summary.generatedFunctions} functions, ${results.summary.generatedClasses} classes`));
    console.log(chalk.yellow(`⏭️  Skipped: ${results.summary.skippedFunctions} functions, ${results.summary.skippedClasses} classes`));
    console.log(chalk.red(`❌ Errors: ${results.summary.errors}`));
    
    if (results.generated.length > 0) {
      console.log(chalk.cyan('\n📋 Generated Documentation:'));
      results.generated.forEach((item, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${item.type} ${item.name}() in ${item.file}`));
      });
    }
    
    if (results.errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      results.errors.forEach((error, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${error.type} ${error.name}(): ${error.error}`));
      });
    }
  }
}

module.exports = DocumentationGenerator;
