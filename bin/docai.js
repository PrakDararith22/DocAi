#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');
const chalk = require('chalk').default || require('chalk');

// Import main functionality
const { generateDocumentation } = require('../src/index.js');
const { initializeProject } = require('../src/initCommand.js');
const { scanDocumentation } = require('../src/scanCommand.js');
const { refactorCode } = require('../src/refactorCommand.js');
const { isInitialized, showInitPrompt } = require('../src/configValidator.js');

program
  .name('docai')
  .description('AI-powered CLI tool for automatically generating documentation')
  .version(version);

// Init command (no config required)
program
  .command('init')
  .description('Initialize DocAI in your project (REQUIRED first step)')
  .option('--provider <name>', 'AI provider to use (gemini, huggingface)')
  .option('--yes', 'Skip prompts and use defaults')
  .action(async (options) => {
    try {
      await initializeProject(options);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Scan command (check documentation status)
program
  .command('scan')
  .description('Scan for missing or outdated documentation (like git status)')
  .argument('[path]', 'Target files or directory path', './src/')
  .option('--verbose', 'Show detailed information')
  .action(async (path, options) => {
    try {
      const scanOptions = {
        ...options,
        file: path,
        project: process.cwd(),
        lang: 'all'
      };
      
      await scanDocumentation(scanOptions);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// Refactor command (AI-powered code refactoring)
program
  .command('refactor')
  .description('Analyze and refactor code with AI suggestions')
  .argument('[path]', 'File or directory to refactor', './src/')
  .option('--perf', 'Focus on performance optimizations only')
  .option('--read', 'Focus on readability improvements only')
  .option('--best', 'Focus on best practices only')
  .option('--design', 'Focus on design patterns only')
  .option('--explain', 'Show detailed explanations for each suggestion')
  .option('--min-impact <level>', 'Minimum impact level (high, medium, low)', 'medium')
  .option('--project <path>', 'Project root directory', process.cwd())
  .action(async (path, options) => {
    try {
      await refactorCode(path, options);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate documentation for your code files')
  .argument('[path]', 'Target files or directory path (e.g., "./src/**/*.py" or "./src")', './src/')
  .option('--low-level', 'Generate docstrings for functions and classes (default)')
  .option('--readme', 'Generate README documentation for the project')
  .option('--benchmark', 'Run performance benchmark tests')
  .option('--project <path>', 'Project root directory', process.cwd())
  .option('--output <folder>', 'Save documentation to separate folder instead of modifying source files')
  .option('--no-preview', 'Skip preview (preview is shown by default)')
  .option('--no-interactive', 'Disable interactive mode (interactive is enabled by default)')
  .option('--batch-approval', 'Enable batch approval for similar items')
  .option('--save-preview <file>', 'Save preview to file without applying changes')
  .option('--skip-errors', 'Continue processing even if some files have errors')
  .option('--timestamped', 'Create timestamped backup files (e.g., file_20250925_140530.py.bak)')
  .option('--strict', 'Stop processing on first error')
  .option('--log-errors', 'Save error log to file (docai-errors.json)')
  .option('--quiet', 'Reduce output verbosity (verbose is default)')
  .option('--style <style>', 'Python docstring style (google, numpy, sphinx)', 'google')
  .option('--config <path>', 'Path to configuration file')
  .option('--save-config', 'Save current options to configuration file')
  .option('--provider <name>', 'AI provider to use (gemini, huggingface)')
  .option('--model <name>', 'AI model to use (e.g., gemini-2.5-flash, gemini-1.5-flash-latest)')
  .action(async (path, options) => {
    try {
      // Check if initialized (friendly warning, not strict)
      if (!isInitialized() && !options.config) {
        showInitPrompt();
        console.log(chalk.yellow('💡 Continuing with default settings...\n'));
      }
      
      // Set new defaults
      const enhancedOptions = {
        ...options,
        file: path,                    // Use path argument as file pattern
        verbose: options.quiet !== undefined ? !options.quiet : undefined,  // Let config decide if not specified
        preview: !options.noPreview,   // Preview by default, unless --no-preview is specified
        lang: 'all',                   // Auto-determine language (always 'all')
        highLevel: options.readme,     // Map --readme to highLevel internally
        lowLevel: !options.readme,     // Default to low-level unless --readme is specified
        interactive: !options.noInteractive  // Interactive by default, unless --no-interactive is specified
        // inline is now set automatically in index.js based on --output
      };
      
      await generateDocumentation(enhancedOptions);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
