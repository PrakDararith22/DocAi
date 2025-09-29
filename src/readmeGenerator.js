const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * README Generator
 * Generates high-level project documentation and README files
 */
class ReadmeGenerator {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.projectPath = options.project || process.cwd();
  }

  /**
   * Generate README for the project
   * @param {Object} parseResults - Parsing results from all files
   * @param {Object} projectInfo - Project information
   * @returns {Promise<Object>} README generation results
   */
  async generateReadme(parseResults, projectInfo) {
    try {
      console.log(chalk.blue('\n📚 Generating High-level README Documentation'));
      console.log(chalk.gray('=============================================='));

      // Analyze project structure
      const projectAnalysis = await this.analyzeProject(parseResults, projectInfo);
      
      // Generate README content
      const readmeContent = await this.generateReadmeContent(projectAnalysis);
      
      // Determine output file
      const outputFile = await this.determineOutputFile();
      
      // Write README file
      await this.writeReadmeFile(outputFile, readmeContent);
      
      return {
        success: true,
        outputFile: outputFile,
        projectAnalysis: projectAnalysis,
        contentLength: readmeContent.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze project structure and components
   * @param {Object} parseResults - Parsing results
   * @param {Object} projectInfo - Project information
   * @returns {Promise<Object>} Project analysis
   */
  async analyzeProject(parseResults, projectInfo) {
    const analysis = {
      projectName: projectInfo.name || path.basename(this.projectPath),
      description: projectInfo.description || '',
      version: projectInfo.version || '1.0.0',
      dependencies: await this.analyzeDependencies(),
      mainFiles: await this.identifyMainFiles(),
      functions: this.analyzeFunctions(parseResults),
      classes: this.analyzeClasses(parseResults),
      projectType: this.determineProjectType(),
      keyFeatures: [],
      codeExamples: []
    };

    // Generate key features based on function analysis
    analysis.keyFeatures = this.generateKeyFeatures(analysis.functions, analysis.classes);
    
    // Generate code examples
    analysis.codeExamples = this.generateCodeExamples(analysis.functions, analysis.classes);

    return analysis;
  }

  /**
   * Analyze project dependencies
   * @returns {Promise<Object>} Dependencies information
   */
  async analyzeDependencies() {
    const dependencies = {
      python: [],
      nodejs: [],
      other: []
    };

    try {
      // Check for package.json
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        dependencies.nodejs = Object.keys(packageJson.dependencies || {});
      } catch (error) {
        // No package.json found
      }

      // Check for requirements.txt
      const requirementsPath = path.join(this.projectPath, 'requirements.txt');
      try {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        dependencies.python = requirements
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'))
          .map(line => line.split('==')[0].split('>=')[0].split('<=')[0]);
      } catch (error) {
        // No requirements.txt found
      }

      // Check for setup.py
      const setupPyPath = path.join(this.projectPath, 'setup.py');
      try {
        const setupPy = await fs.readFile(setupPyPath, 'utf-8');
        // Simple extraction of install_requires
        const installRequiresMatch = setupPy.match(/install_requires\s*=\s*\[(.*?)\]/s);
        if (installRequiresMatch) {
          const requires = installRequiresMatch[1]
            .split(',')
            .map(item => item.trim().replace(/['"]/g, ''))
            .filter(item => item);
          dependencies.python.push(...requires);
        }
      } catch (error) {
        // No setup.py found
      }

    } catch (error) {
      if (this.verbose) {
        console.log(chalk.yellow(`Warning: Could not analyze dependencies: ${error.message}`));
      }
    }

    return dependencies;
  }

  /**
   * Identify main files in the project
   * @returns {Promise<Array>} Main files
   */
  async identifyMainFiles() {
    const mainFiles = [];
    const commonMainFiles = [
      'main.py', 'app.py', 'index.py', '__main__.py',
      'main.js', 'app.js', 'index.js', 'server.js',
      'main.ts', 'app.ts', 'index.ts', 'server.ts'
    ];

    try {
      const files = await fs.readdir(this.projectPath);
      
      for (const file of files) {
        if (commonMainFiles.includes(file)) {
          mainFiles.push({
            name: file,
            path: path.join(this.projectPath, file),
            type: this.getFileType(file)
          });
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.log(chalk.yellow(`Warning: Could not identify main files: ${error.message}`));
      }
    }

    return mainFiles;
  }

  /**
   * Analyze functions from parse results
   * @param {Object} parseResults - Parse results
   * @returns {Array} Function analysis
   */
  analyzeFunctions(parseResults) {
    const allFunctions = [];
    
    // Collect from all language results
    [...parseResults.python, ...parseResults.javascript, ...parseResults.typescript].forEach(result => {
      if (result.functions) {
        result.functions.forEach(func => {
          allFunctions.push({
            ...func,
            file_path: result.file_path,
            language: this.getLanguageFromPath(result.file_path)
          });
        });
      }
    });

    return allFunctions;
  }

  /**
   * Analyze classes from parse results
   * @param {Object} parseResults - Parse results
   * @returns {Array} Class analysis
   */
  analyzeClasses(parseResults) {
    const allClasses = [];
    
    // Collect from all language results
    [...parseResults.python, ...parseResults.javascript, ...parseResults.typescript].forEach(result => {
      if (result.classes) {
        result.classes.forEach(cls => {
          allClasses.push({
            ...cls,
            file_path: result.file_path,
            language: this.getLanguageFromPath(result.file_path)
          });
        });
      }
    });

    return allClasses;
  }

  /**
   * Determine project type based on files and dependencies
   * @returns {string} Project type
   */
  determineProjectType() {
    const hasPython = this.hasFileType('.py');
    const hasJavaScript = this.hasFileType('.js');
    const hasTypeScript = this.hasFileType('.ts');
    const hasPackageJson = this.hasFile('package.json');
    const hasRequirements = this.hasFile('requirements.txt');

    if (hasPython && hasRequirements) {
      return 'Python Package';
    } else if (hasPython) {
      return 'Python Script';
    } else if (hasTypeScript && hasPackageJson) {
      return 'TypeScript Project';
    } else if (hasJavaScript && hasPackageJson) {
      return 'Node.js Project';
    } else if (hasJavaScript) {
      return 'JavaScript Project';
    } else {
      return 'Mixed Language Project';
    }
  }

  /**
   * Generate key features based on functions and classes
   * @param {Array} functions - Functions array
   * @param {Array} classes - Classes array
   * @returns {Array} Key features
   */
  generateKeyFeatures(functions, classes) {
    const features = [];
    
    // Analyze function patterns
    const functionNames = functions.map(f => f.name.toLowerCase());
    const classNames = classes.map(c => c.name.toLowerCase());

    // Common patterns
    if (functionNames.some(name => name.includes('api') || name.includes('endpoint'))) {
      features.push('REST API functionality');
    }
    if (functionNames.some(name => name.includes('auth') || name.includes('login'))) {
      features.push('Authentication system');
    }
    if (functionNames.some(name => name.includes('database') || name.includes('db'))) {
      features.push('Database integration');
    }
    if (functionNames.some(name => name.includes('file') || name.includes('upload'))) {
      features.push('File handling');
    }
    if (functionNames.some(name => name.includes('email') || name.includes('mail'))) {
      features.push('Email functionality');
    }
    if (functionNames.some(name => name.includes('test') || name.includes('spec'))) {
      features.push('Testing framework');
    }
    if (classNames.some(name => name.includes('manager') || name.includes('handler'))) {
      features.push('Manager/Handler classes');
    }
    if (classNames.some(name => name.includes('model') || name.includes('entity'))) {
      features.push('Data models');
    }

    // Add generic features based on counts
    if (functions.length > 10) {
      features.push('Extensive function library');
    }
    if (classes.length > 5) {
      features.push('Object-oriented design');
    }

    return features.length > 0 ? features : ['Core functionality'];
  }

  /**
   * Generate code examples from functions and classes
   * @param {Array} functions - Functions array
   * @param {Array} classes - Classes array
   * @returns {Array} Code examples
   */
  generateCodeExamples(functions, classes) {
    const examples = [];

    // Get main functions (those that seem important)
    const mainFunctions = functions
      .filter(f => !f.name.startsWith('_') && f.name.length > 3)
      .slice(0, 3);

    mainFunctions.forEach(func => {
      examples.push({
        type: 'function',
        name: func.name,
        language: func.language,
        signature: this.generateFunctionSignature(func),
        description: this.generateFunctionDescription(func)
      });
    });

    // Get main classes
    const mainClasses = classes
      .filter(c => !c.name.startsWith('_') && c.name.length > 3)
      .slice(0, 2);

    mainClasses.forEach(cls => {
      examples.push({
        type: 'class',
        name: cls.name,
        language: cls.language,
        methods: cls.methods ? cls.methods.length : 0,
        description: this.generateClassDescription(cls)
      });
    });

    return examples;
  }

  /**
   * Generate README content
   * @param {Object} analysis - Project analysis
   * @returns {Promise<string>} README content
   */
  async generateReadmeContent(analysis) {
    let content = '';

    // Title and description
    content += `# ${analysis.projectName}\n\n`;
    content += `${analysis.description || 'A well-documented project with comprehensive functionality.'}\n\n`;

    // Badges
    content += this.generateBadges(analysis);
    content += '\n';

    // Table of contents
    content += this.generateTableOfContents();
    content += '\n';

    // Features
    content += this.generateFeaturesSection(analysis.keyFeatures);
    content += '\n';

    // Installation
    content += this.generateInstallationSection(analysis);
    content += '\n';

    // Usage
    content += this.generateUsageSection(analysis);
    content += '\n';

    // API Reference
    content += this.generateAPIReferenceSection(analysis);
    content += '\n';

    // Examples
    content += this.generateExamplesSection(analysis.codeExamples);
    content += '\n';

    // Dependencies
    content += this.generateDependenciesSection(analysis.dependencies);
    content += '\n';

    // Contributing
    content += this.generateContributingSection();
    content += '\n';

    // License
    content += this.generateLicenseSection();
    content += '\n';

    return content;
  }

  /**
   * Generate badges section
   * @param {Object} analysis - Project analysis
   * @returns {string} Badges markdown
   */
  generateBadges(analysis) {
    let badges = '';
    
    // Language badges
    if (analysis.dependencies.python.length > 0) {
      badges += '![Python](https://img.shields.io/badge/Python-3.7+-blue.svg) ';
    }
    if (analysis.dependencies.nodejs.length > 0) {
      badges += '![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg) ';
    }
    
    // Project type badge
    badges += `![Project Type](https://img.shields.io/badge/Type-${encodeURIComponent(analysis.projectType)}-orange.svg) `;
    
    // Function count badge
    const totalFunctions = analysis.functions.length;
    badges += `![Functions](https://img.shields.io/badge/Functions-${totalFunctions}-purple.svg) `;
    
    // Class count badge
    const totalClasses = analysis.classes.length;
    badges += `![Classes](https://img.shields.io/badge/Classes-${totalClasses}-red.svg)`;

    return badges;
  }

  /**
   * Generate table of contents
   * @returns {string} Table of contents markdown
   */
  generateTableOfContents() {
    return `## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Dependencies](#dependencies)
- [Contributing](#contributing)
- [License](#license)`;
  }

  /**
   * Generate features section
   * @param {Array} features - Key features
   * @returns {string} Features markdown
   */
  generateFeaturesSection(features) {
    let content = '## Features\n\n';
    
    features.forEach(feature => {
      content += `- ✅ ${feature}\n`;
    });
    
    return content;
  }

  /**
   * Generate installation section
   * @param {Object} analysis - Project analysis
   * @returns {string} Installation markdown
   */
  generateInstallationSection(analysis) {
    let content = '## Installation\n\n';

    if (analysis.dependencies.python.length > 0) {
      content += '### Python Dependencies\n\n';
      content += '```bash\n';
      content += 'pip install -r requirements.txt\n';
      content += '```\n\n';
    }

    if (analysis.dependencies.nodejs.length > 0) {
      content += '### Node.js Dependencies\n\n';
      content += '```bash\n';
      content += 'npm install\n';
      content += '```\n\n';
    }

    content += '### Clone the Repository\n\n';
    content += '```bash\n';
    content += `git clone <repository-url>\n`;
    content += `cd ${analysis.projectName}\n`;
    content += '```\n';

    return content;
  }

  /**
   * Generate usage section
   * @param {Object} analysis - Project analysis
   * @returns {string} Usage markdown
   */
  generateUsageSection(analysis) {
    let content = '## Usage\n\n';

    if (analysis.mainFiles.length > 0) {
      content += '### Running the Application\n\n';
      analysis.mainFiles.forEach(file => {
        if (file.type === 'python') {
          content += `**${file.name}:**\n`;
          content += '```bash\n';
          content += `python ${file.name}\n`;
          content += '```\n\n';
        } else if (file.type === 'javascript') {
          content += `**${file.name}:**\n`;
          content += '```bash\n';
          content += `node ${file.name}\n`;
          content += '```\n\n';
        }
      });
    }

    content += '### Basic Example\n\n';
    content += '```python\n';
    content += '# Example usage\n';
    content += 'from your_module import main_function\n\n';
    content += 'result = main_function()\n';
    content += 'print(result)\n';
    content += '```\n';

    return content;
  }

  /**
   * Generate API reference section
   * @param {Object} analysis - Project analysis
   * @returns {string} API reference markdown
   */
  generateAPIReferenceSection(analysis) {
    let content = '## API Reference\n\n';

    // Functions
    if (analysis.functions.length > 0) {
      content += '### Functions\n\n';
      analysis.functions.slice(0, 10).forEach(func => {
        content += `#### \`${func.name}()\`\n\n`;
        content += `**File:** \`${path.basename(func.file_path)}\`\n\n`;
        if (func.params && func.params.length > 0) {
          content += '**Parameters:**\n';
          func.params.forEach(param => {
            content += `- \`${param.name}\`: ${param.type || 'any'}\n`;
          });
          content += '\n';
        }
        content += '---\n\n';
      });
    }

    // Classes
    if (analysis.classes.length > 0) {
      content += '### Classes\n\n';
      analysis.classes.slice(0, 5).forEach(cls => {
        content += `#### \`${cls.name}\`\n\n`;
        content += `**File:** \`${path.basename(cls.file_path)}\`\n\n`;
        if (cls.methods && cls.methods.length > 0) {
          content += '**Methods:**\n';
          cls.methods.slice(0, 5).forEach(method => {
            content += `- \`${method.name}()\`\n`;
          });
          content += '\n';
        }
        content += '---\n\n';
      });
    }

    return content;
  }

  /**
   * Generate examples section
   * @param {Array} examples - Code examples
   * @returns {string} Examples markdown
   */
  generateExamplesSection(examples) {
    let content = '## Examples\n\n';

    examples.forEach((example, index) => {
      content += `### Example ${index + 1}: ${example.name}\n\n`;
      content += `${example.description}\n\n`;
      
      if (example.type === 'function') {
        content += '```python\n';
        content += `# ${example.signature}\n`;
        content += 'result = example_function()\n';
        content += 'print(result)\n';
        content += '```\n\n';
      } else if (example.type === 'class') {
        content += '```python\n';
        content += `# Using ${example.name}\n`;
        content += `instance = ${example.name}()\n`;
        content += 'result = instance.some_method()\n';
        content += '```\n\n';
      }
    });

    return content;
  }

  /**
   * Generate dependencies section
   * @param {Object} dependencies - Dependencies information
   * @returns {string} Dependencies markdown
   */
  generateDependenciesSection(dependencies) {
    let content = '## Dependencies\n\n';

    if (dependencies.python.length > 0) {
      content += '### Python\n\n';
      content += '| Package | Version |\n';
      content += '|---------|----------|\n';
      dependencies.python.forEach(dep => {
        content += `| \`${dep}\` | latest |\n`;
      });
      content += '\n';
    }

    if (dependencies.nodejs.length > 0) {
      content += '### Node.js\n\n';
      content += '| Package | Version |\n';
      content += '|---------|----------|\n';
      dependencies.nodejs.forEach(dep => {
        content += `| \`${dep}\` | latest |\n`;
      });
      content += '\n';
    }

    return content;
  }

  /**
   * Generate contributing section
   * @returns {string} Contributing markdown
   */
  generateContributingSection() {
    return `## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

### Development Setup

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd ${path.basename(this.projectPath)}

# Install dependencies
npm install  # or pip install -r requirements.txt

# Run tests
npm test     # or python -m pytest
\`\`\``;
  }

  /**
   * Generate license section
   * @returns {string} License markdown
   */
  generateLicenseSection() {
    return `## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Generated documentation powered by DocAI
- Built with modern development practices
- Comprehensive testing and quality assurance`;
  }

  /**
   * Determine output file path
   * @returns {Promise<string>} Output file path
   */
  async determineOutputFile() {
    const existingReadme = path.join(this.projectPath, 'README.md');
    
    try {
      await fs.access(existingReadme);
      // README.md exists, create README_generated.md
      return path.join(this.projectPath, 'README_generated.md');
    } catch (error) {
      // README.md doesn't exist, use it
      return existingReadme;
    }
  }

  /**
   * Write README file
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @returns {Promise<void>}
   */
  async writeReadmeFile(filePath, content) {
    await fs.writeFile(filePath, content, 'utf-8');
    
    if (this.verbose) {
      console.log(chalk.green(`✅ README written to: ${path.basename(filePath)}`));
    }
  }

  /**
   * Generate function signature
   * @param {Object} func - Function object
   * @returns {string} Function signature
   */
  generateFunctionSignature(func) {
    let signature = `${func.name}(`;
    
    if (func.params && func.params.length > 0) {
      signature += func.params.map(param => param.name).join(', ');
    }
    
    signature += ')';
    
    if (func.return_type) {
      signature += ` -> ${func.return_type}`;
    }
    
    return signature;
  }

  /**
   * Generate function description
   * @param {Object} func - Function object
   * @returns {string} Function description
   */
  generateFunctionDescription(func) {
    return `The \`${func.name}()\` function provides core functionality for the application.`;
  }

  /**
   * Generate class description
   * @param {Object} cls - Class object
   * @returns {string} Class description
   */
  generateClassDescription(cls) {
    return `The \`${cls.name}\` class manages ${cls.methods ? cls.methods.length : 0} methods and provides object-oriented functionality.`;
  }

  /**
   * Get file type from extension
   * @param {string} filename - Filename
   * @returns {string} File type
   */
  getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.py': return 'python';
      case '.js': return 'javascript';
      case '.ts': return 'typescript';
      default: return 'unknown';
    }
  }

  /**
   * Get language from file path
   * @param {string} filePath - File path
   * @returns {string} Language
   */
  getLanguageFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.py': return 'python';
      case '.js': return 'javascript';
      case '.ts': return 'typescript';
      default: return 'unknown';
    }
  }

  /**
   * Check if project has specific file type
   * @param {string} extension - File extension
   * @returns {boolean} True if has file type
   */
  hasFileType(extension) {
    // This would need to be implemented with actual file checking
    return false; // Placeholder
  }

  /**
   * Check if project has specific file
   * @param {string} filename - Filename
   * @returns {boolean} True if has file
   */
  hasFile(filename) {
    // This would need to be implemented with actual file checking
    return false; // Placeholder
  }
}

module.exports = ReadmeGenerator;
