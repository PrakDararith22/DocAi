const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * Python AST Parser
 * Uses Python's built-in AST module via child processes
 */
class PythonParser {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.skipErrors = options.skipErrors || false;
  }

  /**
   * Parse Python file and extract function/class information
   * @param {string} filePath - Path to Python file
   * @returns {Promise<Object>} Parsed data with functions, classes, and errors
   */
  async parseFile(filePath) {
    try {
      const pythonCode = await this.generatePythonASTCode();
      const result = await this.runPythonAST(filePath, pythonCode);
      
      if (this.verbose) {
        console.log(chalk.gray(`Parsed ${filePath}: ${result.functions.length} functions, ${result.classes.length} classes`));
      }
      
      return result;
    } catch (error) {
      if (this.skipErrors) {
        console.warn(chalk.yellow(`Warning: Could not parse ${filePath}: ${error.message}`));
        return { functions: [], classes: [], errors: [error.message] };
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate Python code that will parse the file and extract AST data
   */
  generatePythonASTCode() {
    return `
import ast
import json
import sys

def extract_docstring(node):
    """Extract docstring from a function or class node"""
    if (node.body and 
        len(node.body) > 0 and 
        isinstance(node.body[0], ast.Expr) and 
        isinstance(node.body[0].value, ast.Constant) and
        isinstance(node.body[0].value.value, str)):
        return node.body[0].value.value
    return None

def extract_function_info(node):
    """Extract information from a function definition"""
    # Get parameters
    params = []
    for arg in node.args.args:
        param_info = {
            'name': arg.arg,
            'line': arg.lineno if hasattr(arg, 'lineno') else None
        }
        # Add type annotation if present
        if arg.annotation:
            param_info['type'] = ast.unparse(arg.annotation) if hasattr(ast, 'unparse') else str(arg.annotation)
        params.append(param_info)
    
    # Get return type annotation
    return_type = None
    if node.returns:
        return_type = ast.unparse(node.returns) if hasattr(ast, 'unparse') else str(node.returns)
    
    # Get function body/source code
    function_source = ast.unparse(node) if hasattr(ast, 'unparse') else None
    
    return {
        'name': node.name,
        'line': node.lineno,
        'params': params,
        'return_type': return_type,
        'has_docstring': extract_docstring(node) is not None,
        'docstring': extract_docstring(node),
        'source_code': function_source
    }

def extract_class_info(node):
    """Extract information from a class definition"""
    methods = []
    for item in node.body:
        if isinstance(item, ast.FunctionDef):
            method_info = extract_function_info(item)
            method_info['is_method'] = True
            methods.append(method_info)
    
    return {
        'name': node.name,
        'line': node.lineno,
        'methods': methods,
        'has_docstring': extract_docstring(node) is not None,
        'docstring': extract_docstring(node)
    }

def parse_file(file_path):
    """Parse a Python file and extract function/class information"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tree = ast.parse(content, filename=file_path)
        
        functions = []
        classes = []
        errors = []
        
        # First pass: collect all classes to track their methods
        class_nodes = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                class_nodes.append(node)
                classes.append(extract_class_info(node))
        
        # Second pass: collect top-level functions (not methods)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Check if this function is a method of any class
                is_method = False
                for class_node in class_nodes:
                    if hasattr(class_node, 'body') and node in class_node.body:
                        is_method = True
                        break
                
                if not is_method:
                    functions.append(extract_function_info(node))
        
        return {
            'functions': functions,
            'classes': classes,
            'errors': errors,
            'file_path': file_path
        }
        
    except SyntaxError as e:
        return {
            'functions': [],
            'classes': [],
            'errors': [f'Syntax error at line {e.lineno}: {e.msg}'],
            'file_path': file_path
        }
    except Exception as e:
        return {
            'functions': [],
            'classes': [],
            'errors': [f'Error parsing file: {str(e)}'],
            'file_path': file_path
        }

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python script.py <file_path>'}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = parse_file(file_path)
    print(json.dumps(result, indent=2))
`;
  }

  /**
   * Run Python AST parsing via child process
   * @param {string} filePath - Path to file to parse
   * @param {string} pythonCode - Python code to execute
   * @returns {Promise<Object>} Parsed result
   */
  async runPythonAST(filePath, pythonCode) {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', pythonCode, filePath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Python output: ${parseError.message}\nOutput: ${stdout}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }

  /**
   * Check if Python is available on the system
   * @returns {Promise<boolean>} True if Python is available
   */
  async checkPythonAvailability() {
    return new Promise((resolve) => {
      const python = spawn('python3', ['--version'], { stdio: 'pipe' });
      
      python.on('close', (code) => {
        resolve(code === 0);
      });
      
      python.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Parse multiple files
   * @param {Array} files - Array of file paths
   * @returns {Promise<Array>} Array of parsed results
   */
  async parseFiles(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.parseFile(file.path);
        results.push(result);
      } catch (error) {
        if (this.skipErrors) {
          results.push({
            functions: [],
            classes: [],
            errors: [error.message],
            file_path: file.path
          });
        } else {
          throw error;
        }
      }
    }
    
    return results;
  }
}

module.exports = PythonParser;
