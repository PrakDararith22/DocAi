# Phase 0: Project Initialization

## 🎯 Status: PLANNED

**Duration:** 1 week  
**Start Date:** TBD  
**Completion:** 0%

---

## 🎯 Overview

**REQUIRED** project setup with `docai init` command. You MUST run `docai init` before using any other DocAI commands.

**Why Required:**
- Ensures proper configuration
- Validates API keys upfront
- Sets up project correctly
- Prevents runtime errors
- Better user experience

---

## ✨ Features to Build

### Core Features
- [ ] **Interactive Configuration Wizard**
  - Step-by-step setup
  - Clear questions
  - Smart defaults
  - Validation

- [ ] **AI Provider Setup**
  - Select provider (Gemini/HuggingFace)
  - Enter API key
  - Validate connection
  - Test generation

- [ ] **Project Detection**
  - Auto-detect language
  - Find source directories
  - Identify project structure
  - Suggest settings

- [ ] **Config Generation**
  - Create `.docaiConfig.json`
  - Set defaults based on project
  - Add to `.gitignore`
  - Explain each setting

---

## 📦 Command

```bash
# Initialize DocAI in current project
docai init

# Initialize with specific provider
docai init --provider gemini
docai init --provider huggingface

# Skip interactive mode (use defaults)
docai init --yes
```

---

## ⚠️ What Happens Without Init

### Trying to Use DocAI Without Init:

```bash
$ docai generate ./src

❌ DocAI is not initialized in this project

Please run: docai init

# Process exits
```

```bash
$ docai refactor ./src

❌ DocAI is not initialized in this project

Please run: docai init

# Process exits
```

**All commands (except `init`) will fail if `.docaiConfig.json` doesn't exist.**

---

## 🔄 Interactive Flow

```
$ docai init

🤖 DocAI Project Initialization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? What is your project name? my-awesome-project

? Select your primary language:
  ◯ Python
  ◯ JavaScript
  ◯ TypeScript
❯ ◉ Auto-detect

✓ Detected: Python project

? Where is your source code? (./src)

? Select AI provider:
❯ ◉ Google Gemini (Recommended)
  ◯ Hugging Face

? Enter your Gemini API key: AIza...
  (Get one at: https://makersuite.google.com/app/apikey)

🔍 Testing API connection...
✅ Connection successful!

? Select documentation style:
❯ ◉ Google (Recommended for Python)
  ◯ NumPy
  ◯ Sphinx

? Enable watch mode by default? (y/N) n

? Create backup files? (Y/n) y

? Enable verbose output? (y/N) n

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Configuration saved to .docaiConfig.json

📝 Next steps:
  1. Run: docai generate ./src
  2. Or: docai refactor ./src
  3. Read: https://github.com/PrakDararith22/DocAi

🎉 DocAI is ready to use!
```

---

## 📋 Configuration Questions

### 1. Project Information
```
? What is your project name?
  Default: (current directory name)
  
? Project description? (optional)
  Default: (empty)
```

### 2. Language Detection
```
? Select your primary language:
  - Auto-detect (scans for .py, .js, .ts files)
  - Python
  - JavaScript
  - TypeScript
  - All languages
  
? Where is your source code?
  Default: ./src (or auto-detected)
```

### 3. AI Provider Setup
```
? Select AI provider:
  - Google Gemini (Recommended)
  - Hugging Face
  
? Enter your API key:
  - Validates format
  - Tests connection
  - Saves securely
  
? Select model:
  Gemini:
    - gemini-2.5-flash (Recommended)
    - gemini-1.5-flash-latest
  HuggingFace:
    - bigcode/starcoder
```

### 4. Documentation Style
```
? Select documentation style:
  Python:
    - Google (Recommended)
    - NumPy
    - Sphinx
  JavaScript/TypeScript:
    - JSDoc (Default)
```

### 5. Preferences
```
? Enable watch mode by default? (y/N)
? Create backup files? (Y/n)
? Enable verbose output? (y/N)
? Enable inline documentation? (Y/n)
? Skip errors and continue? (Y/n)
```

---

## 📄 Generated Config File

```json
{
  "project": "my-awesome-project",
  "language": "python",
  "source": "./src",
  "provider": "gemini",
  "gemini_api_key": "AIza...",
  "gemini_model": "gemini-2.5-flash",
  "style": "google",
  "watch": false,
  "backup": true,
  "verbose": false,
  "inline": true,
  "skipErrors": true,
  "lowLevel": true,
  "highLevel": false
}
```

---

## 🔧 Implementation Plan

### Step 1: Create Init Module
**File:** `src/initCommand.js`

