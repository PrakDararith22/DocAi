# Phase 1: Modification Guide

## 🎯 Quick Reference for Common Modifications

This guide shows you exactly where and how to modify Phase 1 components.

---

## 📋 Table of Contents

1. [AI Provider Modifications](#ai-provider-modifications)
2. [Parser Modifications](#parser-modifications)
3. [UI/UX Modifications](#uiux-modifications)
4. [Configuration Modifications](#configuration-modifications)
5. [File Processing Modifications](#file-processing-modifications)
6. [Prompt Engineering](#prompt-engineering)

---

## 1. AI Provider Modifications

### Add New AI Provider (e.g., OpenAI)

**Step 1:** Create provider file
```javascript
// src/providers/openaiProvider.js
class OpenAIProvider {
  constructor(options) {
    this.apiKey = options.openai_api_key;
    this.model = options.openai_model || 'gpt-4';
  }
  
  async generate(prompt, options = {}) {
    // Your OpenAI API call here
  }
  
  async testConnection() {
    // Test API connection
  }
}

module.exports = OpenAIProvider;
```

**Step 2:** Register in factory
```javascript
// src/aiProviderFactory.js
const OpenAIProvider = require('./providers/openaiProvider');

function createAIProvider(options) {
  if (options.provider === 'openai') {
    return new OpenAIProvider(options);
  }
  // ... existing providers
}
```

**Step 3:** Add to config
```javascript
// src/config.js
function getDefaultOptions(cwd) {
  return {
    // ... existing options
    openai_api_key: undefined,
    openai_model: undefined
  };
}
```

**Step 4:** Update init command
```javascript
// src/initCommand.js - Add to provider choices
choices: [
  { name: 'Google Gemini', value: 'gemini' },
  { name: 'OpenAI', value: 'openai' },  // Add this
  { name: 'Hugging Face', value: 'huggingface' }
]
```

---

## 2. Parser Modifications

### Add Support for New Language (e.g., Go)

**Step 1:** Create parser
```javascript
// src/goParser.js
class GoParser {
  async parseFile(filePath) {
    // Read file
    const code = await fs.readFile(filePath, 'utf-8');
    
    // Parse Go code (use go-parser or spawn go tool)
    // Extract functions, structs, methods
    
    return {
      functions: [...],
      classes: [...],  // structs in Go
      errors: []
    };
  }
}

module.exports = GoParser;
```

**Step 2:** Register in parser manager
```javascript
// src/parserManager.js
const GoParser = require('./goParser');

async parseFile(filePath, language) {
  if (language === 'go') {
    const parser = new GoParser();
    return await parser.parseFile(filePath);
  }
  // ... existing parsers
}
```

**Step 3:** Add to file discovery
```javascript
// src/fileDiscovery.js
const languageExtensions = {
  python: ['.py'],
  javascript: ['.js', '.jsx'],
  typescript: ['.ts', '.tsx'],
  go: ['.go']  // Add this
};
```

**Step 4:** Update documentation generator
```javascript
// src/documentationGenerator.js
async generateFunctionDocumentation(func, context) {
  if (context.language === 'go') {
    // Go-specific prompt and formatting
    return this.generateGoDocstring(func, context);
  }
  // ... existing languages
}
```

---

### Extract More Information from Existing Parsers

**Python - Extract Type Hints:**
```javascript
// src/pythonParser.js
// In the Python script that runs:
const pythonScript = `
import ast

# ... existing code ...

# Add type hint extraction
if isinstance(node.returns, ast.Name):
    func_info['return_type'] = node.returns.id
    
for arg in node.args.args:
    if arg.annotation:
        # Extract type annotation
        param_types.append(ast.unparse(arg.annotation))
`;
```

**JavaScript - Extract JSDoc Types:**
```javascript
// src/jsParser.js
function extractJSDocTypes(node) {
  if (node.leadingComments) {
    const jsdoc = node.leadingComments.find(c => 
      c.type === 'CommentBlock' && c.value.startsWith('*')
    );
    
    if (jsdoc) {
      // Parse @param {type} name
      // Parse @returns {type}
      return parseJSDocTags(jsdoc.value);
    }
  }
}
```

---

## 3. UI/UX Modifications

### Change Preview Display Style

**File:** `src/previewSystem.js`

**Current:**
```javascript
showItemSignature(item, originalItem) {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold(`  ${item.name}()`));
  console.log(chalk.cyan('━'.repeat(60)));
}
```

**Modified (Compact Style):**
```javascript
showItemSignature(item, originalItem) {
  console.log('');
  console.log(chalk.cyan(`▸ ${item.name}()`));
}
```

**Modified (Detailed Style):**
```javascript
showItemSignature(item, originalItem) {
  console.log('');
  console.log(chalk.cyan('╔' + '═'.repeat(58) + '╗'));
  console.log(chalk.cyan('║') + chalk.bold(` ${item.name}()`.padEnd(58)) + chalk.cyan('║'));
  console.log(chalk.gray('║') + chalk.gray(` Line ${item.line}`.padEnd(58)) + chalk.gray('║'));
  console.log(chalk.cyan('╚' + '═'.repeat(58) + '╝'));
}
```

---

### Add Diff View for Existing Docstrings

**File:** `src/previewSystem.js`

```javascript
showDocstringDiff(oldDoc, newDoc) {
  console.log(chalk.red('  - Old:'));
  oldDoc.split('\n').forEach(line => {
    console.log(chalk.red(`    ${line}`));
  });
  
  console.log('');
  console.log(chalk.green('  + New:'));
  newDoc.split('\n').forEach(line => {
    console.log(chalk.green(`    ${line}`));
  });
}
```

---

### Add Progress Bar

**File:** `src/progressManager.js`

```javascript
showProgressBar(current, total) {
  const percentage = Math.floor((current / total) * 100);
  const filled = Math.floor(percentage / 5);
  const empty = 20 - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  process.stdout.write(`\r[${bar}] ${percentage}% (${current}/${total})`);
  
  if (current === total) {
    console.log(''); // New line when complete
  }
}
```

---

## 4. Configuration Modifications

### Add New Configuration Option

**Step 1:** Add to defaults
```javascript
// src/config.js
function getDefaultOptions(cwd) {
  return {
    // ... existing options
    myNewOption: false,  // Add here
    anotherOption: 'default_value'
  };
}
```

**Step 2:** Add CLI flag
```javascript
// bin/docai.js
program
  .command('generate')
  // ... existing options
  .option('--my-new-option', 'Description of my option')
  .option('--another-option <value>', 'Another option with value')
```

**Step 3:** Use in code
```javascript
// src/index.js or any module
if (options.myNewOption) {
  // Your custom logic here
}
```

---

### Change Default Behavior

**File:** `src/config.js`

**Example: Make backup enabled by default**
```javascript
function getDefaultOptions(cwd) {
  return {
    // ... other options
    backup: true,  // Changed from false to true
  };
}
```

**Example: Change default concurrency**
```javascript
function getDefaultOptions(cwd) {
  return {
    // ... other options
    concurrency: 10,  // Changed from 5 to 10
  };
}
```

---

## 5. File Processing Modifications

### Change File Exclusion Patterns

**File:** `src/fileDiscovery.js`

```javascript
const excludePatterns = [
  'node_modules',
  '__pycache__',
  '.git',
  'dist',
  'build',
  // Add your custom exclusions
  'vendor',
  'tmp',
  'cache',
  '*.test.js',  // Exclude test files
  '*.spec.ts'   // Exclude spec files
];
```

---

### Add File Size Limit

**File:** `src/fileDiscovery.js`

```javascript
async validateFiles(files) {
  const MAX_FILE_SIZE = 1024 * 1024; // 1MB
  
  const validFiles = [];
  const errors = [];
  
  for (const file of files) {
    const stats = await fs.stat(file.path);
    
    if (stats.size > MAX_FILE_SIZE) {
      errors.push({
        filePath: file.path,
        message: `File too large: ${stats.size} bytes`
      });
      continue;
    }
    
    validFiles.push(file);
  }
  
  return { validFiles, errors };
}
```

---

### Process Files in Custom Order

**File:** `src/index.js`

```javascript
// Sort files by size (smallest first)
validFiles.sort((a, b) => a.size - b.size);

// Or sort by path
validFiles.sort((a, b) => a.path.localeCompare(b.path));

// Or prioritize certain files
validFiles.sort((a, b) => {
  if (a.path.includes('important')) return -1;
  if (b.path.includes('important')) return 1;
  return 0;
});
```

---

## 6. Prompt Engineering

### Customize AI Prompts

**File:** `src/documentationGenerator.js`

**Current Function Prompt:**
```javascript
const prompt = `Generate a ${style} docstring for this ${language} function.

Function:
${functionCode}

Requirements:
- Follow ${style} format
- Include parameter descriptions
- Include return value description
- Be concise and clear
`;
```

**Enhanced with Examples:**
```javascript
const prompt = `Generate a ${style} docstring for this ${language} function.

Function:
${functionCode}

Context:
${surroundingCode}

Example ${style} format:
"""
Brief description of what the function does.

Args:
    param1 (type): Description of param1
    param2 (type): Description of param2

Returns:
    type: Description of return value

Raises:
    ErrorType: When this error occurs

Example:
    >>> function_name(arg1, arg2)
    expected_output
"""

Requirements:
- Follow the example format exactly
- Be specific about parameter types
- Include practical examples
- Mention edge cases
- Be concise but complete
`;
```

---

### Add Context to Prompts

**File:** `src/documentationGenerator.js`

```javascript
async generateFunctionDocumentation(func, context) {
  // Get surrounding functions for context
  const relatedFunctions = context.functions
    .filter(f => f.name !== func.name)
    .slice(0, 3)
    .map(f => f.name)
    .join(', ');
  
  const prompt = `Generate documentation for ${func.name}().

This function is part of a module that also contains: ${relatedFunctions}

Function code:
${func.code}

File path: ${context.filePath}
Project: ${context.projectName}

Generate a docstring that explains how this function fits into the larger system.
`;
  
  return await this.aiProvider.generate(prompt);
}
```

---

### Add Post-Processing

**File:** `src/documentationGenerator.js`

```javascript
async generateFunctionDocumentation(func, context) {
  let docstring = await this.aiProvider.generate(prompt);
  
  // Post-process the docstring
  docstring = this.postProcessDocstring(docstring, func, context);
  
  return docstring;
}

postProcessDocstring(docstring, func, context) {
  // Remove code blocks if AI added them
  docstring = docstring.replace(/```[\s\S]*?```/g, '');
  
  // Ensure proper indentation
  const indent = '    ';
  docstring = docstring.split('\n')
    .map(line => indent + line)
    .join('\n');
  
  // Add triple quotes for Python
  if (context.language === 'python') {
    docstring = '"""' + docstring + '\n    """';
  }
  
  // Validate format
  if (!this.validateDocstring(docstring, context.style)) {
    // Regenerate or use fallback
  }
  
  return docstring;
}
```

---

## 🎯 Common Modification Patterns

### Pattern 1: Add Feature Flag

```javascript
// 1. Add to config
function getDefaultOptions(cwd) {
  return {
    enableMyFeature: false
  };
}

// 2. Add CLI flag
.option('--enable-my-feature', 'Enable my feature')

// 3. Use in code
if (options.enableMyFeature) {
  await myFeature();
}
```

### Pattern 2: Add Custom Validation

```javascript
// src/config.js
function validateOptions(options) {
  if (options.myOption && !options.requiredOption) {
    throw new Error('myOption requires requiredOption');
  }
  
  if (options.value < 0 || options.value > 100) {
    throw new Error('value must be between 0 and 100');
  }
}
```

### Pattern 3: Add Hook System

```javascript
// src/index.js
class HookManager {
  constructor() {
    this.hooks = {};
  }
  
  register(name, callback) {
    if (!this.hooks[name]) this.hooks[name] = [];
    this.hooks[name].push(callback);
  }
  
  async trigger(name, data) {
    if (!this.hooks[name]) return data;
    
    for (const callback of this.hooks[name]) {
      data = await callback(data);
    }
    
    return data;
  }
}

// Usage:
const hooks = new HookManager();

// Register hooks
hooks.register('beforeGeneration', async (func) => {
  // Modify function before generation
  return func;
});

hooks.register('afterGeneration', async (docstring) => {
  // Modify docstring after generation
  return docstring;
});

// Trigger hooks
func = await hooks.trigger('beforeGeneration', func);
docstring = await hooks.trigger('afterGeneration', docstring);
```

---

## 🔧 Testing Your Modifications

### 1. Test with Sample File

```bash
# Create test file
echo 'def test(): pass' > test.py

# Run with your modifications
docai generate test.py --verbose

# Check output
cat test.py
```

### 2. Test with Dry Run

```javascript
// Add dry-run option
if (options.dryRun) {
  console.log('Would modify:', filePath);
  console.log('Changes:', modifications);
  return; // Don't actually modify
}
```

### 3. Test with Different Configs

```bash
# Test with different providers
docai generate --provider gemini
docai generate --provider huggingface

# Test with different styles
docai generate --style google
docai generate --style numpy
```

---

## 📚 Additional Resources

- **Architecture Guide:** See `ARCHITECTURE.md` for system overview
- **API Docs:** Check inline comments in each module
- **Examples:** Look at existing code patterns
- **Tests:** See `tests/` directory for test examples

---

## 🎉 Ready to Modify!

You now have everything you need to modify Phase 1. Start with small changes and test frequently!

**Questions? Check the architecture guide or ask!** 🚀
