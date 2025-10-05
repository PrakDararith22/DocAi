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

program.parse();
