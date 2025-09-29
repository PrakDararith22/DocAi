const chalk = require('chalk').default || require('chalk');

/**
 * Documentation Style Analyzer
 * Detects and analyzes existing documentation patterns in code
 */
class DocumentationAnalyzer {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
  }

  /**
   * Analyze documentation styles across all parsed results
   * @param {Object} parseResults - Results from ParserManager
   * @returns {Object} Style analysis results
   */
  analyzeDocumentationStyles(parseResults) {
    const allDocstrings = [];
    const allJSDocComments = [];
    
    // Collect all documentation from all files
    [...parseResults.python, ...parseResults.javascript, ...parseResults.typescript].forEach(result => {
      if (result.functions) {
        result.functions.forEach(func => {
          if (func.docstring) {
            allDocstrings.push({
              type: 'function',
              content: func.docstring,
              language: this.getLanguageFromPath(result.file_path),
              file: result.file_path
            });
          }
        });
      }
      
      if (result.classes) {
        result.classes.forEach(cls => {
          if (cls.docstring) {
            allDocstrings.push({
              type: 'class',
              content: cls.docstring,
              language: this.getLanguageFromPath(result.file_path),
              file: result.file_path
            });
          }
          
          if (cls.methods) {
            cls.methods.forEach(method => {
              if (method.docstring) {
                allDocstrings.push({
                  type: 'method',
                  content: method.docstring,
                  language: this.getLanguageFromPath(result.file_path),
                  file: result.file_path
                });
              }
            });
          }
        });
      }
    });

    // Analyze Python docstring styles
    const pythonStyles = this.analyzePythonDocstrings(allDocstrings.filter(doc => doc.language === 'python'));
    
    // Analyze JSDoc styles
    const jsdocStyles = this.analyzeJSDocComments(allDocstrings.filter(doc => 
      doc.language === 'javascript' || doc.language === 'typescript'
    ));

    // Determine project-wide style
    const projectStyle = this.determineProjectStyle(pythonStyles, jsdocStyles);

    const analysis = {
      python: pythonStyles,
      javascript: jsdocStyles,
      project: projectStyle,
      totalDocumentation: allDocstrings.length,
      examples: this.extractExamples(allDocstrings)
    };

    if (this.verbose) {
      this.logAnalysisResults(analysis);
    }

    return analysis;
  }

  /**
   * Analyze Python docstring styles
   * @param {Array} docstrings - Array of Python docstrings
   * @returns {Object} Python style analysis
   */
  analyzePythonDocstrings(docstrings) {
    const styles = {
      google: { count: 0, confidence: 0, examples: [] },
      numpy: { count: 0, confidence: 0, examples: [] },
      sphinx: { count: 0, confidence: 0, examples: [] },
      other: { count: 0, confidence: 0, examples: [] }
    };

    docstrings.forEach(doc => {
      const style = this.detectPythonDocstringStyle(doc.content);
      if (styles[style]) {
        styles[style].count++;
        styles[style].examples.push({
          content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
          file: doc.file,
          type: doc.type
        });
      }
    });

    // Calculate confidence scores
    const total = docstrings.length;
    if (total > 0) {
      Object.keys(styles).forEach(style => {
        styles[style].confidence = styles[style].count / total;
      });
    }

    return styles;
  }

  /**
   * Detect Python docstring style
   * @param {string} docstring - The docstring content
   * @returns {string} Detected style
   */
  detectPythonDocstringStyle(docstring) {
    if (!docstring) return 'other';

    const content = docstring.trim();

    // Google style detection
    if (this.isGoogleStyle(content)) {
      return 'google';
    }

    // NumPy style detection
    if (this.isNumPyStyle(content)) {
      return 'numpy';
    }

    // Sphinx style detection
    if (this.isSphinxStyle(content)) {
      return 'sphinx';
    }

    return 'other';
  }

  /**
   * Check if docstring follows Google style
   * @param {string} content - Docstring content
   * @returns {boolean} True if Google style
   */
  isGoogleStyle(content) {
    const googlePatterns = [
      /Args?:/i,
      /Returns?:/i,
      /Raises?:/i,
      /Yields?:/i,
      /Note:/i,
      /Example:/i
    ];

    return googlePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if docstring follows NumPy style
   * @param {string} content - Docstring content
   * @returns {boolean} True if NumPy style
   */
  isNumPyStyle(content) {
    const numpyPatterns = [
      /Parameters\s*-{3,}/i,
      /Returns\s*-{3,}/i,
      /Raises\s*-{3,}/i,
      /Notes\s*-{3,}/i,
      /Examples\s*-{3,}/i
    ];

    return numpyPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if docstring follows Sphinx style
   * @param {string} content - Docstring content
   * @returns {boolean} True if Sphinx style
   */
  isSphinxStyle(content) {
    const sphinxPatterns = [
      /:param\s+\w+:/i,
      /:returns?:/i,
      /:raises?:/i,
      /:rtype:/i,
      /:type\s+\w+:/i
    ];

    return sphinxPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Analyze JSDoc comment styles
   * @param {Array} docstrings - Array of JSDoc comments
   * @returns {Object} JSDoc style analysis
   */
  analyzeJSDocComments(docstrings) {
    const styles = {
      standard: { count: 0, confidence: 0, examples: [] },
      minimal: { count: 0, confidence: 0, examples: [] },
      other: { count: 0, confidence: 0, examples: [] }
    };

    docstrings.forEach(doc => {
      const style = this.detectJSDocStyle(doc.content);
      if (styles[style]) {
        styles[style].count++;
        styles[style].examples.push({
          content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
          file: doc.file,
          type: doc.type
        });
      }
    });

    // Calculate confidence scores
    const total = docstrings.length;
    if (total > 0) {
      Object.keys(styles).forEach(style => {
        styles[style].confidence = styles[style].count / total;
      });
    }

    return styles;
  }

  /**
   * Detect JSDoc comment style
   * @param {string} content - JSDoc content
   * @returns {string} Detected style
   */
  detectJSDocStyle(content) {
    if (!content) return 'other';

    const jsdocPatterns = [
      /@param\s*\{[^}]+\}\s+\w+/i,
      /@returns?\s*\{[^}]+\}/i,
      /@throws?\s*\{[^}]+\}/i,
      /@example/i,
      /@since/i,
      /@deprecated/i
    ];

    const hasJSDocTags = jsdocPatterns.some(pattern => pattern.test(content));
    
    if (hasJSDocTags) {
      return 'standard';
    } else if (content.includes('@') || content.includes('*')) {
      return 'minimal';
    }

    return 'other';
  }

  /**
   * Determine project-wide documentation style
   * @param {Object} pythonStyles - Python style analysis
   * @param {Object} jsdocStyles - JSDoc style analysis
   * @returns {Object} Project-wide style recommendation
   */
  determineProjectStyle(pythonStyles, jsdocStyles) {
    const pythonStyle = this.getDominantStyle(pythonStyles);
    const jsStyle = this.getDominantStyle(jsdocStyles);

    return {
      python: pythonStyle,
      javascript: jsStyle,
      recommendation: this.getStyleRecommendation(pythonStyle, jsStyle),
      confidence: Math.max(
        pythonStyles[pythonStyle]?.confidence || 0,
        jsdocStyles[jsStyle]?.confidence || 0
      )
    };
  }

  /**
   * Get the dominant style from analysis results
   * @param {Object} styles - Style analysis results
   * @returns {string} Dominant style name
   */
  getDominantStyle(styles) {
    let maxCount = 0;
    let dominantStyle = 'other';

    Object.keys(styles).forEach(style => {
      if (styles[style].count > maxCount) {
        maxCount = styles[style].count;
        dominantStyle = style;
      }
    });

    return dominantStyle;
  }

  /**
   * Get style recommendation based on detected styles
   * @param {string} pythonStyle - Detected Python style
   * @param {string} jsStyle - Detected JavaScript style
   * @returns {string} Style recommendation
   */
  getStyleRecommendation(pythonStyle, jsStyle) {
    if (pythonStyle !== 'other' && jsStyle !== 'other') {
      return `Use ${pythonStyle} style for Python and ${jsStyle} style for JavaScript/TypeScript`;
    } else if (pythonStyle !== 'other') {
      return `Use ${pythonStyle} style for Python and standard JSDoc for JavaScript/TypeScript`;
    } else if (jsStyle !== 'other') {
      return `Use Google style for Python and ${jsStyle} style for JavaScript/TypeScript`;
    } else {
      return 'Use Google style for Python and standard JSDoc for JavaScript/TypeScript';
    }
  }

  /**
   * Extract example documentation for reference
   * @param {Array} docstrings - All docstrings
   * @returns {Array} Example documentation
   */
  extractExamples(docstrings) {
    return docstrings
      .filter(doc => doc.content && doc.content.length > 50)
      .slice(0, 5) // Limit to 5 examples
      .map(doc => ({
        content: doc.content,
        language: doc.language,
        type: doc.type,
        file: doc.file
      }));
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
   * Log analysis results
   * @param {Object} analysis - Analysis results
   */
  logAnalysisResults(analysis) {
    console.log(chalk.blue('\n📊 Documentation Style Analysis:'));
    console.log(chalk.gray('================================'));

    // Python analysis
    if (analysis.python) {
      console.log(chalk.green('\n🐍 Python Documentation Styles:'));
      Object.keys(analysis.python).forEach(style => {
        const data = analysis.python[style];
        if (data.count > 0) {
          console.log(chalk.gray(`  ${style}: ${data.count} (${(data.confidence * 100).toFixed(1)}%)`));
        }
      });
    }

    // JavaScript analysis
    if (analysis.javascript) {
      console.log(chalk.yellow('\n📜 JavaScript/TypeScript Documentation Styles:'));
      Object.keys(analysis.javascript).forEach(style => {
        const data = analysis.javascript[style];
        if (data.count > 0) {
          console.log(chalk.gray(`  ${style}: ${data.count} (${(data.confidence * 100).toFixed(1)}%)`));
        }
      });
    }

    // Project recommendation
    console.log(chalk.cyan('\n💡 Project Style Recommendation:'));
    console.log(chalk.gray(`  ${analysis.project.recommendation}`));
    console.log(chalk.gray(`  Confidence: ${(analysis.project.confidence * 100).toFixed(1)}%`));

    // Examples
    if (analysis.examples.length > 0) {
      console.log(chalk.blue('\n📝 Example Documentation Found:'));
      analysis.examples.forEach((example, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${example.type} in ${example.file}`));
        console.log(chalk.gray(`     ${example.content.substring(0, 100)}...`));
      });
    }
  }
}

module.exports = DocumentationAnalyzer;
