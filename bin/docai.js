#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');
const chalk = require('chalk').default || require('chalk');

// Import main functionality
const { initializeProject } = require('../src/initCommand.js');
const { startChat } = require('../src/chatCommand');

program
  .name('docai')
  .description('AI-powered CLI tool for automatically generating documentation')
  .version(version);

// Init command (project initialization)
program
  .command('init')
  .description('Initialize DocAI in your project (sets up configuration and API keys)')
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

// Default command - start chat
program
  .action(async () => {
    try {
      await startChat();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
