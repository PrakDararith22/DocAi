const fs = require('fs');
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * Check if DocAI is initialized (config file exists)
 * @param {string} cwd - Current working directory
 * @returns {boolean} - True if initialized
 */
function isInitialized(cwd = process.cwd()) {
  const configPath = path.join(cwd, '.docaiConfig.json');
  return fs.existsSync(configPath);
}

/**
 * Require config file to exist (for commands that need it)
 * Shows error and exits if not initialized
 * @param {boolean} strict - If true, exit on missing config. If false, just warn
 * @returns {boolean} - True if config exists
 */
function requireConfig(strict = false) {
  const configPath = path.join(process.cwd(), '.docaiConfig.json');
  
  if (!fs.existsSync(configPath)) {
    console.log('');
    console.log(chalk.red('❌ DocAI is not initialized in this project'));
    console.log('');
    console.log(chalk.yellow('Please run: ') + chalk.cyan('docai init'));
    console.log('');
    
    if (strict) {
      process.exit(1);
    }
    
    return false;
  }
  
  return true;
}

/**
 * Validate config file structure
 * @param {Object} config - Configuration object
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validateConfig(config) {
  const errors = [];
  
  // Check required fields
  if (!config.provider) {
    errors.push('Missing required field: provider');
  }
  
  // Check provider-specific requirements
  if (config.provider === 'gemini') {
    if (!config.gemini_api_key) {
      errors.push('Missing Gemini API key');
    }
  } else if (config.provider === 'huggingface') {
    if (!config.hf_token) {
      errors.push('Missing Hugging Face token');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Show friendly initialization prompt
 */
function showInitPrompt() {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('  🤖 Welcome to DocAI!'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');
  console.log(chalk.yellow('  DocAI is not initialized in this project.'));
  console.log('');
  console.log(chalk.gray('  To get started, run:'));
  console.log('  ' + chalk.cyan.bold('docai init'));
  console.log('');
  console.log(chalk.gray('  This will:'));
  console.log(chalk.gray('  • Set up your AI provider'));
  console.log(chalk.gray('  • Configure project settings'));
  console.log(chalk.gray('  • Validate your API key'));
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');
}

module.exports = {
  isInitialized,
  requireConfig,
  validateConfig,
  showInitPrompt
};
