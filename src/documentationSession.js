const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * Manages the state and lifecycle of documentation generation sessions
 * Handles loaded files, parsed functions, generated docs, and pending changes
 */
class DocumentationSession {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    
    // Core state maps
    this.loadedFiles = new Map(); // filename -> { path, content, originalContent, language }
    this.parsedFunctions = new Map(); // filename -> [{ name, type, startLine, endLine, signature }]
    this.parsedClasses = new Map(); // filename -> [{ name, startLine, endLine, methods }]
    this.generatedDocs = new Map(); // filename -> [{ functionName, docstring, applied }]
    this.pendingChanges = new Map(); // filename -> { changes: [], preview: string }
    this.backupState = new Map(); // filename -> { backupPath, timestamp }
    
    // Session metadata
    this.sessionId = Date.now().toString(36);
    this.createdAt = new Date();
    this.lastActivity = new Date();
    this.stats = {
      filesLoaded: 0,
      functionsFound: 0,
      classesFound: 0,
      docsGenerated: 0,
      changesApplied: 0
    };
  }

  /**
   * Load a file into the session
   * @param {string} filePath - Path to the file to load
   * @returns {Promise<Object>} File information
   */
  async loadFile(filePath) {
    try {
      const resolvedPath = path.resolve(filePath);
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const language = this.detectLanguage(resolvedPath);
      
      const fileInfo = {
        path: resolvedPath,
        content: content,
        originalContent: content,
        language: language,
        lines: content.split('\n').length,
        loadedAt: new Date()
      };
      
      this.loadedFiles.set(filePath, fileInfo);
      this.stats.filesLoaded++;
      this.updateActivity();
      
      if (this.verbose) {
        console.log(chalk.green(`✅ Loaded ${filePath} (${language}, ${fileInfo.lines} lines)`));
      }
      
      return fileInfo;
    } catch (error) {
      throw new Error(`Failed to load file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Load multiple files matching a pattern
   * @param {string|Array} patterns - File patterns to load
   * @returns {Promise<Array>} Array of loaded file information
   */
  async loadFiles(patterns) {
    const glob = require('glob');
    const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
    const allFiles = [];
    
    for (const pattern of patternsArray) {
      try {
        // Check if it's a direct file path first
        const fs = require('fs');
        if (fs.existsSync(pattern) && fs.statSync(pattern).isFile()) {
          allFiles.push(pattern);
          continue;
        }
        
        // Use glob for patterns
        const files = await new Promise((resolve, reject) => {
          glob(pattern, { nonull: false }, (err, matches) => {
            if (err) reject(err);
            else resolve(matches || []);
          });
        });
        allFiles.push(...files);
      } catch (error) {
        if (this.verbose) {
          console.log(`⚠️  Pattern ${pattern} failed: ${error.message}`);
        }
      }
    }
    
    const uniqueFiles = [...new Set(allFiles)];
    const loadedFiles = [];
    
    for (const file of uniqueFiles) {
      try {
        const fileInfo = await this.loadFile(file);
        loadedFiles.push(fileInfo);
      } catch (error) {
        if (this.verbose) {
          console.log(chalk.yellow(`⚠️  Skipped ${file}: ${error.message}`));
        }
      }
    }
    
    return loadedFiles;
  }

  /**
   * Parse loaded files to extract functions and classes
   * @param {Array} fileNames - Optional array of specific files to parse
   * @returns {Promise<Object>} Parsing results
   */
  async parseFiles(fileNames = null) {
    let ParserManager;
    let parserManager;
    
    // For testing, always use simple parser
    if (process.env.NODE_ENV === 'test' || this.options.useSimpleParser) {
      if (this.verbose) {
        console.log('Using simple parser for testing');
      }
      return this.parseFilesSimple(fileNames);
    }
    
    try {
      ParserManager = require('./parserManager');
      parserManager = new ParserManager(this.options);
      if (this.verbose) {
        console.log('Using ParserManager');
      }
    } catch (error) {
      // Fallback to simple parsing for testing
      if (this.verbose) {
        console.log('Using fallback parser for testing:', error.message);
      }
      return this.parseFilesSimple(fileNames);
    }
    
    const filesToParse = fileNames ? 
      fileNames.filter(name => this.loadedFiles.has(name)) :
      Array.from(this.loadedFiles.keys());
    
    const results = {
      functions: 0,
      classes: 0,
      errors: []
    };
    
    for (const fileName of filesToParse) {
      try {
        const fileInfo = this.loadedFiles.get(fileName);
        const parseResult = await parserManager.parseFile(fileInfo.path);
        
        if (parseResult.functions && parseResult.functions.length > 0) {
          this.parsedFunctions.set(fileName, parseResult.functions);
          results.functions += parseResult.functions.length;
          this.stats.functionsFound += parseResult.functions.length;
        }
        
        if (parseResult.classes && parseResult.classes.length > 0) {
          this.parsedClasses.set(fileName, parseResult.classes);
          results.classes += parseResult.classes.length;
          this.stats.classesFound += parseResult.classes.length;
        }
        
        if (this.verbose) {
          console.log(chalk.blue(`📋 Parsed ${fileName}: ${parseResult.functions?.length || 0} functions, ${parseResult.classes?.length || 0} classes`));
        }
        
      } catch (error) {
        results.errors.push({ fileName, error: error.message });
        if (this.verbose) {
          console.log(chalk.red(`❌ Failed to parse ${fileName}: ${error.message}`));
        }
      }
    }
    
    this.updateActivity();
    return results;
  }

  /**
   * Generate documentation for parsed functions and classes
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation results
   */
  async generateDocumentation(options = {}) {
    const { createAIProvider } = require('./aiProviderFactory');
    const DocumentationGenerator = require('./documentationGenerator');
    
    const aiProvider = createAIProvider(this.options);
    const docGenerator = new DocumentationGenerator(this.options);
    
    const results = {
      generated: 0,
      errors: [],
      totalItems: 0
    };
    
    // Count total items to process
    for (const [fileName, functions] of this.parsedFunctions) {
      results.totalItems += functions.length;
    }
    for (const [fileName, classes] of this.parsedClasses) {
      results.totalItems += classes.length;
    }
    
    if (results.totalItems === 0) {
      throw new Error('No functions or classes found to document. Run /docgen-scan first.');
    }
    
    // Generate documentation for functions
    for (const [fileName, functions] of this.parsedFunctions) {
      const fileInfo = this.loadedFiles.get(fileName);
      const generatedDocs = [];
      
      for (const func of functions) {
        try {
          const docstring = await docGenerator.generateFunctionDocumentation(
            func, 
            fileInfo.content, 
            fileInfo.language,
            aiProvider
          );
          
          generatedDocs.push({
            type: 'function',
            name: func.name,
            docstring: docstring,
            startLine: func.startLine,
            endLine: func.endLine,
            applied: false,
            generatedAt: new Date()
          });
          
          results.generated++;
          this.stats.docsGenerated++;
          
          if (this.verbose) {
            console.log(chalk.green(`✨ Generated docs for function: ${func.name}`));
          }
          
        } catch (error) {
          results.errors.push({ fileName, functionName: func.name, error: error.message });
          if (this.verbose) {
            console.log(chalk.red(`❌ Failed to generate docs for ${func.name}: ${error.message}`));
          }
        }
      }
      
      if (generatedDocs.length > 0) {
        this.generatedDocs.set(fileName, generatedDocs);
      }
    }
    
    // Generate documentation for classes
    for (const [fileName, classes] of this.parsedClasses) {
      const fileInfo = this.loadedFiles.get(fileName);
      const existingDocs = this.generatedDocs.get(fileName) || [];
      
      for (const cls of classes) {
        try {
          const docstring = await docGenerator.generateClassDocumentation(
            cls,
            fileInfo.content,
            fileInfo.language,
            aiProvider
          );
          
          existingDocs.push({
            type: 'class',
            name: cls.name,
            docstring: docstring,
            startLine: cls.startLine,
            endLine: cls.endLine,
            applied: false,
            generatedAt: new Date()
          });
          
          results.generated++;
          this.stats.docsGenerated++;
          
          if (this.verbose) {
            console.log(chalk.green(`✨ Generated docs for class: ${cls.name}`));
          }
          
        } catch (error) {
          results.errors.push({ fileName, className: cls.name, error: error.message });
          if (this.verbose) {
            console.log(chalk.red(`❌ Failed to generate docs for ${cls.name}: ${error.message}`));
          }
        }
      }
      
      this.generatedDocs.set(fileName, existingDocs);
    }
    
    this.updateActivity();
    return results;
  }

  /**
   * Create preview of pending changes
   * @param {Array} fileNames - Optional specific files to preview
   * @returns {Object} Preview information
   */
  createPreview(fileNames = null) {
    const filesToPreview = fileNames || Array.from(this.generatedDocs.keys());
    const previews = {};
    
    for (const fileName of filesToPreview) {
      const docs = this.generatedDocs.get(fileName);
      const fileInfo = this.loadedFiles.get(fileName);
      
      if (!docs || !fileInfo) continue;
      
      const unappliedDocs = docs.filter(doc => !doc.applied);
      if (unappliedDocs.length === 0) continue;
      
      const preview = this.generateFilePreview(fileInfo, unappliedDocs);
      previews[fileName] = preview;
      
      this.pendingChanges.set(fileName, {
        changes: unappliedDocs,
        preview: preview,
        createdAt: new Date()
      });
    }
    
    return previews;
  }

  /**
   * Apply pending documentation changes to files
   * @param {Array} fileNames - Optional specific files to apply changes to
   * @returns {Promise<Object>} Application results
   */
  async applyChanges(fileNames = null) {
    const BackupManager = require('./backupManager');
    const FileModifier = require('./fileModifier');
    
    const backupManager = new BackupManager(this.options);
    const fileModifier = new FileModifier(this.options);
    
    const filesToApply = fileNames || Array.from(this.pendingChanges.keys());
    const results = {
      applied: 0,
      errors: [],
      backups: []
    };
    
    for (const fileName of filesToApply) {
      try {
        const fileInfo = this.loadedFiles.get(fileName);
        const pendingChange = this.pendingChanges.get(fileName);
        
        if (!fileInfo || !pendingChange) continue;
        
        // Create backup
        if (this.options.backup) {
          const backupPath = await backupManager.createBackup(fileInfo.path);
          this.backupState.set(fileName, {
            backupPath: backupPath,
            timestamp: new Date()
          });
          results.backups.push(backupPath);
        }
        
        // Apply changes
        await fileModifier.modifyFile(fileInfo.path, pendingChange.changes, backupManager);
        
        // Update state
        const docs = this.generatedDocs.get(fileName);
        docs.forEach(doc => {
          if (pendingChange.changes.some(change => change.name === doc.name)) {
            doc.applied = true;
            doc.appliedAt = new Date();
          }
        });
        
        // Update file content
        const newContent = await fs.readFile(fileInfo.path, 'utf-8');
        fileInfo.content = newContent;
        
        results.applied++;
        this.stats.changesApplied++;
        
        if (this.verbose) {
          console.log(chalk.green(`✅ Applied changes to ${fileName}`));
        }
        
      } catch (error) {
        results.errors.push({ fileName, error: error.message });
        if (this.verbose) {
          console.log(chalk.red(`❌ Failed to apply changes to ${fileName}: ${error.message}`));
        }
      }
    }
    
    // Clear applied pending changes
    for (const fileName of filesToApply) {
      if (results.errors.every(err => err.fileName !== fileName)) {
        this.pendingChanges.delete(fileName);
      }
    }
    
    this.updateActivity();
    return results;
  }

  /**
   * Get session status and statistics
   * @returns {Object} Session status
   */
  getStatus() {
    return {
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      stats: { ...this.stats },
      loadedFiles: this.loadedFiles.size,
      pendingChanges: this.pendingChanges.size,
      backups: this.backupState.size,
      hasGeneratedDocs: this.generatedDocs.size > 0
    };
  }

  /**
   * Clear session data
   * @param {Object} options - Clear options
   */
  clear(options = {}) {
    if (options.files !== false) this.loadedFiles.clear();
    if (options.parsed !== false) {
      this.parsedFunctions.clear();
      this.parsedClasses.clear();
    }
    if (options.generated !== false) this.generatedDocs.clear();
    if (options.pending !== false) this.pendingChanges.clear();
    if (options.stats !== false) {
      this.stats = {
        filesLoaded: 0,
        functionsFound: 0,
        classesFound: 0,
        docsGenerated: 0,
        changesApplied: 0
      };
    }
    
    this.updateActivity();
  }

  /**
   * Simple fallback parser for testing when ParserManager is not available
   * @param {Array} fileNames - Files to parse
   * @returns {Promise<Object>} Parse results
   */
  async parseFilesSimple(fileNames = null) {
    const filesToParse = fileNames ? 
      fileNames.filter(name => this.loadedFiles.has(name)) :
      Array.from(this.loadedFiles.keys());
    
    if (this.verbose) {
      console.log('Files to parse:', filesToParse);
      console.log('Available loaded files:', Array.from(this.loadedFiles.keys()));
    }
    
    const results = {
      functions: 0,
      classes: 0,
      errors: []
    };
    
    for (const fileName of filesToParse) {
      try {
        const fileInfo = this.loadedFiles.get(fileName);
        if (!fileInfo || !fileInfo.content) {
          throw new Error(`File info not found for ${fileName}`);
        }
        const content = fileInfo.content;
        const lines = content.split('\n');
        
        const functions = [];
        const classes = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Simple Python function detection
          if (line.startsWith('def ') && line.includes('(')) {
            const funcName = line.split('(')[0].replace('def ', '').trim();
            functions.push({
              name: funcName,
              type: 'function',
              startLine: i + 1,
              endLine: i + 2,
              signature: line
            });
            results.functions++;
          }
          
          // Simple Python class detection
          if (line.startsWith('class ') && line.includes(':')) {
            const className = line.split(':')[0].replace('class ', '').trim();
            classes.push({
              name: className,
              type: 'class',
              startLine: i + 1,
              endLine: i + 2,
              methods: []
            });
            results.classes++;
          }
          
          // Simple JavaScript function detection
          if ((line.startsWith('function ') || line.includes('function ')) && line.includes('(')) {
            const funcMatch = line.match(/function\s+(\w+)\s*\(/);
            if (funcMatch) {
              functions.push({
                name: funcMatch[1],
                type: 'function',
                startLine: i + 1,
                endLine: i + 2,
                signature: line
              });
              results.functions++;
            }
          }
          
          // Simple JavaScript class detection
          if (line.startsWith('class ') && line.includes('{')) {
            const className = line.split('{')[0].replace('class ', '').trim();
            classes.push({
              name: className,
              type: 'class',
              startLine: i + 1,
              endLine: i + 2,
              methods: []
            });
            results.classes++;
          }
        }
        
        if (functions.length > 0) {
          this.parsedFunctions.set(fileName, functions);
          this.stats.functionsFound += functions.length;
        }
        
        if (classes.length > 0) {
          this.parsedClasses.set(fileName, classes);
          this.stats.classesFound += classes.length;
        }
        
        if (this.verbose) {
          console.log(`📋 Parsed ${fileName}: ${functions.length} functions, ${classes.length} classes`);
        }
        
      } catch (error) {
        results.errors.push({ fileName, error: error.message });
        if (this.verbose) {
          console.log(`❌ Failed to parse ${fileName}: ${error.message}`);
        }
      }
    }
    
    this.updateActivity();
    return results;
  }

  // Private helper methods
  
  detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.py': return 'python';
      case '.js': return 'javascript';
      case '.ts': return 'typescript';
      default: return 'unknown';
    }
  }
  
  updateActivity() {
    this.lastActivity = new Date();
  }
  
  generateFilePreview(fileInfo, docs) {
    const lines = fileInfo.content.split('\n');
    let preview = '';
    
    docs.forEach(doc => {
      const startIdx = Math.max(0, doc.startLine - 3);
      const endIdx = Math.min(lines.length, doc.startLine + 5);
      
      preview += `\n--- ${doc.type}: ${doc.name} (line ${doc.startLine}) ---\n`;
      preview += `${doc.docstring}\n`;
      preview += `Context:\n`;
      
      for (let i = startIdx; i < endIdx; i++) {
        const marker = i === doc.startLine - 1 ? '>>> ' : '    ';
        preview += `${marker}${i + 1}: ${lines[i]}\n`;
      }
    });
    
    return preview;
  }
}

module.exports = DocumentationSession;
