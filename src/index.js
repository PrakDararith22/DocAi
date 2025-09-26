const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');
const FileDiscovery = require('./fileDiscovery');

/**
 * Main function to generate documentation
 * @param {Object} options - CLI options
 */
async function generateDocumentation(options) {
  console.log(chalk.blue.bold('🤖 DocAI - AI-Powered Documentation Generator'));
  console.log(chalk.gray('=====================================\n'));

  // Validate options
  if (!options.lowLevel && !options.highLevel) {
    console.error(chalk.red('Error: You must specify either --low-level or --high-level'));
    process.exit(1);
  }

  if (options.inline && !options.lowLevel) {
    console.error(chalk.red('Error: --inline requires --low-level'));
    process.exit(1);
  }

  // Show what we're going to do
  console.log(chalk.yellow('Configuration:'));
  console.log(`  Project: ${options.project}`);
  console.log(`  Language: ${options.lang}`);
  console.log(`  Mode: ${options.lowLevel ? 'Low-level (functions/classes)' : 'High-level (README)'}`);
  console.log(`  Inline: ${options.inline ? 'Yes' : 'No'}`);
  console.log(`  Preview: ${options.preview ? 'Yes' : 'No'}`);
  console.log(`  Backup: ${options.backup ? 'Yes' : 'No'}`);
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
      }
      return;
    }
    
    console.log(chalk.green(`\n✅ Found ${validFiles.length} files ready for processing!`));
    
    if (options.preview) {
      console.log(chalk.blue('\n📋 Preview Mode - Files to be processed:'));
      validFiles.forEach((file, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${file.path} (${file.language})`));
      });
      console.log(chalk.gray('\nNext: Code parsing and AI generation will be implemented...'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error during file discovery:'), error.message);
    throw error;
  }
}

module.exports = {
  generateDocumentation
};
