const path = require('path');
const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');
const fs = require('fs');
const FileDiscovery = require('./fileDiscovery');
const ParserManager = require('./parserManager');
const DocumentationAnalyzer = require('./documentationAnalyzer');
const DocumentationGenerator = require('./documentationGenerator');
const BackupManager = require('./backupManager');
const FileModifier = require('./fileModifier');
const ErrorManager = require('./errorManager');
const PreviewSystem = require('./previewSystem');
const ProgressManager = require('./progressManager');
const WatchMode = require('./watchMode');
const ReadmeGenerator = require('./readmeGenerator');
const PerformanceOptimizer = require('./performanceOptimizer');
const { resolveOptions, saveConfigFile } = require('./config');
const { createAIProvider } = require('./aiProviderFactory');

/**
 * Generate project information
 * @param {Object} options - CLI options
 * @returns {Promise<Object>} Project information
 */
async function generateProjectInfo(options) {
  const packageJsonPath = path.join(options.project, 'package.json');
  
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    return {
      name: packageJson.name || path.basename(options.project),
      description: packageJson.description || '',
      version: packageJson.version || '1.0.0',
      author: packageJson.author || '',
      license: packageJson.license || 'MIT'
    };
  } catch (error) {
    // No package.json found, use defaults
    return {
      name: path.basename(options.project),
      description: 'A well-documented project',
      version: '1.0.0',
      author: '',
      license: 'MIT'
    };
  }
}

/**
 * Main function to generate documentation
 * @param {Object} options - CLI options
 */
