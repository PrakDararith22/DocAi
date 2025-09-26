const parser = require('@babel/parser');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * JavaScript/TypeScript AST Parser
 * Uses @babel/parser with TypeScript and JSX support
 */
class JSParser {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.skipErrors = options.skipErrors || false;
    
    // Parser options for different file types
    this.parserOptions = {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining'
      ]
    };
  }

  /**
   * Parse JavaScript/TypeScript file and extract function/class information
   * @param {string} filePath - Path to JS/TS file
   * @returns {Promise<Object>} Parsed data with functions, classes, and errors
   */
  async parseFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const ast = parser.parse(content, {
        ...this.parserOptions,
        filename: filePath
      });

      const functions = [];
      const classes = [];
      const errors = [];

      // Traverse AST to find functions and classes
      this.traverseAST(ast, {
        FunctionDeclaration: (node) => {
          functions.push(this.extractFunctionInfo(node, 'function'));
        },
        FunctionExpression: (node) => {
          if (node.id) {
            functions.push(this.extractFunctionInfo(node, 'function'));
          }
        },
        ArrowFunctionExpression: (node) => {
          // Only include named arrow functions or those assigned to variables
          const parent = node.parent;
          if (parent && (parent.type === 'VariableDeclarator' || parent.type === 'AssignmentExpression')) {
            functions.push(this.extractFunctionInfo(node, 'arrow'));
          }
        },
        ClassDeclaration: (node) => {
          classes.push(this.extractClassInfo(node));
        },
        ClassExpression: (node) => {
          if (node.id) {
            classes.push(this.extractClassInfo(node));
          }
        }
      });

      if (this.verbose) {
        console.log(chalk.gray(`Parsed ${filePath}: ${functions.length} functions, ${classes.length} classes`));
      }

      return {
        functions,
        classes,
        errors,
        file_path: filePath
      };

    } catch (error) {
      if (this.skipErrors) {
        console.warn(chalk.yellow(`Warning: Could not parse ${filePath}: ${error.message}`));
        return {
          functions: [],
          classes: [],
          errors: [error.message],
          file_path: filePath
        };
      } else {
        throw error;
      }
    }
  }

  /**
   * Extract function information from AST node
   * @param {Object} node - AST function node
   * @param {string} type - Function type (function, arrow, method)
   * @returns {Object} Function information
   */
  extractFunctionInfo(node, type = 'function') {
    const params = [];
    
    // Extract parameters
    if (node.params) {
      for (const param of node.params) {
        const paramInfo = {
          name: this.getParameterName(param),
          line: param.loc ? param.loc.start.line : null
        };
        
        // Add type annotation if present
        if (param.typeAnnotation) {
          paramInfo.type = this.extractTypeAnnotation(param.typeAnnotation);
        }
        
        params.push(paramInfo);
      }
    }

    // Extract return type annotation
    let returnType = null;
    if (node.returnType) {
      returnType = this.extractTypeAnnotation(node.returnType);
    }

    // Check for JSDoc comment
    const jsdoc = this.findJSDocComment(node);
    
    return {
      name: node.id ? node.id.name : 'anonymous',
      line: node.loc ? node.loc.start.line : null,
      type: type,
      params: params,
      return_type: returnType,
      has_docstring: jsdoc !== null,
      docstring: jsdoc,
      is_async: node.async || false,
      is_generator: node.generator || false
    };
  }

  /**
   * Extract class information from AST node
   * @param {Object} node - AST class node
   * @returns {Object} Class information
   */
  extractClassInfo(node) {
    const methods = [];
    
    // Extract methods from class body
    if (node.body && node.body.body) {
      for (const member of node.body.body) {
        if (member.type === 'MethodDefinition' || 
            (member.type === 'FunctionExpression' && member.key)) {
          const methodInfo = this.extractFunctionInfo(member.value || member, 'method');
          methodInfo.name = member.key.name || member.key.value;
          methodInfo.is_method = true;
          methodInfo.kind = member.kind || 'method';
          methods.push(methodInfo);
        }
      }
    }

    // Check for JSDoc comment
    const jsdoc = this.findJSDocComment(node);

    return {
      name: node.id ? node.id.name : 'anonymous',
      line: node.loc ? node.loc.start.line : null,
      methods: methods,
      has_docstring: jsdoc !== null,
      docstring: jsdoc,
      is_abstract: this.hasDecorator(node, 'abstract') || false
    };
  }

  /**
   * Get parameter name from various parameter types
   * @param {Object} param - Parameter AST node
   * @returns {string} Parameter name
   */
  getParameterName(param) {
    switch (param.type) {
      case 'Identifier':
        return param.name;
      case 'AssignmentPattern':
        return param.left.name;
      case 'RestElement':
        return param.argument.name;
      case 'ObjectPattern':
        return `{${param.properties.map(p => p.key.name).join(', ')}}`;
      case 'ArrayPattern':
        return `[${param.elements.map(e => e ? e.name : '').join(', ')}]`;
      default:
        return 'unknown';
    }
  }

  /**
   * Extract type annotation from TypeScript type node
   * @param {Object} typeNode - Type annotation AST node
   * @returns {string} Type string
   */
  extractTypeAnnotation(typeNode) {
    // This is a simplified type extraction
    // In a full implementation, you'd want to handle all TypeScript types
    if (typeNode.typeAnnotation) {
      return this.extractTypeAnnotation(typeNode.typeAnnotation);
    }
    
    switch (typeNode.type) {
      case 'TSTypeReference':
        return typeNode.typeName.name;
      case 'TSStringKeyword':
        return 'string';
      case 'TSNumberKeyword':
        return 'number';
      case 'TSBooleanKeyword':
        return 'boolean';
      case 'TSVoidKeyword':
        return 'void';
      case 'TSAnyKeyword':
        return 'any';
      case 'TSArrayType':
        return `${this.extractTypeAnnotation(typeNode.elementType)}[]`;
      case 'TSUnionType':
        return typeNode.types.map(t => this.extractTypeAnnotation(t)).join(' | ');
      default:
        return 'unknown';
    }
  }

  /**
   * Find JSDoc comment for a node
   * @param {Object} node - AST node
   * @returns {string|null} JSDoc comment or null
   */
  findJSDocComment(node) {
    if (!node.leadingComments) {
      return null;
    }

    // Look for JSDoc comment (starts with /**)
    for (const comment of node.leadingComments) {
      if (comment.type === 'CommentBlock' && comment.value.trim().startsWith('*')) {
        return comment.value;
      }
    }

    return null;
  }

  /**
   * Check if node has a specific decorator
   * @param {Object} node - AST node
   * @param {string} decoratorName - Name of decorator to look for
   * @returns {boolean} True if decorator is present
   */
  hasDecorator(node, decoratorName) {
    if (!node.decorators) {
      return false;
    }

    return node.decorators.some(decorator => {
      if (decorator.expression && decorator.expression.type === 'Identifier') {
        return decorator.expression.name === decoratorName;
      }
      return false;
    });
  }

  /**
   * Traverse AST and call handlers for specific node types
   * @param {Object} ast - AST root node
   * @param {Object} handlers - Object with node type handlers
   */
  traverseAST(ast, handlers) {
    const traverse = (node, parent = null) => {
      if (!node || typeof node !== 'object') {
        return;
      }

      // Set parent reference for context
      node.parent = parent;

      // Call handler if available
      if (handlers[node.type]) {
        handlers[node.type](node);
      }

      // Recursively traverse children
      for (const key in node) {
        if (key !== 'parent' && node.hasOwnProperty(key)) {
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(item => traverse(item, node));
          } else if (child && typeof child === 'object') {
            traverse(child, node);
          }
        }
      }
    };

    traverse(ast);
  }

  /**
   * Parse multiple files
   * @param {Array} files - Array of file objects
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

module.exports = JSParser;
