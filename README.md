# DocAI - AI-Powered Documentation Generator

![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg) ![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg) ![AI Provider](https://img.shields.io/badge/AI-Gemini%20%26%20Hugging%20Face-blue.svg) ![Version](https://img.shields.io/badge/Version-1.0.0-success.svg) ![GitHub](https://img.shields.io/github/license/yourusername/docai) ![Install](https://img.shields.io/badge/Install-npm%20install%20-g%20git+https://github.com/yourusername/docai.git-blue)

**DocAI** is a production-ready CLI tool that automatically generates high-quality documentation for your codebase using advanced AI models. It supports multiple programming languages and AI providers, with intelligent parsing, contextual documentation generation, and seamless integration into your development workflow.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Support](#support)
- [Quick Example](#quick-example)
- [Development](#development)
- [License](#license)

## Features

- **Chat Interface**: Natural language AI coding assistant
- **Code Analysis**: Quality metrics and improvement suggestions
- **File Modification**: Safe code changes with backup support
- **Multi-Language**: Python, JavaScript, TypeScript support
- **Local Fallback**: Works without AI API for basic code generation

##  Quick Start

```bash
# 1. Install DocAI
npm install git+https://github.com/yourusername/docai.git

# 2. Initialize project (sets up API keys and config)
docai init

# 3. Start chatting!
docai
```

**That's it! DocAI is ready to use**

---

## Installation

###  Project Installation

**Add DocAI to your project:**
```bash
npm install git+https://github.com/yourusername/docai.git
```

**Or install globally:**
```bash
npm install -g git+https://github.com/yourusername/docai.git
```

###  Initialization

**Set up your project with the init command:**
```bash
docai init
```

**The init command will:**
- Prompt for AI provider selection (Gemini recommended)
- Validate your API key
- Auto-detect project settings (source directory, language)
- Create `.docaiConfig.json` configuration file
- Update `.gitignore` for security

**After initialization, simply run:**
```bash
docai    # Start chat interface
```

**Or run directly from project:**
```bash
npx docai
```

### 🔑 First Time Setup

**Use the init command for initial configuration:**
```bash
docai init    # Interactive setup wizard
```

**The init command handles:**
- AI provider selection and API key validation
- Project configuration (source directory, language)
- Security setup (.gitignore updates)

**After setup, use regular commands:**
```bash
docai         # Start chat interface
docai --help  # Show all commands
```

## Development

```bash
# Clone and setup
npm install
npm test

# Run locally
npm start
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Generated documentation powered by DocAI
- Built with modern development practices
- Comprehensive testing and quality assurance