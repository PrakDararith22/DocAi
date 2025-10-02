const fs = require('fs').promises;
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk').default || require('chalk');
const ora = require('ora');
const { createAIProvider } = require('./aiProviderFactory');

class ProjectInitializer {
  constructor(options = {}) {
    this.options = options;
    this.cwd = process.cwd();
  }

  /**
   * Main initialization flow
   */
  async initialize() {
    try {
      // Welcome message
      this.showWelcome();

      // Check for existing config
      const shouldContinue = await this.checkExistingConfig();
      if (!shouldContinue) {
        console.log(chalk.yellow('\nInitialization cancelled.\n'));
        return;
      }

      // Detect project
      const projectInfo = await this.detectProject();

      // Ask questions
      const answers = await this.askQuestions(projectInfo);

      // Validate API key
      const isValid = await this.validateApiKey(answers.provider, answers.apiKey);
      if (!isValid) {
        console.log(chalk.red('\n❌ API key validation failed. Please try again.\n'));
        return;
      }

      // Generate config
      await this.generateConfig(answers);

      // Update .gitignore
      await this.updateGitignore();

      // Show success and next steps
      this.showSuccess();

    } catch (error) {
      console.error(chalk.red('\n❌ Initialization failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    console.log('');
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(chalk.cyan.bold('  🤖 DocAI Project Initialization'));
    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');
  }

  /**
   * Check if config already exists
   */
  async checkExistingConfig() {
    const configPath = path.join(this.cwd, '.docaiConfig.json');
    
    try {
      await fs.access(configPath);
      
      // Config exists, ask to overwrite
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration file already exists. Overwrite?',
        default: false
      }]);
      
      return overwrite;
    } catch {
      // Config doesn't exist, continue
      return true;
    }
  }

  /**
   * Detect project information
   */
  async detectProject() {
    const spinner = ora('Detecting project...').start();
    
    try {
      const files = await fs.readdir(this.cwd);
      
      // Detect languages
      const hasPython = files.some(f => f.endsWith('.py'));
      const hasJS = files.some(f => f.endsWith('.js'));
      const hasTS = files.some(f => f.endsWith('.ts'));
      
      // Determine primary language
      let language = 'all';
      if (hasPython && !hasJS && !hasTS) language = 'python';
      else if (hasJS && !hasPython && !hasTS) language = 'javascript';
      else if (hasTS) language = 'typescript';
      
      // Detect source directory
      const possibleDirs = ['src', 'lib', 'app', 'source'];
      let sourceDir = './';
      
      for (const dir of possibleDirs) {
        try {
          const dirPath = path.join(this.cwd, dir);
          await fs.access(dirPath);
          sourceDir = `./${dir}`;
          break;
        } catch {
          // Directory doesn't exist, continue
        }
      }
      
      // Detect package files
      const hasPackageJson = files.includes('package.json');
      const hasRequirements = files.includes('requirements.txt');
      
      // Get project name from directory
      const projectName = path.basename(this.cwd);
      
      spinner.succeed('Project detected');
      
      return {
        language,
        sourceDir,
        hasPython,
        hasJS,
        hasTS,
        hasPackageJson,
        hasRequirements,
        projectName
      };
    } catch (error) {
      spinner.fail('Detection failed');
      throw error;
    }
  }

  /**
   * Ask configuration questions
   */
  async askQuestions(projectInfo) {
    const questions = [
      {
        type: 'input',
        name: 'projectName',
        message: 'What is your project name?',
        default: projectInfo.projectName
      },
      {
        type: 'list',
        name: 'language',
        message: 'Select your primary language:',
        choices: [
          { name: `Auto-detect (${projectInfo.language})`, value: projectInfo.language },
          { name: 'Python', value: 'python' },
          { name: 'JavaScript', value: 'javascript' },
          { name: 'TypeScript', value: 'typescript' },
          { name: 'All languages', value: 'all' }
        ],
        default: 0
      },
      {
        type: 'input',
        name: 'sourceDir',
        message: 'Where is your source code?',
        default: projectInfo.sourceDir
      },
      {
        type: 'list',
        name: 'provider',
        message: 'Select AI provider:',
        choices: [
          { name: 'Google Gemini (Recommended)', value: 'gemini' },
          { name: 'Hugging Face', value: 'huggingface' }
        ],
        default: 0
      }
    ];

    // Add API key question based on provider
    questions.push({
      type: 'password',
      name: 'apiKey',
      message: (answers) => {
        if (answers.provider === 'gemini') {
          return 'Enter your Gemini API key:';
        } else {
          return 'Enter your Hugging Face token:';
        }
      },
      validate: (input) => {
        if (!input || input.trim() === '') {
          return 'API key is required';
        }
        return true;
      }
    });

    // Add model selection for Gemini
    questions.push({
      type: 'list',
      name: 'model',
      message: 'Select model:',
      choices: (answers) => {
        if (answers.provider === 'gemini') {
          return [
            { name: 'gemini-2.5-flash (Recommended)', value: 'gemini-2.5-flash' },
            { name: 'gemini-1.5-flash-latest', value: 'gemini-1.5-flash-latest' }
          ];
        } else {
          return [
            { name: 'bigcode/starcoder (Default)', value: 'bigcode/starcoder' }
          ];
        }
      },
      when: (answers) => answers.provider === 'gemini'
    });

    // Add style question for Python
    questions.push({
      type: 'list',
      name: 'style',
      message: 'Select documentation style:',
      choices: (answers) => {
        if (answers.language === 'python') {
          return [
            { name: 'Google (Recommended)', value: 'google' },
            { name: 'NumPy', value: 'numpy' },
            { name: 'Sphinx', value: 'sphinx' }
          ];
        } else {
          return [
            { name: 'JSDoc (Default)', value: 'jsdoc' }
          ];
        }
      },
      default: 0
    });

    // Add preferences
    questions.push(
      {
        type: 'confirm',
        name: 'preview',
        message: 'Show preview before applying changes?',
        default: true
      },
      {
        type: 'confirm',
        name: 'interactive',
        message: 'Enable interactive mode (ask for approval)?',
        default: true
      },
      {
        type: 'confirm',
        name: 'backup',
        message: 'Create backup files before changes?',
        default: true
      },
      {
        type: 'confirm',
        name: 'verbose',
        message: 'Enable verbose output?',
        default: false
      }
    );

    const answers = await inquirer.prompt(questions);
    return answers;
  }

