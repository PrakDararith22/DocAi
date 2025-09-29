# DocAI - AI-Powered Documentation Generator

![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg) ![Project Type](https://img.shields.io/badge/Type-Mixed%20Language%20Project-orange.svg) ![Functions](https://img.shields.io/badge/Functions-0-purple.svg) ![Classes](https://img.shields.io/badge/Classes-0-red.svg)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Dependencies](#dependencies)
- [Contributing](#contributing)
- [License](#license)

## Features

- ✅ Core functionality
- ✅ AI-powered documentation generation
- ✅ Multi-language support (Python, JavaScript, TypeScript)
- ✅ Interactive preview system
- ✅ Watch mode for continuous updates
- ✅ Performance optimization
- ✅ Comprehensive testing suite
- ✅ High-level README generation

## Installation

### Node.js Dependencies

```bash
npm install
```

### Clone the Repository

```bash
git clone <repository-url>
cd docai
```

## Usage

### Basic Example

```python
# Example usage
from your_module import main_function

result = main_function()
print(result)
```

### Command Line Interface

#### Generate Documentation for Functions and Classes

```bash
# Generate documentation for Python files
docai generate --low-level --inline --file "./src/**/*.py" --verbose

# Generate documentation for JavaScript/TypeScript files
docai generate --low-level --inline --file "./src/**/*.{js,ts}" --verbose

# Generate documentation for all supported files
docai generate --low-level --inline --file "./src/**/*.{py,js,ts}" --verbose
```

#### Generate High-level README

```bash
# Generate project README
docai generate --high-level --verbose
```

#### Watch Mode for Continuous Updates

```bash
# Watch Python files for changes
npm run doc:watch:py

# Watch JavaScript/TypeScript files for changes
npm run doc:watch:js

# Watch all files for changes
npm run doc:watch
```

### Configuration

#### Using Configuration File

Create a `.docaiConfig.json` file in your project root:

```json
{
  "hf_token": "your_hugging_face_token_here",
  "project": "./src",
  "lang": "all",
  "lowLevel": true,
  "inline": true,
  "backup": true,
  "verbose": true,
  "style": "google"
}
```

#### Using Environment Variables

```bash
export HF_TOKEN="your_hugging_face_token_here"
docai generate --low-level --inline --file "./src/**/*.py"
```

#### Using CLI Flags

```bash
docai generate \
  --low-level \
  --inline \
  --backup \
  --file "./src/**/*.py" \
  --verbose \
  --style google \
  --concurrency 5 \
  --max-memory 200
```

## API Reference

### Functions

#### `generateDocumentation(options)`

Generate documentation for code files.

**Parameters:**
- `options` (Object): Configuration options
  - `project` (string): Project root directory
  - `lang` (string): Language filter ('py', 'js', 'ts', 'all')
  - `lowLevel` (boolean): Generate function/class documentation
  - `highLevel` (boolean): Generate README documentation
  - `inline` (boolean): Insert documentation into files
  - `backup` (boolean): Create backup files
  - `verbose` (boolean): Show detailed output
  - `hf_token` (string): Hugging Face API token

**Returns:**
- `Promise<Object>`: Generation results

### Classes

#### `FileDiscovery`

Discovers and validates files for processing.

**Methods:**
- `discoverFiles()`: Find files matching criteria
- `validateFiles(files)`: Validate file accessibility

#### `ParserManager`

Parses code files to extract functions and classes.

**Methods:**
- `parseFiles(files)`: Parse multiple files
- `parseFile(file)`: Parse single file
- `getLanguageFromPath(filePath)`: Detect file language

#### `HuggingFaceAPI`

Handles AI-powered documentation generation.

**Methods:**
- `testConnection()`: Test API connectivity
- `generateDocstring(prompt)`: Generate docstring for code

#### `BackupManager`

Manages file backups and restoration.

**Methods:**
- `createBackups(files)`: Create backup files
- `restoreFromBackup(filePath)`: Restore from backup
- `cleanupBackups()`: Remove backup files

#### `FileModifier`

Safely modifies files to insert documentation.

**Methods:**
- `insertDocstrings(results, backupManager)`: Insert docstrings
- `modifyFile(filePath, items, backupManager)`: Modify single file

## Examples

### Example 1: Basic Python Documentation

**Input:**
```python
def calculate_sum(a, b):
    return a + b

class Calculator:
    def __init__(self):
        self.result = 0
```

**Output:**
```python
def calculate_sum(a, b):
    """Calculate the sum of two numbers.
    
    Args:
        a (int): First number
        b (int): Second number
    
    Returns:
        int: Sum of a and b
    """
    return a + b

class Calculator:
    """A calculator class for performing mathematical operations."""
    
    def __init__(self):
        """Initialize the calculator with result set to 0."""
        self.result = 0
```

### Example 2: JavaScript Documentation

**Input:**
```javascript
function processData(data) {
    return data.toUpperCase();
}

class DataProcessor {
    constructor() {
        this.data = [];
    }
}
```

**Output:**
```javascript
/**
 * Process data by converting to uppercase.
 * @param {string} data - Input data
 * @returns {string} Uppercase data
 */
function processData(data) {
    return data.toUpperCase();
}

/**
 * A class for processing data.
 */
class DataProcessor {
    /**
     * Initialize the data processor.
     */
    constructor() {
        this.data = [];
    }
}
```

### Example 3: Watch Mode Usage

```bash
# Start watching for changes
npm run doc:watch:py

# Edit your Python files
# DocAI automatically updates documentation when you save
```

## Dependencies

### Node.js

| Package | Version |
|---------|----------|
| `@babel/parser` | latest |
| `axios` | latest |
| `chalk` | latest |
| `chokidar` | latest |
| `cli-progress` | latest |
| `commander` | latest |
| `glob` | latest |
| `inquirer` | latest |
| `ora` | latest |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd docai

# Install dependencies
npm install

# Run tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Watch tests during development
npm run test:watch
```

### Testing

The project includes comprehensive tests:

- **Unit Tests**: Test individual modules and functions
- **Integration Tests**: Test end-to-end workflows
- **Performance Tests**: Test memory usage and processing time
- **CLI Tests**: Test command-line interface

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run performance tests only
npm run test:performance

# Run tests with coverage report
npm run test:coverage
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Generated documentation powered by DocAI
- Built with modern development practices
- Comprehensive testing and quality assurance