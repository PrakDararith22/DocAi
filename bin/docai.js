#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');
const chalk = require('chalk').default || require('chalk');

// Import main functionality
const { initializeProject } = require('../src/initCommand.js');
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

// Chat command (Interactive AI coding assistant)
program
  .command('chat')
  .description('Interactive AI coding assistant - analyze files, generate code, apply changes')
  .option('--provider <name>', 'AI provider to use (gemini, huggingface)')
  .option('--model <name>', 'AI model to use (e.g., gemini-2.0-flash)')
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

program.parse();
