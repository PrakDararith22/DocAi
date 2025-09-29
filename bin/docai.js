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
  .option('--low-level', 'Generate inline docstrings for functions and classes')
  .option('--high-level', 'Generate README documentation for the project')
  .option('--inline', 'Insert documentation directly into files')
  .option('--project <path>', 'Project root directory', process.cwd())
  .option('--file <pattern>', 'Target specific files or patterns (e.g., "./src/**/*.py")')
  .option('--lang <language>', 'Filter by language (py, js, ts, all)', 'all')
  .option('--output <folder>', 'Output directory for non-inline mode', './docs')
  .option('--preview', 'Show generated documentation before applying')
  .option('--watch', 'Monitor files for changes and auto-update documentation')
  .option('--force', 'Overwrite existing documentation')
  .option('--skip-errors', 'Continue processing even if some files have errors')
  .option('--backup', 'Create backup files before making changes')
  .option('--cleanup', 'Remove backup files after successful operation')
  .option('--timestamped', 'Create timestamped backup files (e.g., file_20250925_140530.py.bak)')
  .option('--strict', 'Stop processing on first error')
  .option('--log-errors', 'Save error log to file (docai-errors.json)')
  .option('--verbose', 'Show detailed logging information')
  .option('--style <style>', 'Python docstring style (google, numpy, sphinx)', 'google')
  .option('--config <path>', 'Path to configuration file')
  .option('--save-config', 'Save current options to configuration file')
  .action(async (options) => {
    try {
      await generateDocumentation(options);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
