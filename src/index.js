const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');
const FileDiscovery = require('./fileDiscovery');
const ParserManager = require('./parserManager');
const HuggingFaceAPI = require('./huggingFaceAPI');
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
    
    // Initialize parser manager
    const parserManager = new ParserManager(options);
    
    // Parse files to extract functions and classes
    const parseResults = await parserManager.parseFiles(validFiles);
    
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
          
          // TODO: Implement actual documentation generation
          console.log(chalk.gray('Documentation generation will be implemented in Phase 2.3'));
          console.log(chalk.gray(`Found ${allFunctions.length} functions and ${allClasses.length} classes to document.`));
        } else {
          console.log(chalk.yellow('No functions or classes found to document.'));
        }
        
      } catch (error) {
        console.error(chalk.red('Error initializing AI API:'), error.message);
        throw error;
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Error during file discovery:'), error.message);
    throw error;
  }
}

module.exports = {
  generateDocumentation
};