async function generateDocumentation(cliOptions) {
  // Resolve configuration: DEFAULTS <- config file <- env <- CLI
  const { options, configPath } = await resolveOptions(cliOptions);

  if (options.verbose) {
    console.log(chalk.blue.bold('🤖 DocAI - AI-Powered Documentation Generator'));
    console.log(chalk.gray('=====================================\n'));
  } else {
    console.log(chalk.blue.bold('🤖 DocAI'));
  }

  // Optionally save current effective options as config file
  if (options.saveConfig) {
    const savedPath = await saveConfigFile(options.project, options);
    if (options.verbose) console.log(chalk.gray(`Saved configuration to ${savedPath}`));
  }

  // Set inline behavior based on output option
  if (options.lowLevel) {
    if (options.output) {
      // User wants docs in separate location
      options.inline = false;
      options.outputDir = options.output;
      if (options.verbose) {
        console.log(chalk.gray(`Documentation will be saved to: ${options.output}`));
      }
    } else {
      // Default: modify source code (inline)
      options.inline = true;
      if (options.verbose) {
        console.log(chalk.gray('Documentation will be inserted into source files (inline mode)'));
      }
    }
  }

  // Provider/key validation will be handled by provider's testConnection later

  // Initialize managers
  const errorManager = new ErrorManager(options);
  const progressManager = new ProgressManager(options);
  const performanceOptimizer = new PerformanceOptimizer(options);

  // Show what we're going to do (only in verbose mode)
  if (options.verbose) {
    console.log(chalk.yellow('Configuration:'));
    console.log(`  Project: ${options.project}`);
    console.log(`  Language: ${options.lang}`);
    console.log(`  Mode: ${options.highLevel ? 'High-level (README)' : options.lowLevel ? 'Low-level (functions/classes)' : 'Low-level (functions/classes)'}`);
    console.log(`  Inline: ${options.inline ? 'Yes' : 'No'}`);
    console.log(`  Preview: ${options.preview ? 'Yes' : 'No'}`);
    console.log(`  Backup: ${options.backup ? 'Yes' : 'No'}`);
    console.log(`  Watch: ${options.watch ? 'Yes' : 'No'}`);
    console.log(`  Interactive: ${options.interactive ? 'Yes' : 'No'}`);
    console.log(`  Strict: ${options.strict ? 'Yes' : 'No'}`);
    console.log('');
  }

  // Handle watch mode (only for low-level processing)
  if (options.watch && options.lowLevel && !options.highLevel) {
    const watchMode = new WatchMode(options);
    const fileDiscovery = new FileDiscovery(options);
    const files = await fileDiscovery.discoverFiles();
    
    if (files.length === 0) {
      console.log(chalk.yellow('No files found to watch.'));
      return;
    }
    
    await watchMode.startWatching(files, options, generateDocumentation);
    return; // Watch mode runs indefinitely
  }

  // Initialize file discovery
  const fileDiscovery = new FileDiscovery(options);
  
  try {
    // Discover files to process
    const discoverySpinner = options.verbose ? progressManager.startSpinner('discovery', '🔍 Discovering files...') : null;
    const files = await fileDiscovery.discoverFiles();
    if (options.verbose) progressManager.stopSpinner('discovery', 'succeed', `Found ${files.length} files`);
    
    if (files.length === 0) {
      console.log(chalk.yellow('⚠️  No files found to process.'));
      if (options.verbose) console.log(chalk.gray('Make sure you have Python (.py), JavaScript (.js), or TypeScript (.ts) files in your project.'));
      return;
    }
    
    // Validate files
    const { validFiles, errors } = await fileDiscovery.validateFiles(files);
    
    if (validFiles.length === 0) {
      console.log(chalk.red('❌ No valid files found to process.'));
      if (errors.length > 0 && options.verbose) {
        console.log(chalk.red('All files had access issues.'));
        errors.forEach(error => errorManager.handleFileError(error.filePath, new Error(error.message), 'validation'));
      }
      errorManager.printSummary();
      process.exit(errorManager.getExitCode());
    }
    
    if (!options.verbose) {
      console.log(chalk.gray(`📁 Processing ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}...`));
    } else {
      progressManager.log(`Found ${validFiles.length} files ready for processing!`, 'success');
    }
    
    // Initialize parser manager
    const parserManager = new ParserManager(options);
    
    // Parse files to extract functions and classes
    const parsingSpinner = options.verbose ? progressManager.startSpinner('parsing', '🔍 Parsing files...') : null;
    
    // Use performance optimization for parsing
    let parseResults = await performanceOptimizer.processFilesInParallel(
      validFiles,
      async (file) => {
        // Check cache first
        const cached = performanceOptimizer.getCachedParseResult(file.path, file.size);
        if (cached) {
          return cached;
        }
        
        // Parse file
        const result = await parserManager.parseFile(file);
        
        // Cache result
        performanceOptimizer.cacheParseResult(file.path, result);
        
        return result;
      }
    );
    
    // Convert parallel results back to expected format
    const convertedResults = {
      python: [],
      javascript: [],
      typescript: [],
      summary: {
        parsedFiles: 0,
        errors: 0
      }
    };
    
    parseResults.forEach(result => {
      if (result.success && result.result) {
        const lang = result.result.language || 'python';
        if (convertedResults[lang]) {
          convertedResults[lang].push(result.result);
        }
        convertedResults.summary.parsedFiles++;
        
        // Count errors inside the result (e.g., syntax errors)
        if (result.result.errors && result.result.errors.length > 0) {
          convertedResults.summary.errors += result.result.errors.length;
        }
      } else {
        convertedResults.summary.errors++;
      }
    });
    
    if (options.verbose) progressManager.stopSpinner('parsing', 'succeed', `Parsed ${convertedResults.summary.parsedFiles} files`);
    
    // Use converted results for the rest of the processing
    parseResults = convertedResults;
    
    // Handle parsing errors
    if (parseResults.summary.errors > 0) {
      console.log(chalk.red.bold('\n╔════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.red.bold('║                    ⚠️  PARSING ERRORS DETECTED ⚠️               ║'));
      console.log(chalk.red.bold('╚════════════════════════════════════════════════════════════════╝'));
      console.log('');
      
      // Check all language results for errors
      let errorCount = 0;
      [...parseResults.python, ...parseResults.javascript, ...parseResults.typescript].forEach(fileResult => {
        if (fileResult.errors && fileResult.errors.length > 0) {
          errorCount++;
          console.log(chalk.red.bold(`❌ File ${errorCount}: ${fileResult.file_path}`));
          console.log(chalk.red('   └─ Errors:'));
          fileResult.errors.forEach((error, idx) => {
            console.log(chalk.yellow(`      ${idx + 1}. ${error}`));
            errorManager.handleParsingError(fileResult.file_path, new Error(error), fileResult.language);
          });
          console.log('');
        }
      });
      
      console.log(chalk.red.bold('💡 Action Required:'));
      console.log(chalk.yellow('   • Fix the syntax errors in the files listed above'));
      console.log(chalk.yellow('   • Run your code through a linter or Python/JS compiler'));
      console.log(chalk.yellow('   • Re-run DocAI after fixing the errors'));
      console.log('');
    }
    
    // Get all functions and classes for processing
    const allFunctions = parserManager.getAllFunctions(parseResults);
    const allClasses = parserManager.getAllClasses(parseResults);
    
    if (options.verbose) {
      console.log(chalk.blue.bold(`\n📊 Parsing Summary:`));
      console.log(chalk.blue('═══════════════════'));
      console.log(chalk.green(`  ✓ Functions found: ${allFunctions.length}`));
      console.log(chalk.green(`  ✓ Classes found: ${allClasses.length}`));
      
      if (parseResults.summary.errors > 0) {
        console.log(chalk.red.bold(`  ✗ Files with errors: ${parseResults.summary.errors}`));
      } else {
        console.log(chalk.green(`  ✓ Files with errors: 0`));
      }
    } else if (parseResults.summary.errors === 0) {
      console.log(chalk.green(`✓ Found ${allFunctions.length} function${allFunctions.length !== 1 ? 's' : ''}, ${allClasses.length} class${allClasses.length !== 1 ? 'es' : ''}`));
    }
    
    // Check for existing documentation before proceeding
    const functionsWithDocs = allFunctions.filter(func => func.has_docstring);
    const classesWithDocs = allClasses.filter(cls => cls.has_docstring);
    const totalWithDocs = functionsWithDocs.length + classesWithDocs.length;
    
    if (totalWithDocs > 0 && !options.force && !options.highLevel) {
      console.log(chalk.yellow(`\n📋 Found ${totalWithDocs} items that already have documentation:`));
      
      functionsWithDocs.forEach((func, index) => {
        console.log(chalk.gray(`  ${index + 1}. function: ${func.name}() in ${func.file_path} (line ${func.line})`));
      });
      classesWithDocs.forEach((cls, index) => {
        console.log(chalk.gray(`  ${functionsWithDocs.length + index + 1}. class: ${cls.name} in ${cls.file_path} (line ${cls.line})`));
      });
      
      const inquirer = require('inquirer').default || require('inquirer');
      const overrideChoice = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do with existing documentation?',
          choices: [
            { name: '🔄 Override all existing documentation', value: 'override_all' },
            { name: '⏭️  Skip existing documentation (do nothing)', value: 'skip_existing' },
            { name: '🛑 Cancel operation', value: 'cancel' }
          ]
        }
      ]);

      if (overrideChoice.action === 'cancel') {
        console.log(chalk.gray('Operation cancelled.'));
        return;
      } else if (overrideChoice.action === 'override_all') {
        console.log(chalk.blue('✅ Will override existing documentation'));
        // Set force flag to override existing docs
        options.force = true;
      } else {
        console.log(chalk.blue('✅ Will skip existing documentation'));
      }
    }
    
    if (options.highLevel) {
      // Phase 5.1: High-level README Generation
      console.log(chalk.blue('\n📚 Phase 5.1: High-level README Generation'));
      console.log(chalk.gray('========================================='));
      
      try {
        // Generate project information
        const projectInfo = await generateProjectInfo(options);
        
        // Initialize README generator
        const readmeGenerator = new ReadmeGenerator(options);
        
        // Generate README
        const readmeResults = await readmeGenerator.generateReadme(parseResults, projectInfo);
        
        if (readmeResults.success) {
          console.log(chalk.green(`\n✅ README generated successfully!`));
          console.log(chalk.gray(`Output: ${readmeResults.outputFile}`));
          console.log(chalk.gray(`Content length: ${readmeResults.contentLength} characters`));
          
          // Show project analysis
          const analysis = readmeResults.projectAnalysis;
          console.log(chalk.blue('\n📊 Project Analysis:'));
          console.log(chalk.gray(`  Project Type: ${analysis.projectType}`));
          console.log(chalk.gray(`  Functions: ${analysis.functions.length}`));
          console.log(chalk.gray(`  Classes: ${analysis.classes.length}`));
          console.log(chalk.gray(`  Key Features: ${analysis.keyFeatures.length}`));
          console.log(chalk.gray(`  Dependencies: ${analysis.dependencies.python.length + analysis.dependencies.nodejs.length}`));
        } else {
          console.log(chalk.red(`❌ README generation failed: ${readmeResults.error}`));
          errorManager.handleError(new Error(readmeResults.error), 'README Generation', {});
        }
        
      } catch (error) {
        console.error(chalk.red('Error generating README:'), error.message);
        errorManager.handleError(error, 'README Generation', {});
      }
      
    } else {
      // Initialize AI Provider for documentation generation
      try {
        const aiAPI = createAIProvider(options);
        
        // Test API connection
        if (options.verbose) console.log(chalk.blue('\n🤖 Testing AI provider connection...'));
        const connectionTest = await aiAPI.testConnection();
        
        if (!connectionTest.success) {
          console.error(chalk.red('❌ AI provider connection failed:'), connectionTest.message);
          if (options.verbose) console.error(chalk.gray('Please check your provider configuration and API key (e.g., GOOGLE_API_KEY for Gemini or HF_TOKEN for Hugging Face).'));
          return;
        }
        
        if (options.verbose) console.log(chalk.green('✅ AI provider connection successful!'));
        
        // Generate documentation for functions and classes
        if (allFunctions.length > 0 || allClasses.length > 0) {
          if (!options.verbose) {
            console.log(chalk.blue('🤖 Generating documentation...'));
          } else {
            console.log(chalk.blue('\n📝 Generating AI-powered documentation...'));
          }
          
          // Analyze existing documentation styles
          const styleAnalysis = new DocumentationAnalyzer(options).analyzeDocumentationStyles(parseResults);
          
        // Generate documentation using AI with performance optimization
        const generationSpinner = progressManager.startSpinner('generation', '🤖 Generating documentation...');
        const docGenerator = new DocumentationGenerator(options);
        
        // Prepare items for batch processing
        const allItems = [];
        
        [...parseResults.python, ...parseResults.javascript, ...parseResults.typescript].forEach(fileResult => {
          if (fileResult.functions) {
            fileResult.functions.forEach(func => {
              if (!func.has_docstring || options.force) {
                allItems.push({ type: 'function', ...func, file_path: fileResult.file_path, language: fileResult.language });
              }
            });
          }
          if (fileResult.classes) {
            fileResult.classes.forEach(cls => {
              if (!cls.has_docstring || options.force) {
                allItems.push({ type: 'class', ...cls, file_path: fileResult.file_path, language: fileResult.language });
              }
            });
          }
        });
        
        // Use performance optimization for AI generation
        const aiResults = await performanceOptimizer.batchAPICalls(
          allItems,
          async (item) => {
            try {
              let result;
              if (item.type === 'function') {
                result = await docGenerator.generateFunctionDocstring(item, styleAnalysis);
              } else if (item.type === 'class') {
                result = await docGenerator.generateClassDocstring(item, styleAnalysis);
              } else {
                throw new Error(`Unknown item type: ${item.type}`);
              }
              
              // Wrap successful result with original item information
              return { success: true, result, item };
            } catch (error) {
              // Wrap failed result with original item information
              return { success: false, error: error.message, item };
            }
          },
          5 // Batch size for API calls
        );
        
        // Convert results back to expected format
        const generationResults = {
          generated: aiResults.filter(result => result.success).map(result => ({
            type: result.item.type,
            name: result.item.name,
            file: result.item.file_path, // Convert file_path to file for preview system
            line: result.item.line,
            docstring: result.result.text,
            language: result.item.language
          })),
          errors: aiResults.filter(result => !result.success).map(result => result.error),
          summary: {
            generatedFunctions: aiResults.filter(r => r.success && r.item.type === 'function').length,
            generatedClasses: aiResults.filter(r => r.success && r.item.type === 'class').length,
            skippedFunctions: 0,
            skippedClasses: 0,
            errors: aiResults.filter(r => !r.success).length
          }
        };
        
        progressManager.stopSpinner('generation', 'succeed', `Generated ${generationResults.summary.generatedFunctions + generationResults.summary.generatedClasses} items`);
        
        // Handle generation errors
        if (generationResults.summary.errors > 0) {
          generationResults.errors.forEach(error => {
            errorManager.handleError(new Error(error), 'AI Generation', {});
          });
        }
        
        // Show generation results
        progressManager.log(`Generated: ${generationResults.summary.generatedFunctions} functions, ${generationResults.summary.generatedClasses} classes`, 'success');
        progressManager.log(`Skipped: ${generationResults.summary.skippedFunctions} functions, ${generationResults.summary.skippedClasses} classes`, 'info');
        
        if (generationResults.generated.length > 0) {
          // Initialize preview system
          const previewSystem = new PreviewSystem(options);
          
          // Show preview and get user decisions
          const previewResults = await previewSystem.showPreview(generationResults, parseResults);
          
          // Show final confirmation
          const confirmed = await previewSystem.showFinalConfirmation(previewResults);
          
          if (!confirmed) {
            console.log(chalk.yellow('Operation cancelled by user.'));
            return;
          }
          
          // Update generation results with only approved items
          generationResults.generated = previewResults.approved;
        }
        
        // Phase 3: File Operations & Safety
        if (options.inline && generationResults.generated.length > 0) {
          progressManager.log('Starting file operations...', 'info');
          
          // Initialize backup manager
          const backupManager = new BackupManager(options);
          
          // ALWAYS create backups (safety first!)
          const backupSpinner = progressManager.startSpinner('backup', '💾 Creating safety backups...');
          const filesToBackup = [...new Set(generationResults.generated.map(item => item.file))];
          const backupResults = await backupManager.createBackups(filesToBackup);
          progressManager.stopSpinner('backup', 'succeed', `Backed up ${backupResults.successful.length} files`);
          
          if (backupResults.failed.length > 0) {
            progressManager.log(`Failed to backup ${backupResults.failed.length} files`, 'error');
            backupResults.failed.forEach(failure => {
              errorManager.handleFileError(failure.filePath, new Error(failure.error), 'backup');
            });
            // If backup fails, don't proceed
            console.log(chalk.red('\n❌ Cannot proceed without backups. Please check file permissions.'));
            process.exit(1);
          }
          
          // Initialize file modifier
          const fileModifier = new FileModifier(options);
          
          // Insert docstrings into files
          const modificationSpinner = progressManager.startSpinner('modification', '📝 Inserting docstrings...');
          const modificationResults = await fileModifier.insertDocstrings(generationResults, backupManager);
          progressManager.stopSpinner('modification', 'succeed', `Modified ${modificationResults.summary.modifiedFiles} files`);
          
          // Handle modification errors and restore if needed
          if (modificationResults.failed.length > 0) {
            console.log(chalk.red('\n⚠️  Some files failed to modify. Restoring from backups...'));
            
            // Restore failed files from backup
            for (const failure of modificationResults.failed) {
              const restoreResult = await backupManager.restoreFromBackup(failure.filePath);
              if (restoreResult.success) {
                console.log(chalk.green(`✓ Restored ${path.basename(failure.filePath)}`));
              } else {
                console.log(chalk.red(`✗ Failed to restore ${path.basename(failure.filePath)}`));
              }
              errorManager.handleFileError(failure.filePath, new Error(failure.error), 'modification');
            }
          }
          
          // Update statistics
          modificationResults.successful.forEach(result => {
            errorManager.updateStats('success', { filePath: result.filePath, modifications: result.modifications });
            progressManager.logFileResult(result.filePath, result);
          });
          modificationResults.failed.forEach(result => {
            errorManager.updateStats('failed', { filePath: result.filePath });
            progressManager.logFileResult(result.filePath, result);
          });
          
          // Auto-cleanup backups on success
          if (modificationResults.successful.length > 0 && modificationResults.failed.length === 0) {
            // All successful - clean up backups
            const cleanupSpinner = progressManager.startSpinner('cleanup', '🧹 Cleaning up backup files...');
            const cleanupResults = await backupManager.cleanupBackups();
            progressManager.stopSpinner('cleanup', 'succeed', `Cleaned up ${cleanupResults.cleaned.length} backup files`);
            
            if (!options.verbose) {
              console.log(chalk.gray('💡 Backups automatically removed (all changes successful)'));
            }
          } else if (modificationResults.failed.length > 0) {
            // Some failed - keep backups
            console.log(chalk.yellow('\n💾 Backup files kept for failed modifications'));
            console.log(chalk.gray('   You can manually restore from .bak files if needed'));
          }
        }
        } else {
          console.log(chalk.yellow('No functions or classes found to document.'));
        }
        
      } catch (error) {
        errorManager.handleError(error, 'AI API Initialization', {});
        console.error(chalk.red('Error initializing AI API:'), error.message);
        throw error;
      }
    }
    
    // Show performance summary (only in verbose mode)
    if (options.verbose) {
      performanceOptimizer.showPerformanceSummary();
    }
    
    // Show final summary
    progressManager.showFinalSummary({
      summary: errorManager.stats,
      errors: errorManager.errors
    });
    
    // Save error log if requested
    if (options.logErrors) {
      const logPath = path.join(options.project, 'docai-errors.json');
      const logResult = await errorManager.saveErrorLog(logPath);
      if (logResult.success && options.verbose) {
        progressManager.log(`Error log saved to: ${logResult.logPath}`, 'info');
      }
    }
    
    // Exit with appropriate code (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      process.exit(errorManager.getExitCode());
    }
    
  } catch (error) {
    errorManager.handleError(error, 'File Discovery', {});
    console.error(chalk.red('Error during file discovery:'), error.message);
    errorManager.printSummary();
    if (process.env.NODE_ENV !== 'test') {
      process.exit(errorManager.getExitCode());
    }
  }
}

module.exports = {
  generateDocumentation
};
