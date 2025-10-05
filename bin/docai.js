#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');
const chalk = require('chalk').default || require('chalk');

// Import main functionality
const { generateDocumentation } = require('../src/index.js');
const { initializeProject } = require('../src/initCommand.js');
const { scanDocumentation } = require('../src/scanCommand.js');
const { startChat } = require('../src/chatCommand.js');
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

// Chat command (Interactive AI coding assistant)
program
  .command('chat')
  .description('Interactive AI coding assistant - analyze files, generate code, apply changes')
  .option('--provider <name>', 'AI provider to use (gemini, huggingface)')
  .option('--model <name>', 'AI model to use (e.g., gemini-2.5-flash)')
  .option('--config <path>', 'Path to configuration file')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    try {
      // Check if initialized (friendly warning, not strict)
      if (!isInitialized() && !options.config) {
        showInitPrompt();
        console.log(chalk.yellow('💡 Continuing with default settings...\n'));
      }
      
      await startChat(options);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate code and documentation using AI')
  .argument('[path]', 'Target files or directory path (e.g., "./src/**/*.py" or "./src")', './src/')
  .option('--docs', 'Generate documentation (docstrings, README) - default mode')
  .option('--code <description>', 'Generate code from description (e.g., "create a function to sort array")')
  .option('--tests', 'Generate unit tests for existing code')
  .option('--comments', 'Generate inline comments for complex code')
  .option('--readme', 'Generate README documentation for the project')
  .option('--api-docs', 'Generate API documentation')
  .option('--project <path>', 'Project root directory', process.cwd())
  .option('--output <folder>', 'Save generated content to separate folder')
  .option('--language <lang>', 'Programming language (python, javascript, java, etc.)', 'auto')
  .option('--framework <name>', 'Framework to use (react, django, express, etc.)')
  .option('--no-preview', 'Skip preview (preview is shown by default)')
  .option('--no-interactive', 'Disable interactive mode (interactive is enabled by default)')
  .option('--style <style>', 'Code/documentation style (google, numpy, sphinx)', 'google')
  .option('--config <path>', 'Path to configuration file')
  .option('--provider <name>', 'AI provider to use (gemini, huggingface)')
  .option('--model <name>', 'AI model to use (e.g., gemini-2.5-flash)')
  .option('--verbose', 'Show detailed output')
  .option('--quiet', 'Reduce output verbosity')
  .action(async (path, options) => {
    try {
      // Check if initialized (friendly warning, not strict)
      if (!isInitialized() && !options.config) {
        showInitPrompt();
        console.log(chalk.yellow('💡 Continuing with default settings...\n'));
      }
      
      // Determine generation mode
      let generationMode = 'docs'; // default
      if (options.code) generationMode = 'code';
      else if (options.tests) generationMode = 'tests';
      else if (options.comments) generationMode = 'comments';
      else if (options.apiDocs) generationMode = 'api-docs';
      
      // Set new defaults
      const enhancedOptions = {
        ...options,
        file: path,
        generationMode,
        codeDescription: options.code,
        language: options.language,
        framework: options.framework,
        verbose: options.verbose || !options.quiet,
        preview: !options.noPreview,
        lang: options.language === 'auto' ? 'all' : options.language,
        highLevel: options.readme || options.apiDocs,
        lowLevel: !options.readme && !options.apiDocs,
        interactive: !options.noInteractive
      };
      
      await generateDocumentation(enhancedOptions);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