  /**
   * Validate API key by testing connection
   */
  async validateApiKey(provider, apiKey) {
    const spinner = ora('Testing API connection...').start();
    
    try {
      // Create provider config
      const providerConfig = {
        provider,
        verbose: false
      };
      
      if (provider === 'gemini') {
        providerConfig.gemini_api_key = apiKey;
      } else {
        providerConfig.hf_token = apiKey;
      }
      
      // Create AI provider
      const aiProvider = createAIProvider(providerConfig);
      
      // Test with simple prompt
      const response = await aiProvider.generate('Say "test"', {
        maxTokens: 10,
        temperature: 0.1
      });
      
      if (response && response.length > 0) {
        spinner.succeed(chalk.green('Connection successful!'));
        return true;
      } else {
        spinner.fail('Connection failed: No response from API');
        return false;
      }
    } catch (error) {
      spinner.fail(`Connection failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate configuration file
   */
  async generateConfig(answers) {
    const spinner = ora('Creating configuration file...').start();
    
    try {
      const config = {
        project: this.cwd,
        lowLevel: true,
        file: answers.sourceDir,
        lang: answers.language,
        preview: answers.preview,
        interactive: answers.interactive,
        batchApproval: false,
        watch: false,
        debounce: 2000,
        force: false,
        skipErrors: true,
        backup: answers.backup,
        cleanup: false,
        timestamped: false,
        strict: false,
        logErrors: true,
        concurrency: 5,
        maxMemory: 200,
        benchmark: false,
        verbose: answers.verbose,
        style: answers.style,
        provider: answers.provider
        // inline and output are not in config - inline is automatic based on --output flag
      };
      
      // Add API key
      if (answers.provider === 'gemini') {
        config.gemini_api_key = answers.apiKey;
        if (answers.model) {
          config.gemini_model = answers.model;
        }
      } else {
        config.hf_token = answers.apiKey;
      }
      
      // Write config file
      const configPath = path.join(this.cwd, '.docaiConfig.json');
      await fs.writeFile(
        configPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
      
      spinner.succeed('Configuration saved to .docaiConfig.json');
    } catch (error) {
      spinner.fail('Failed to create configuration');
      throw error;
    }
  }

  /**
   * Update .gitignore to exclude config with API keys
   */
  async updateGitignore() {
    try {
      const gitignorePath = path.join(this.cwd, '.gitignore');
      let gitignoreContent = '';
      
      // Read existing .gitignore
      try {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      } catch {
        // .gitignore doesn't exist, create new
      }
      
      // Check if .docaiConfig.json is already in .gitignore
      if (!gitignoreContent.includes('.docaiConfig.json')) {
        // Add to .gitignore
        gitignoreContent += '\n# DocAI configuration (contains API keys)\n.docaiConfig.json\n';
        await fs.writeFile(gitignorePath, gitignoreContent, 'utf-8');
        
        console.log(chalk.yellow('\n⚠️  Security Note:'));
        console.log(chalk.yellow('  • .docaiConfig.json added to .gitignore'));
        console.log(chalk.yellow('  • Never commit API keys to version control'));
        console.log(chalk.yellow('  • Consider using environment variables for CI/CD'));
      }
    } catch (error) {
      // Non-critical error, just warn
      console.log(chalk.yellow('\n⚠️  Could not update .gitignore'));
    }
  }

  /**
   * Show success message and next steps
   */
  showSuccess() {
    console.log('');
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(chalk.green.bold('  ✅ Configuration saved to .docaiConfig.json'));
    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');
    console.log(chalk.bold('📝 Next steps:'));
    console.log(chalk.gray('  1. Run: ') + chalk.cyan('docai generate'));
    console.log(chalk.gray('  2. Or: ') + chalk.cyan('docai generate --readme'));
    console.log(chalk.gray('  3. Read: ') + chalk.cyan('https://github.com/PrakDararith22/DocAi'));
    console.log('');
    console.log(chalk.green('🎉 DocAI is ready to use!'));
    console.log('');
  }
}

/**
 * Initialize DocAI in the current project
 */
async function initializeProject(options = {}) {
  const initializer = new ProjectInitializer(options);
  await initializer.initialize();
}

module.exports = {
  ProjectInitializer,
  initializeProject
};
