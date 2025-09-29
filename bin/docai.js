#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');

// Import main functionality
const { generateDocumentation } = require('../src/index.js');

program
  .name('docai')
  .description('AI-powered CLI tool for automatically generating documentation')
  .version(version);

program
  .command('generate')
  .description('Generate documentation for your code files')
  .argument('[path]', 'Target files or directory path (e.g., "./src/**/*.py" or "./src")', './src/')
  .option('--low-level', 'Generate inline docstrings for functions and classes')
  .option('--readme', 'Generate README documentation for the project')
  .option('--concurrency <number>', 'Set concurrency level for parallel processing (default: 5)', '5')
  .option('--max-memory <mb>', 'Set maximum memory usage in MB (default: 200)', '200')
  .option('--benchmark', 'Run performance benchmark tests')
  .option('--inline', 'Insert documentation directly into files')
  .option('--project <path>', 'Project root directory', process.cwd())
  .option('--output <folder>', 'Output directory for non-inline mode', './docs')
  .option('--no-preview', 'Skip preview and apply changes directly')
  .option('--interactive', 'Interactive mode with approval prompts for each item (default)')
  .option('--no-interactive', 'Disable interactive mode - apply all changes automatically')
  .option('--batch-approval', 'Enable batch approval for similar items')
  .option('--save-preview <file>', 'Save preview to file without applying changes')
  .option('--watch', 'Monitor files for changes and auto-update documentation')
  .option('--debounce <ms>', 'Debounce delay for watch mode (default: 2000ms)', '2000')
  .option('--force', 'Overwrite existing documentation')
  .option('--skip-errors', 'Continue processing even if some files have errors')
  .option('--backup', 'Create backup files before making changes')
  .option('--cleanup', 'Remove backup files after successful operation')
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
      // Set new defaults
      const enhancedOptions = {
        ...options,
        file: path,                    // Use path argument as file pattern
        verbose: !options.quiet,       // Verbose by default, unless --quiet is specified
        preview: !options.noPreview,   // Preview by default, unless --no-preview is specified
        lang: 'all',                   // Auto-determine language (always 'all')
        highLevel: options.readme,     // Map --readme to highLevel internally
        lowLevel: !options.readme,     // Default to low-level unless --readme is specified
        inline: !options.readme,       // Default to inline for low-level, false for README
        interactive: !options.noInteractive  // Interactive by default, unless --no-interactive is specified
      };
      
      await generateDocumentation(enhancedOptions);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
