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
const { resolveOptions, saveConfigFile } = require('./config');

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

  // Initialize error manager
  const errorManager = new ErrorManager(options);

  // Show what we're going to do
  console.log(chalk.yellow('Configuration:'));
  console.log(`  Project: ${options.project}`);
  console.log(`  Language: ${options.lang}`);
  console.log(`  Mode: ${options.lowLevel ? 'Low-level (functions/classes)' : 'High-level (README)'}`);
  console.log(`  Inline: ${options.inline ? 'Yes' : 'No'}`);
  console.log(`  Preview: ${options.preview ? 'Yes' : 'No'}`);
  console.log(`  Backup: ${options.backup ? 'Yes' : 'No'}`);
  console.log(`  Strict: ${options.strict ? 'Yes' : 'No'}`);
  console.log('');

  // Initialize file discovery
  const fileDiscovery = new FileDiscovery(options);
  
  try {
    // Discover files to process
    const files = await fileDiscovery.discoverFiles();
    
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
    
    console.log(chalk.green(`\n✅ Found ${validFiles.length} files ready for processing!`));
    
    // Initialize parser manager
    const parserManager = new ParserManager(options);
    
    // Parse files to extract functions and classes
    const parseResults = await parserManager.parseFiles(validFiles);
    
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
    
    if (options.preview) {
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
          
        // Generate documentation using AI
        const docGenerator = new DocumentationGenerator(options);
        const generationResults = await docGenerator.generateDocumentation(parseResults, styleAnalysis);
        
        // Handle generation errors
        if (generationResults.summary.errors > 0) {
          generationResults.errors.forEach(error => {
            errorManager.handleError(new Error(error), 'AI Generation', {});
          });
        }
        
        // Show generation results
        console.log(chalk.green('\n✅ Documentation generation completed!'));
        console.log(chalk.gray(`Generated: ${generationResults.summary.generatedFunctions} functions, ${generationResults.summary.generatedClasses} classes`));
        console.log(chalk.gray(`Skipped: ${generationResults.summary.skippedFunctions} functions, ${generationResults.summary.skippedClasses} classes`));
        console.log(chalk.gray(`Errors: ${generationResults.summary.errors}`));
        
        if (generationResults.generated.length > 0) {
          console.log(chalk.blue('\n📋 Generated Documentation Preview:'));
          generationResults.generated.slice(0, 3).forEach((item, index) => {
            console.log(chalk.gray(`  ${index + 1}. ${item.type} ${item.name}() in ${item.file}`));
            console.log(chalk.gray(`     ${item.docstring.substring(0, 100)}...`));
          });
          if (generationResults.generated.length > 3) {
            console.log(chalk.gray(`     ... and ${generationResults.generated.length - 3} more`));
          }
        }
        
        // Phase 3: File Operations & Safety
        if (options.inline && generationResults.generated.length > 0) {
          console.log(chalk.blue('\n🔧 Phase 3: File Operations & Safety'));
          console.log(chalk.gray('==================================='));
          
          // Initialize backup manager
          const backupManager = new BackupManager(options);
          
          // Create backups if requested
          if (options.backup) {
            console.log(chalk.blue('\n💾 Creating file backups...'));
            const filesToBackup = [...new Set(generationResults.generated.map(item => item.file))];
            const backupResults = await backupManager.createBackups(filesToBackup);
            
            if (backupResults.failed.length > 0) {
              console.log(chalk.red(`❌ Failed to backup ${backupResults.failed.length} files`));
              backupResults.failed.forEach(failure => {
                errorManager.handleFileError(failure.filePath, new Error(failure.error), 'backup');
              });
            } else {
              console.log(chalk.green(`✅ Successfully backed up ${backupResults.successful.length} files`));
            }
          }
          
          // Initialize file modifier
          const fileModifier = new FileModifier(options);
          
          // Insert docstrings into files
          console.log(chalk.blue('\n📝 Inserting docstrings into files...'));
          const modificationResults = await fileModifier.insertDocstrings(generationResults, backupManager);
          
          // Handle modification errors
          if (modificationResults.failed.length > 0) {
            modificationResults.failed.forEach(failure => {
              errorManager.handleFileError(failure.filePath, new Error(failure.error), 'modification');
            });
          }
          
          // Update statistics
          modificationResults.successful.forEach(result => {
            errorManager.updateStats('success', { filePath: result.filePath, modifications: result.modifications });
          });
          modificationResults.failed.forEach(result => {
            errorManager.updateStats('failed', { filePath: result.filePath });
          });
          
          console.log(chalk.green(`\n✅ File modification completed!`));
          console.log(chalk.gray(`Modified: ${modificationResults.summary.modifiedFiles} files`));
          console.log(chalk.gray(`Errors: ${modificationResults.summary.errorFiles} files`));
          
          // Cleanup backups if requested
          if (options.cleanup && options.backup) {
            console.log(chalk.blue('\n🧹 Cleaning up backup files...'));
            const cleanupResults = await backupManager.cleanupBackups();
            console.log(chalk.green(`✅ Cleaned up ${cleanupResults.cleaned.length} backup files`));
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
    
    // Print final summary and handle error logging
    errorManager.printSummary();
    
    // Save error log if requested
    if (options.logErrors) {
      const logPath = path.join(options.project, 'docai-errors.json');
      const logResult = await errorManager.saveErrorLog(logPath);
      if (logResult.success) {
        console.log(chalk.gray(`\n📄 Error log saved to: ${logResult.logPath}`));
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