```javascript
class ProjectInitializer {
  async initialize(options) {
    // 1. Welcome message
    // 2. Detect project
    // 3. Ask questions
    // 4. Validate API key
    // 5. Generate config
    // 6. Update .gitignore
    // 7. Show next steps
  }
  
  async detectProject() {
    // Detect language, source dir, etc.
  }
  
  async askQuestions() {
    // Interactive prompts
  }
  
  async validateApiKey(provider, key) {
    // Test API connection
  }
  
  async generateConfig(answers) {
    // Create .docaiConfig.json
  }
  
  async updateGitignore() {
    // Add .docaiConfig.json if has API key
  }
}
```

### Step 2: Add Config Check to All Commands
**File:** `src/configValidator.js`

```javascript
async function requireConfig() {
  const configPath = '.docaiConfig.json';
  
  // Check if config exists
  if (!fs.existsSync(configPath)) {
    console.log(chalk.red('\n❌ DocAI is not initialized in this project\n'));
    console.log(chalk.yellow('Please run: docai init\n'));
    process.exit(1);
  }
  
  // Load and validate config
  const config = await loadConfig(configPath);
  
  if (!config.provider || !config[`${config.provider}_api_key`]) {
    console.log(chalk.red('\n❌ Invalid configuration\n'));
    console.log(chalk.yellow('Please run: docai init\n'));
    process.exit(1);
  }
  
  return config;
}

module.exports = { requireConfig };
```

### Step 3: Update All Commands to Require Config
**File:** `bin/docai.js`

```javascript
const { requireConfig } = require('../src/configValidator');

// Init command (no config required)
program
  .command('init')
  .description('Initialize DocAI in your project (REQUIRED first step)')
  .option('--provider <name>', 'AI provider (gemini, huggingface)')
  .option('--yes', 'Skip prompts and use defaults')
  .action(async (options) => {
    const { initializeProject } = require('../src/initCommand');
    await initializeProject(options);
  });

// Generate command (requires config)
program
  .command('generate')
  .description('Generate documentation')
  .argument('[path]', 'File or directory path')
  .action(async (path, options) => {
    // Check if initialized
    const config = await requireConfig();
    
    // Continue with generation
    const { generateDocumentation } = require('../src/index');
    await generateDocumentation({ ...config, ...options, file: path });
  });

// Refactor command (requires config)
program
  .command('refactor')
  .description('Refactor code with AI suggestions')
  .argument('[path]', 'File or directory path')
  .action(async (path, options) => {
    // Check if initialized
    const config = await requireConfig();
    
    // Continue with refactoring
    const { refactorCode } = require('../src/refactorCommand');
    await refactorCode(path, { ...config, ...options });
  });
```

### Step 3: Project Detection
```javascript
async detectProject() {
  const files = await fs.readdir('.');
  
  // Detect language
  const hasPython = files.some(f => f.endsWith('.py'));
  const hasJS = files.some(f => f.endsWith('.js'));
  const hasTS = files.some(f => f.endsWith('.ts'));
  
  // Detect source directory
  const possibleDirs = ['src', 'lib', 'app', '.'];
  const sourceDir = possibleDirs.find(dir => fs.existsSync(dir));
  
  // Detect package manager
  const hasPackageJson = files.includes('package.json');
  const hasRequirements = files.includes('requirements.txt');
  
  return {
    language: hasPython ? 'python' : hasTS ? 'typescript' : 'javascript',
    sourceDir,
    hasPackageJson,
    hasRequirements
  };
}
```

### Step 4: API Key Validation
```javascript
async validateApiKey(provider, key) {
  try {
    const aiProvider = createAIProvider({
      provider,
      [`${provider}_api_key`]: key
    });
    
    // Test with simple prompt
    const response = await aiProvider.generate('Say "test"');
    
    if (response && response.length > 0) {
      return { valid: true, message: 'Connection successful!' };
    }
  } catch (error) {
    return { valid: false, message: error.message };
  }
}
```

---

## 🎯 Success Criteria

- [ ] User can run `docai init` in any project
- [ ] Wizard asks clear, helpful questions
- [ ] Auto-detects project language and structure
- [ ] Validates API key before saving
- [ ] Generates working `.docaiConfig.json`
- [ ] Updates `.gitignore` if needed
- [ ] Shows helpful next steps
- [ ] Works with `--yes` flag for automation

---

## 📝 Notes

- Make it beginner-friendly
- Provide helpful explanations
- Show examples for each question
- Validate all inputs
- Test API connection before saving
- Don't save API keys in git by default
- Provide links to get API keys

---

## 🚀 Next Steps

1. Implement `src/initCommand.js`
2. Add `init` command to CLI
3. Create project detection logic
4. Add API key validation
5. Test with different project types
6. Update main README with init instructions

---

**Previous Phase:** None (This is Phase 0)  
**Next Phase:** [Phase 1 - Documentation](../phase-1-documentation/)
