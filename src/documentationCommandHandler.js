const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const DocumentationSession = require('./documentationSession');

/**
 * Handles all documentation-related slash commands
 * Integrates with DocumentationSession for state management
 */
class DocumentationCommandHandler {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.session = new DocumentationSession(options);
  }

  /**
   * Handle documentation slash commands
   * @param {string} command - The command string
   * @param {Array} args - Command arguments
   * @returns {Promise<void>}
   */
  async handleCommand(command, args) {
    try {
      switch (command) {
        case '/docs':
          await this.handleLoadCommand(args);
          break;
        
        case '/scan':
          await this.handleScanCommand(args);
          break;
        
        case '/generate':
        case '/gen':
          await this.handleGenerateAllCommand(args);
          break;
        
        case '/preview':
          await this.handlePreviewCommand(args);
          break;
        
        case '/apply':
          await this.handleApplyCommand(args);
          break;
        
        case '/rollback':
          await this.handleRollbackCommand(args);
          break;
        
        case '/status':
          await this.handleStatusCommand(args);
          break;
        
        case '/clear':
          await this.handleClearCommand(args);
          break;
        
        case '/help':
          this.showHelp();
          break;
        
        default:
          console.log(chalk.red(`Unknown documentation command: ${command}`));
          console.log(chalk.gray('Type /help for available commands'));
      }
    } catch (error) {
      console.error(chalk.red(`Error executing ${command}: ${error.message}`));
      if (this.verbose) {
        console.error(chalk.gray(error.stack));
      }
    }
  }

  /**
   * Load files into the documentation session
   * Usage: /docs <pattern> [pattern2] [pattern3]...
   */
  async handleLoadCommand(args) {
    if (args.length === 0) {
      console.log(chalk.red('Usage: /docs <file-pattern> [additional-patterns...]'));
      console.log(chalk.gray('Examples:'));
      console.log(chalk.gray('  /docs "./src/**/*.py"'));
      console.log(chalk.gray('  /docs "./src/utils.py" "./src/main.py"'));
      console.log(chalk.gray('  /docs "./**/*.{js,ts}"'));
      return;
    }

    console.log(chalk.blue('🔍 Loading files...'));
    
    try {
      const loadedFiles = await this.session.loadFiles(args);
      
      if (loadedFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No files found matching the patterns'));
        return;
      }
      
      console.log(chalk.green(`✅ Loaded ${loadedFiles.length} files:`));
      loadedFiles.forEach(file => {
        const relativePath = file.path.replace(process.cwd(), '.');
        console.log(chalk.gray(`  • ${relativePath} (${file.language}, ${file.lines} lines)`));
      });
      
      // Auto-scan after loading
      console.log(chalk.blue('\n📋 Auto-scanning for functions and classes...'));
      await this.handleScanCommand([]);
      
    } catch (error) {
      console.error(chalk.red(`Failed to load files: ${error.message}`));
    }
  }

  /**
   * Scan loaded files for functions and classes
   * Usage: /docgen-scan [file1] [file2]...
   */
  async handleScanCommand(args) {
    const status = this.session.getStatus();
    
    if (status.loadedFiles === 0) {
      console.log(chalk.yellow('⚠️  No files loaded. Use /docgen-load <pattern> first'));
      return;
    }

    console.log(chalk.blue('📋 Scanning files for functions and classes...'));
    
    try {
      const results = await this.session.parseFiles(args.length > 0 ? args : null);
      
      console.log(chalk.green(`✅ Scan complete:`));
      console.log(chalk.gray(`  • Functions found: ${results.functions}`));
      console.log(chalk.gray(`  • Classes found: ${results.classes}`));
      
      if (results.errors.length > 0) {
        console.log(chalk.yellow(`  • Parse errors: ${results.errors.length}`));
        if (this.verbose) {
          results.errors.forEach(error => {
            console.log(chalk.red(`    ❌ ${error.fileName}: ${error.error}`));
          });
        }
      }
      
      if (results.functions + results.classes === 0) {
        console.log(chalk.yellow('⚠️  No functions or classes found to document'));
      } else {
        console.log(chalk.gray('\nReady for documentation generation! Use:'));
        console.log(chalk.gray('  /docgen-all     - Generate docs for all items'));
        console.log(chalk.gray('  /docgen-file    - Generate docs for specific file'));
      }
      
    } catch (error) {
      console.error(chalk.red(`Scan failed: ${error.message}`));
    }
  }

  /**
   * Generate documentation for all functions and classes
   * Usage: /docgen-all [--preview]
   */
  async handleGenerateAllCommand(args) {
    const status = this.session.getStatus();
    
    if (status.stats.functionsFound + status.stats.classesFound === 0) {
      console.log(chalk.yellow('⚠️  No functions or classes found. Use /docgen-scan first'));
      return;
    }

    const shouldPreview = args.includes('--preview');
    
    console.log(chalk.blue('✨ Generating documentation for all items...'));
    console.log(chalk.gray(`Processing ${status.stats.functionsFound} functions and ${status.stats.classesFound} classes`));
    
    try {
      const results = await this.session.generateDocumentation();
      
      console.log(chalk.green(`✅ Documentation generation complete:`));
      console.log(chalk.gray(`  • Generated: ${results.generated}/${results.totalItems} items`));
      
      if (results.errors.length > 0) {
        console.log(chalk.yellow(`  • Errors: ${results.errors.length}`));
        if (this.verbose) {
          results.errors.forEach(error => {
            console.log(chalk.red(`    ❌ ${error.fileName}:${error.functionName || error.className}: ${error.error}`));
          });
        }
      }
      
      if (results.generated > 0) {
        if (shouldPreview) {
          await this.handlePreviewCommand([]);
        } else {
          console.log(chalk.gray('\nNext steps:'));
          console.log(chalk.gray('  /docgen-preview - Preview generated documentation'));
          console.log(chalk.gray('  /docgen-apply   - Apply changes to files'));
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`Generation failed: ${error.message}`));
    }
  }

  /**
   * Generate documentation for specific file
   * Usage: /docgen-file <filename>
   */
  async handleGenerateFileCommand(args) {
    if (args.length === 0) {
      console.log(chalk.red('Usage: /docgen-file <filename>'));
      
      // Show available files
      const loadedFiles = Array.from(this.session.loadedFiles.keys());
      if (loadedFiles.length > 0) {
        console.log(chalk.gray('Available files:'));
        loadedFiles.forEach(file => {
          console.log(chalk.gray(`  • ${file}`));
        });
      }
      return;
    }
    const fileName = args[0];
    
    if (!this.session.loadedFiles.has(fileName)) {
      console.log(chalk.red(`File not loaded: ${fileName}`));
      console.log(chalk.gray('Use /docs to load files first'));
      return;
    }

    console.log(chalk.blue(`✨ Generating documentation for ${fileName}...`));
    
    try {
      // Parse specific file if not already parsed
      if (!this.session.parsedFunctions.has(fileName) && !this.session.parsedClasses.has(fileName)) {
        await this.session.parseFiles([fileName]);
      }
      
      const results = await this.session.generateDocumentation();
      
      console.log(chalk.green(`✅ Generated documentation for ${fileName}`));
      console.log(chalk.gray('Use /docgen-preview to review changes'));
      
    } catch (error) {
      console.error(chalk.red(`Failed to generate documentation for ${fileName}: ${error.message}`));
    }
  }

  /**
   * Generate documentation for specific function
   * Usage: /docgen-function <function-name> [file-name]
   */
  async handleGenerateFunctionCommand(args) {
    if (args.length === 0) {
      console.log(chalk.red('Usage: /docgen-function <function-name> [file-name]'));
      
      // Show available functions
      const functions = [];
      for (const [fileName, funcs] of this.session.parsedFunctions) {
        funcs.forEach(func => functions.push({ name: func.name, file: fileName }));
      }
      
      if (functions.length > 0) {
        console.log(chalk.gray('Available functions:'));
        functions.forEach(func => {
          console.log(chalk.gray(`  • ${func.name} (in ${func.file})`));
        });
      }
      return;
    }

    const functionName = args[0];
    const fileName = args[1];
    
    // Find the function
    let targetFile = null;
    let targetFunction = null;
    
    if (fileName) {
      const functions = this.session.parsedFunctions.get(fileName);
      if (functions) {
        targetFunction = functions.find(f => f.name === functionName);
        if (targetFunction) targetFile = fileName;
      }
    } else {
      // Search all files
      for (const [file, functions] of this.session.parsedFunctions) {
        const func = functions.find(f => f.name === functionName);
        if (func) {
          targetFile = file;
          targetFunction = func;
          break;
        }
      }
    }
    
    if (!targetFunction) {
      console.log(chalk.red(`Function '${functionName}' not found${fileName ? ` in ${fileName}` : ''}`));
      return;
    }

    console.log(chalk.blue(`✨ Generating documentation for function: ${functionName}`));
    
    try {
      // Generate documentation for this specific function
      const { createAIProvider } = require('./aiProviderFactory');
      const DocumentationGenerator = require('./documentationGenerator');
      
      const aiProvider = createAIProvider(this.options);
      const docGenerator = new DocumentationGenerator(this.options);
      const fileInfo = this.session.loadedFiles.get(targetFile);
      
      const docstring = await docGenerator.generateFunctionDocumentation(
        targetFunction,
        fileInfo.content,
        fileInfo.language,
        aiProvider
      );
      
      // Store the generated documentation
      const existingDocs = this.session.generatedDocs.get(targetFile) || [];
      const docIndex = existingDocs.findIndex(doc => doc.name === functionName);
      
      const newDoc = {
        type: 'function',
        name: targetFunction.name,
        docstring: docstring,
        startLine: targetFunction.startLine,
        endLine: targetFunction.endLine,
        applied: false,
        generatedAt: new Date()
      };
      
      if (docIndex >= 0) {
        existingDocs[docIndex] = newDoc;
      } else {
        existingDocs.push(newDoc);
      }
      
      this.session.generatedDocs.set(targetFile, existingDocs);
      this.session.stats.docsGenerated++;
      
      console.log(chalk.green(`✅ Generated documentation for function: ${functionName}`));
      console.log(chalk.gray('Use /docgen-preview to review the documentation'));
      
    } catch (error) {
      console.error(chalk.red(`Failed to generate documentation for ${functionName}: ${error.message}`));
    }
  }

  /**
   * Generate documentation for specific class
   * Usage: /docgen-class <class-name> [file-name]
   */
  async handleGenerateClassCommand(args) {
    if (args.length === 0) {
      console.log(chalk.red('Usage: /docgen-class <class-name> [file-name]'));
      
      // Show available classes
      const classes = [];
      for (const [fileName, clss] of this.session.parsedClasses) {
        clss.forEach(cls => classes.push({ name: cls.name, file: fileName }));
      }
      
      if (classes.length > 0) {
        console.log(chalk.gray('Available classes:'));
        classes.forEach(cls => {
          console.log(chalk.gray(`  • ${cls.name} (in ${cls.file})`));
        });
      }
      return;
    }

    const className = args[0];
    const fileName = args[1];
    
    // Find the class (similar logic to function search)
    let targetFile = null;
    let targetClass = null;
    
    if (fileName) {
      const classes = this.session.parsedClasses.get(fileName);
      if (classes) {
        targetClass = classes.find(c => c.name === className);
        if (targetClass) targetFile = fileName;
      }
    } else {
      for (const [file, classes] of this.session.parsedClasses) {
        const cls = classes.find(c => c.name === className);
        if (cls) {
          targetFile = file;
          targetClass = cls;
          break;
        }
      }
    }
    
    if (!targetClass) {
      console.log(chalk.red(`Class '${className}' not found${fileName ? ` in ${fileName}` : ''}`));
      return;
    }

    console.log(chalk.blue(`✨ Generating documentation for class: ${className}`));
    
    try {
      const { createAIProvider } = require('./aiProviderFactory');
      const DocumentationGenerator = require('./documentationGenerator');
      
      const aiProvider = createAIProvider(this.options);
      const docGenerator = new DocumentationGenerator(this.options);
      const fileInfo = this.session.loadedFiles.get(targetFile);
      
      const docstring = await docGenerator.generateClassDocumentation(
        targetClass,
        fileInfo.content,
        fileInfo.language,
        aiProvider
      );
      
      // Store the generated documentation
      const existingDocs = this.session.generatedDocs.get(targetFile) || [];
      const docIndex = existingDocs.findIndex(doc => doc.name === className);
      
      const newDoc = {
        type: 'class',
        name: targetClass.name,
        docstring: docstring,
        startLine: targetClass.startLine,
        endLine: targetClass.endLine,
        applied: false,
        generatedAt: new Date()
      };
      
      if (docIndex >= 0) {
        existingDocs[docIndex] = newDoc;
      } else {
        existingDocs.push(newDoc);
      }
      
      this.session.generatedDocs.set(targetFile, existingDocs);
      this.session.stats.docsGenerated++;
      
      console.log(chalk.green(`✅ Generated documentation for class: ${className}`));
      console.log(chalk.gray('Use /docgen-preview to review the documentation'));
      
    } catch (error) {
      console.error(chalk.red(`Failed to generate documentation for ${className}: ${error.message}`));
    }
  }

  /**
   * Preview generated documentation
   * Usage: /docgen-preview [file-name]
   */
  async handlePreviewCommand(args) {
    const status = this.session.getStatus();
    
    if (!status.hasGeneratedDocs) {
      console.log(chalk.yellow('⚠️  No documentation generated yet'));
      console.log(chalk.gray('Use /docgen-all or /docgen-file to generate documentation first'));
      return;
    }

    const fileName = args[0];
    const previews = this.session.createPreview(fileName ? [fileName] : null);
    
    if (Object.keys(previews).length === 0) {
      console.log(chalk.yellow('⚠️  No pending changes to preview'));
      return;
    }

    console.log(chalk.blue.bold('\n📋 Documentation Preview\n'));
    
    for (const [file, preview] of Object.entries(previews)) {
      console.log(chalk.cyan(`\n=== ${file} ===`));
      console.log(preview);
    }
    
    console.log(chalk.blue.bold('\n--- End Preview ---\n'));
    
    // Ask for confirmation
    const { shouldApply } = await inquirer.prompt([{
      type: 'confirm',
      name: 'shouldApply',
      message: 'Apply these changes to the files?',
      default: false
    }]);
    
    if (shouldApply) {
      await this.handleApplyCommand(fileName ? [fileName] : []);
    } else {
      console.log(chalk.gray('Changes not applied. Use /docgen-apply when ready.'));
    }
  }

  /**
   * Apply pending documentation changes
   * Usage: /docgen-apply [file-name]
   */
  async handleApplyCommand(args) {
    const status = this.session.getStatus();
    
    if (status.pendingChanges === 0) {
      console.log(chalk.yellow('⚠️  No pending changes to apply'));
      console.log(chalk.gray('Use /docgen-preview to create pending changes first'));
      return;
    }

    const fileName = args[0];
    
    console.log(chalk.blue('📝 Applying documentation changes...'));
    
    try {
      const results = await this.session.applyChanges(fileName ? [fileName] : null);
      
      console.log(chalk.green(`✅ Applied changes to ${results.applied} file(s)`));
      
      if (results.backups.length > 0) {
        console.log(chalk.gray(`📦 Created ${results.backups.length} backup(s):`));
        results.backups.forEach(backup => {
          console.log(chalk.gray(`  • ${backup}`));
        });
      }
      
      if (results.errors.length > 0) {
        console.log(chalk.yellow(`⚠️  ${results.errors.length} error(s) occurred:`));
        results.errors.forEach(error => {
          console.log(chalk.red(`  ❌ ${error.fileName}: ${error.error}`));
        });
      }
      
    } catch (error) {
      console.error(chalk.red(`Failed to apply changes: ${error.message}`));
    }
  }

  /**
   * Rollback recent changes
   * Usage: /docgen-rollback [file-name]
   */
  async handleRollbackCommand(args) {
    const fileName = args[0];
    
    if (fileName) {
      const backupInfo = this.session.backupState.get(fileName);
      if (!backupInfo) {
        console.log(chalk.yellow(`⚠️  No backup found for ${fileName}`));
        return;
      }
      
      try {
        const BackupManager = require('./backupManager');
        const backupManager = new BackupManager(this.options);
        
        await backupManager.restoreFromBackup(fileName);
        this.session.backupState.delete(fileName);
        
        console.log(chalk.green(`✅ Rolled back changes to ${fileName}`));
        
      } catch (error) {
        console.error(chalk.red(`Failed to rollback ${fileName}: ${error.message}`));
      }
    } else {
      // Show available backups
      const backups = Array.from(this.session.backupState.entries());
      
      if (backups.length === 0) {
        console.log(chalk.yellow('⚠️  No backups available'));
        return;
      }
      
      console.log(chalk.blue('Available backups:'));
      backups.forEach(([file, backup]) => {
        console.log(chalk.gray(`  • ${file} (${backup.timestamp.toLocaleString()})`));
      });
      console.log(chalk.gray('\nUse: /docgen-rollback <file-name>'));
    }
  }

  /**
   * Show session status
   * Usage: /docgen-status
   */
  async handleStatusCommand(args) {
    const status = this.session.getStatus();
    
    console.log(chalk.blue.bold('\n📊 Documentation Session Status\n'));
    
    console.log(chalk.cyan('Session Info:'));
    console.log(chalk.gray(`  ID: ${status.sessionId}`));
    console.log(chalk.gray(`  Created: ${status.createdAt.toLocaleString()}`));
    console.log(chalk.gray(`  Last Activity: ${status.lastActivity.toLocaleString()}`));
    
    console.log(chalk.cyan('\nFiles:'));
    console.log(chalk.gray(`  Loaded: ${status.loadedFiles}`));
    console.log(chalk.gray(`  Pending Changes: ${status.pendingChanges}`));
    console.log(chalk.gray(`  Backups: ${status.backups}`));
    
    console.log(chalk.cyan('\nStatistics:'));
    console.log(chalk.gray(`  Functions Found: ${status.stats.functionsFound}`));
    console.log(chalk.gray(`  Classes Found: ${status.stats.classesFound}`));
    console.log(chalk.gray(`  Docs Generated: ${status.stats.docsGenerated}`));
    console.log(chalk.gray(`  Changes Applied: ${status.stats.changesApplied}`));
    
    if (status.loadedFiles > 0) {
      console.log(chalk.cyan('\nLoaded Files:'));
      for (const [fileName, fileInfo] of this.session.loadedFiles) {
        console.log(chalk.gray(`  • ${fileName} (${fileInfo.language}, ${fileInfo.lines} lines)`));
      }
    }
  }

  /**
   * Clear session data
   * Usage: /docgen-clear [--files] [--generated] [--all]
   */
  async handleClearCommand(args) {
    const clearAll = args.includes('--all');
    const clearFiles = args.includes('--files') || clearAll;
    const clearGenerated = args.includes('--generated') || clearAll;
    
    if (!clearFiles && !clearGenerated && !clearAll) {
      const { whatToClear } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'whatToClear',
        message: 'What would you like to clear?',
        choices: [
          { name: 'Loaded files', value: 'files' },
          { name: 'Generated documentation', value: 'generated' },
          { name: 'Parsed data (functions/classes)', value: 'parsed' },
          { name: 'Statistics', value: 'stats' }
        ]
      }]);
      
      if (whatToClear.length === 0) {
        console.log(chalk.gray('Nothing cleared'));
        return;
      }
      
      const options = {};
      whatToClear.forEach(item => options[item] = true);
      this.session.clear(options);
      
      console.log(chalk.green(`✅ Cleared: ${whatToClear.join(', ')}`));
    } else {
      this.session.clear({
        files: clearFiles,
        generated: clearGenerated,
        parsed: clearFiles || clearGenerated,
        stats: clearAll
      });
      
      console.log(chalk.green('✅ Session data cleared'));
    }
  }

  /**
   * Show help for documentation commands
   */
  showHelp() {
    console.log(chalk.blue.bold('\n📚 Documentation Commands Help\n'));
    
    const commands = [
      { cmd: '/docs <pattern>', desc: 'Load files matching pattern(s)' },
      { cmd: '/scan', desc: 'Scan loaded files for functions/classes' },
      { cmd: '/generate', desc: 'Generate docs for all functions/classes' },
      { cmd: '/gen', desc: 'Alias for /generate' },
      { cmd: '/preview', desc: 'Preview generated documentation' },
      { cmd: '/apply', desc: 'Apply pending changes to files' },
      { cmd: '/rollback', desc: 'Rollback recent changes' },
      { cmd: '/status', desc: 'Show session status and statistics' },
      { cmd: '/clear', desc: 'Clear session data' },
      { cmd: '/help', desc: 'Show this help message' }
    ];
    
    commands.forEach(({ cmd, desc }) => {
      console.log(chalk.cyan(`${cmd.padEnd(20)} `) + chalk.gray(desc));
    });
    
    console.log(chalk.blue.bold('\n💡 Typical Workflow:\n'));
    console.log(chalk.gray('1. /docs "./src/**/*.py"'));
    console.log(chalk.gray('2. /scan'));
    console.log(chalk.gray('3. /generate'));
    console.log(chalk.gray('4. /preview'));
    console.log(chalk.gray('5. /apply'));
  }
}

module.exports = DocumentationCommandHandler;
