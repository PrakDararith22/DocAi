const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const { createAIProvider } = require('./aiProviderFactory');

/**
 * Initialize DocAI project with configuration
 */
async function initializeProject(options = {}) {
  console.log(chalk.blue.bold('\n🚀 DocAI Project Initialization\n'));

  const config = {};

  try {
    // Check if already initialized
    const configPath = path.join(process.cwd(), '.docaiConfig.json');
    try {
      await fs.access(configPath);
      console.log(chalk.yellow('⚠️  DocAI is already initialized in this project.'));
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to reconfigure?',
        default: false
      }]);

      if (!overwrite) {
        console.log(chalk.gray('Initialization cancelled.'));
        return;
      }
    } catch (error) {
      // Config doesn't exist, continue with initialization
    }

    // Step 1: AI Provider Selection
    console.log(chalk.cyan('\n1. AI Provider Setup'));

    if (!options.provider) {
      const { provider } = await inquirer.prompt([{
        type: 'list',
        name: 'provider',
        message: 'Select your preferred AI provider:',
        choices: [
          { name: 'Google Gemini (Recommended)', value: 'gemini' },
          { name: 'Hugging Face', value: 'huggingface' }
        ]
      }]);
      options.provider = provider;
    }

    config.provider = options.provider;

    // Step 2: API Key Setup
    console.log(chalk.cyan('\n2. API Key Configuration'));

    let apiKey;
    if (options.provider === 'gemini') {
      if (!process.env.GOOGLE_API_KEY) {
        const { key } = await inquirer.prompt([{
          type: 'password',
          name: 'key',
          message: 'Enter your Google Gemini API key:',
          validate: (input) => input.trim().length > 0 || 'API key is required'
        }]);
        apiKey = key.trim();
      } else {
        apiKey = process.env.GOOGLE_API_KEY;
        console.log(chalk.gray('Using GOOGLE_API_KEY from environment'));
      }

      // Validate API key
      console.log(chalk.gray('Validating API key...'));
      const testProvider = createAIProvider({ provider: 'gemini', gemini_api_key: apiKey });
      const testResult = await testProvider.testConnection();

      if (!testResult.success) {
        console.log(chalk.red(`❌ API key validation failed: ${testResult.message}`));
        console.log(chalk.yellow('You can still continue, but AI features may not work properly.'));
      } else {
        console.log(chalk.green('✅ API key validated successfully!'));
      }

      config.gemini_api_key = apiKey;
      config.gemini_model = 'gemini-2.5-flash';

    } else if (options.provider === 'huggingface') {
      if (!process.env.HF_TOKEN) {
        const { token } = await inquirer.prompt([{
          type: 'password',
          name: 'token',
          message: 'Enter your Hugging Face token:',
          validate: (input) => input.trim().length > 0 || 'Token is required'
        }]);
        apiKey = token.trim();
      } else {
        apiKey = process.env.HF_TOKEN;
        console.log(chalk.gray('Using HF_TOKEN from environment'));
      }
      config.hf_token = apiKey;
    }

    // Step 3: Project Detection
    console.log(chalk.cyan('\n3. Project Configuration'));

    // Auto-detect source directory
    const sourceDirs = ['src', 'lib', 'app', 'source'];
    let sourceDir = 'src';

    for (const dir of sourceDirs) {
      try {
        await fs.access(path.join(process.cwd(), dir));
        sourceDir = dir;
        break;
      } catch (error) {
        // Directory doesn't exist, continue
      }
    }

    console.log(chalk.gray(`Auto-detected source directory: ${sourceDir}`));

    // Auto-detect language
    const extensions = ['.py', '.js', '.ts', '.java', '.cpp', '.c'];
    let primaryLanguage = 'all';

    for (const ext of extensions) {
      try {
        const files = await fs.readdir(process.cwd());
        const hasFiles = files.some(file => file.endsWith(ext));
        if (hasFiles) {
          primaryLanguage = ext.slice(1); // Remove the dot
          break;
        }
      } catch (error) {
        // Continue checking
      }
    }

    console.log(chalk.gray(`Auto-detected primary language: ${primaryLanguage}`));

    // Step 4: Configuration Options
    console.log(chalk.cyan('\n4. Additional Settings'));

    const defaultSettings = {
      project: sourceDir,
      lang: primaryLanguage,
      lowLevel: true,
      inline: true,
      backup: true,
      verbose: false,
      style: 'google',
      concurrency: 5,
      maxMemory: 200
    };

    if (!options.yes) {
      const { settings } = await inquirer.prompt([{
        type: 'confirm',
        name: 'settings',
        message: 'Use recommended settings?',
        default: true
      }]);

      if (!settings) {
        // Let user customize
        const customSettings = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'inline',
            message: 'Generate inline documentation (modify source files)?',
            default: true
          },
          {
            type: 'confirm',
            name: 'backup',
            message: 'Create backup files before modifications?',
            default: true
          },
          {
            type: 'confirm',
            name: 'verbose',
            message: 'Show detailed output?',
            default: false
          }
        ]);

        Object.assign(defaultSettings, customSettings);
      }
    }

    // Merge all settings
    Object.assign(config, defaultSettings);

    // Step 5: Save Configuration
    console.log(chalk.cyan('\n5. Saving Configuration'));

    const configContent = JSON.stringify(config, null, 2);
    await fs.writeFile('.docaiConfig.json', configContent);

    console.log(chalk.green('✅ Configuration saved to .docaiConfig.json'));

    // Step 6: Update .gitignore
    console.log(chalk.cyan('\n6. Security Setup'));

    try {
      const gitignorePath = '.gitignore';
      let gitignoreContent = '';

      try {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      } catch (error) {
        // .gitignore doesn't exist, create it
      }

      const lines = gitignoreContent.split('\n');
      const hasDocAIEntry = lines.some(line =>
        line.trim() === '.docaiConfig.json' ||
        line.trim() === '*.docaiConfig.json'
      );

      if (!hasDocAIEntry) {
        lines.push('', '# DocAI Configuration', '.docaiConfig.json');
        await fs.writeFile(gitignorePath, lines.join('\n'));
        console.log(chalk.green('✅ Added .docaiConfig.json to .gitignore'));
      } else {
        console.log(chalk.gray('✅ .docaiConfig.json already in .gitignore'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not update .gitignore (may not be a git repository)'));
    }

    // Step 7: Completion
    console.log(chalk.green.bold('\n🎉 DocAI initialization complete!'));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.cyan('  docai              # Start the chat interface'));
    console.log(chalk.cyan('  docai --help       # Show all commands'));
    console.log(chalk.gray('\nConfiguration saved. You can modify .docaiConfig.json anytime.'));

  } catch (error) {
    console.error(chalk.red(`\n❌ Initialization failed: ${error.message}`));
    throw error;
  }
}

module.exports = {
  initializeProject
};
