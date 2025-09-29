const path = require('path');
const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');
const FileDiscovery = require('./fileDiscovery');
const ParserManager = require('./parserManager');
const HuggingFaceAPI = require('./huggingFaceAPI');
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
  console.log(chalk.blue.bold('🤖 DocAI - AI-Powered Documentation Generator'));
  console.log(chalk.gray('=====================================\n'));

  // Resolve configuration: DEFAULTS <- config file <- env <- CLI
  const { options, configPath } = await resolveOptions(cliOptions);

  // Optionally save current effective options as config file
  if (options.saveConfig) {
    const savedPath = await saveConfigFile(options.project, options);
    console.log(chalk.gray(`Saved configuration to ${savedPath}`));
  }

  // Validate options
  if (!options.lowLevel && !options.highLevel) {
    console.error(chalk.red('Error: You must specify either --low-level or --high-level'));
    process.exit(1);
  }

  if (options.inline && !options.lowLevel) {
    console.error(chalk.red('Error: --inline requires --low-level'));
    process.exit(1);
  }

  // Validate HF_TOKEN for AI generation
  if (!options.hf_token) {
    console.error(chalk.red('Error: HF_TOKEN is required for AI-powered documentation generation.'));
    console.error(chalk.gray('Please set it as an environment variable: export HF_TOKEN=your_token_here'));
    console.error(chalk.gray('Or add it to your .docaiConfig.json file: {"hf_token": "your_token_here"}'));
    process.exit(1);
  }

  // Initialize managers
  const errorManager = new ErrorManager(options);
  const progressManager = new ProgressManager(options);
  const performanceOptimizer = new PerformanceOptimizer(options);

  // Show what we're going to do
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

  // Handle watch mode (only for low-level processing)
  if (options.watch && options.lowLevel && !options.highLevel) {
    const watchMode = new WatchMode(options);
    const fileDiscovery = new FileDiscovery(options);
    const files = await fileDiscovery.discoverFiles();
    
    if (files.length === 0) {
      console.log(chalk.yellow('No files found to watch.'));
      return;
    }
    
    await watchMode.startWatching(files, options);
    return; // Watch mode runs indefinitely
  }

  // Initialize file discovery
  const fileDiscovery = new FileDiscovery(options);
  
  try {
    // Discover files to process
    const discoverySpinner = progressManager.startSpinner('discovery', '🔍 Discovering files...');
    const files = await fileDiscovery.discoverFiles();
    progressManager.stopSpinner('discovery', 'succeed', `Found ${files.length} files`);
    
    if (files.length === 0) {
      console.log(chalk.yellow('No files found to process.'));
      console.log(chalk.gray('Make sure you have Python (.py), JavaScript (.js), or TypeScript (.ts) files in your project.'));
      return;
    }
    
    // Validate files
    const { validFiles, errors } = await fileDiscovery.validateFiles(files);
    
    if (validFiles.length === 0) {
      console.log(chalk.red('No valid files found to process.'));
      if (errors.length > 0) {
        console.log(chalk.red('All files had access issues.'));
        errors.forEach(error => errorManager.handleFileError(error.filePath, new Error(error.message), 'validation'));
      }
      errorManager.printSummary();
      process.exit(errorManager.getExitCode());
    }
    
    progressManager.log(`Found ${validFiles.length} files ready for processing!`, 'success');
    
    // Initialize parser manager
    const parserManager = new ParserManager(options);
    
    // Parse files to extract functions and classes
    const parsingSpinner = progressManager.startSpinner('parsing', '🔍 Parsing files...');
    
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
      } else {
        convertedResults.summary.errors++;
      }
    });
    
    progressManager.stopSpinner('parsing', 'succeed', `Parsed ${convertedResults.summary.parsedFiles} files`);
    
    // Use converted results for the rest of the processing
    parseResults = convertedResults;
    
    // Handle parsing errors
    if (parseResults.summary.errors > 0) {
      // Check all language results for errors
      [...parseResults.python, ...parseResults.javascript, ...parseResults.typescript].forEach(fileResult => {
        if (fileResult.errors && fileResult.errors.length > 0) {
          fileResult.errors.forEach(error => {
            errorManager.handleParsingError(fileResult.file_path, new Error(error), fileResult.language);
          });
        }
      });
    }
    
    // Get all functions and classes for processing
    const allFunctions = parserManager.getAllFunctions(parseResults);
    const allClasses = parserManager.getAllClasses(parseResults);
    
    console.log(chalk.blue(`\n📊 Parsing Complete:`));
    console.log(chalk.gray(`  Functions found: ${allFunctions.length}`));
    console.log(chalk.gray(`  Classes found: ${allClasses.length}`));
    console.log(chalk.gray(`  Files with errors: ${parseResults.summary.errors}`));
    
    if (options.preview && !options.inline) {
      // Show basic preview without AI generation
      console.log(chalk.blue('\n📋 Preview Mode - Functions and Classes to be documented:'));
      
      // Show functions without docstrings
      const functionsNeedingDocs = allFunctions.filter(func => !func.has_docstring);
      if (functionsNeedingDocs.length > 0) {
        console.log(chalk.yellow('\n🔧 Functions needing documentation:'));
        functionsNeedingDocs.forEach((func, index) => {
          console.log(chalk.gray(`  ${index + 1}. ${func.name}() in ${func.file_path} (line ${func.line})`));
        });
      }
      
      // Show classes without docstrings
      const classesNeedingDocs = allClasses.filter(cls => !cls.has_docstring);
      if (classesNeedingDocs.length > 0) {
        console.log(chalk.yellow('\n🏗️  Classes needing documentation:'));
        classesNeedingDocs.forEach((cls, index) => {
          console.log(chalk.gray(`  ${index + 1}. ${cls.name} in ${cls.file_path} (line ${cls.line})`));
        });
      }
      
      if (functionsNeedingDocs.length === 0 && classesNeedingDocs.length === 0) {
        console.log(chalk.green('\n✅ All functions and classes already have documentation!'));
      }
      
      console.log(chalk.gray('\nNext: AI-powered documentation generation will be implemented...'));
    } else if (options.highLevel) {
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
      // Initialize AI API for documentation generation
      try {
        const aiAPI = new HuggingFaceAPI(options);
        
        // Test API connection
        console.log(chalk.blue('\n🤖 Testing AI API connection...'));
        const connectionTest = await aiAPI.testConnection();
        
        if (!connectionTest.success) {
          console.error(chalk.red('❌ AI API connection failed:'), connectionTest.message);
          console.error(chalk.gray('Please check your HF_TOKEN and try again.'));
          return;
        }
        
        console.log(chalk.green('✅ AI API connection successful!'));
        
        // Generate documentation for functions and classes
        if (allFunctions.length > 0 || allClasses.length > 0) {
          console.log(chalk.blue('\n📝 Generating AI-powered documentation...'));
          
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
              if (!func.has_docstring) {
                allItems.push({ type: 'function', ...func, file_path: fileResult.file_path, language: fileResult.language });
              }
            });
          }
          if (fileResult.classes) {
            fileResult.classes.forEach(cls => {
              if (!cls.has_docstring) {
                allItems.push({ type: 'class', ...cls, file_path: fileResult.file_path, language: fileResult.language });
              }
            });
          }
        });
        
        // Use performance optimization for AI generation
        const aiResults = await performanceOptimizer.batchAPICalls(
          allItems,
          async (item) => {
            return await docGenerator.generateDocstringForItem(item, styleAnalysis);
          },
          5 // Batch size for API calls
        );
        
        // Convert results back to expected format
        const generationResults = {
          generated: aiResults.filter(result => result.success).map(result => result.result),
          errors: aiResults.filter(result => !result.success).map(result => result.error),
          summary: {
            generatedFunctions: aiResults.filter(r => r.success && r.result && r.result.type === 'function').length,
            generatedClasses: aiResults.filter(r => r.success && r.result && r.result.type === 'class').length,
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
          
          // Create backups if requested
          if (options.backup) {
            const backupSpinner = progressManager.startSpinner('backup', '💾 Creating file backups...');
            const filesToBackup = [...new Set(generationResults.generated.map(item => item.file))];
            const backupResults = await backupManager.createBackups(filesToBackup);
            progressManager.stopSpinner('backup', 'succeed', `Backed up ${backupResults.successful.length} files`);
            
            if (backupResults.failed.length > 0) {
              progressManager.log(`Failed to backup ${backupResults.failed.length} files`, 'error');
              backupResults.failed.forEach(failure => {
                errorManager.handleFileError(failure.filePath, new Error(failure.error), 'backup');
              });
            }
          }
          
          // Initialize file modifier
          const fileModifier = new FileModifier(options);
          
          // Insert docstrings into files
          const modificationSpinner = progressManager.startSpinner('modification', '📝 Inserting docstrings...');
          const modificationResults = await fileModifier.insertDocstrings(generationResults, backupManager);
          progressManager.stopSpinner('modification', 'succeed', `Modified ${modificationResults.summary.modifiedFiles} files`);
          
          // Handle modification errors
          if (modificationResults.failed.length > 0) {
            modificationResults.failed.forEach(failure => {
              errorManager.handleFileError(failure.filePath, new Error(failure.error), 'modification');
            });
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
          
          // Cleanup backups if requested
          if (options.cleanup && options.backup) {
            const cleanupSpinner = progressManager.startSpinner('cleanup', '🧹 Cleaning up backup files...');
            const cleanupResults = await backupManager.cleanupBackups();
            progressManager.stopSpinner('cleanup', 'succeed', `Cleaned up ${cleanupResults.cleaned.length} files`);
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
    
    // Show performance summary
    performanceOptimizer.showPerformanceSummary();
    
    // Show final summary
    progressManager.showFinalSummary({
      summary: errorManager.stats,
      errors: errorManager.errors
    });
    
    // Save error log if requested
    if (options.logErrors) {
      const logPath = path.join(options.project, 'docai-errors.json');
      const logResult = await errorManager.saveErrorLog(logPath);
      if (logResult.success) {
        progressManager.log(`Error log saved to: ${logResult.logPath}`, 'info');
      }
    }
    
    // Exit with appropriate code
    process.exit(errorManager.getExitCode());
    
  } catch (error) {
    errorManager.handleError(error, 'File Discovery', {});
    console.error(chalk.red('Error during file discovery:'), error.message);
    errorManager.printSummary();
    process.exit(errorManager.getExitCode());
  }
}

module.exports = {
  generateDocumentation
};
