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
- **Documentation Generation**: Auto-generate docstrings and comments
- **Code Analysis**: Quality metrics and improvement suggestions
- **File Modification**: Safe code changes with backup support
- **Multi-Language**: Python, JavaScript, TypeScript support
- **Local Fallback**: Works without AI API for basic code generation

## Quick Start

```bash
# 1. Add to your project
npm install git+https://github.com/yourusername/docai.git

# 2. Run DocAI
npx docai
```

**That's it! DocAI launches directly into chat mode**

---

## Installation

### Project Installation

**Add DocAI to your project as a dev dependency:**
```bash
npm install --save-dev git+https://github.com/yourusername/docai.git
```

**Or install globally for system-wide access:**
```bash
npm install -g git+https://github.com/yourusername/docai.git
```

### Usage

**Run the chat interface:**
```bash
# From your project directory
npx docai

# Or if installed globally
docai
```

**DocAI will prompt for API key setup on first run.**

## Usage

DocAI is a **chat-based AI coding assistant**.

```bash
# Launch interactive chat
npx docai
```

### Commands

**File Operations:**
- `/load <file>` - Load file into chat
- `/files` - Show loaded files
- `/apply` - Apply AI suggestions
- `/insert` - Insert code at line
- `/append` - Add code to end

**Documentation:**
- `/docs` - Generate docs for loaded files
- `/docgen <function>` - Generate specific function docs
- `/scan` - Scan for missing docs

**Code Analysis:**
- `/analyze` - Code quality analysis
- `/refactor` - Refactoring suggestions
- `/optimize` - Performance tips

**Natural Language:**
Just describe what you want!

### Workflow

1. Run `npx docai`
2. Load files: `/load src/myfile.py`
3. Ask for help: "Add error handling"
4. Apply changes: `/apply`

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