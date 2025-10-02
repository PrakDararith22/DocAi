const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const FileDiscovery = require('./fileDiscovery');
const ParserManager = require('./parserManager');
const GitHelper = require('./gitHelper');
const MetadataManager = require('./metadataManager');

/**
 * Scan for missing or outdated documentation
 * Similar to 'git status' but for documentation
 */
class DocumentationScanner {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
  }

  /**
   * Scan files and report documentation status
   */
  async scan() {
    console.log(chalk.blue.bold('\n🔍 DocAI - Documentation Status\n'));

    // Check if git is available
    const gitHelper = new GitHelper(this.options.project);
    const hasGit = await gitHelper.isGitRepository();
    
    if (hasGit && this.verbose) {
      console.log(chalk.gray('✓ Git repository detected - using git-based detection\n'));
    } else if (this.verbose) {
      console.log(chalk.gray('⚠ No git repository - using parameter-based detection\n'));
    }

    // Initialize metadata manager
    const metadataManager = new MetadataManager(this.options.project);

    // Discover files
    const fileDiscovery = new FileDiscovery(this.options);
    const files = await fileDiscovery.discoverFiles();

    if (files.length === 0) {
      console.log(chalk.yellow('No files found to scan.'));
      return;
    }

    console.log(chalk.gray(`Scanning ${files.length} files...\n`));

    // Parse files
    const parserManager = new ParserManager(this.options);
    const results = {
      missingDocs: [],
      hasDocs: [],
      outdated: [],
      total: 0
    };

    for (const file of files) {
      const parseResult = await parserManager.parseFile(file);
      
      if (parseResult.functions) {
        for (const func of parseResult.functions) {
          results.total++;
          
          if (!func.has_docstring) {
            results.missingDocs.push({
              file: file.path,
              name: func.name,
              line: func.line,
              type: 'function',
              params: func.params || []
            });
          } else {
            // Check if outdated (git-based or parameter-based)
            const outdatedReason = await this.checkOutdated(
              func,
              file.path,
              hasGit ? gitHelper : null,
              metadataManager
            );
            
            if (outdatedReason) {
              results.outdated.push({
                file: file.path,
                name: func.name,
                line: func.line,
                type: 'function',
                reason: outdatedReason,
                params: func.params || [],
                docstring: func.docstring
              });
            } else {
              results.hasDocs.push({
                file: file.path,
                name: func.name,
                line: func.line,
                type: 'function'
              });
            }
          }
        }
      }

      if (parseResult.classes) {
        for (const cls of parseResult.classes) {
          results.total++;
          
          if (!cls.has_docstring) {
            results.missingDocs.push({
              file: file.path,
              name: cls.name,
              line: cls.line,
              type: 'class'
            });
          } else {
            results.hasDocs.push({
              file: file.path,
              name: cls.name,
              line: cls.line,
              type: 'class'
            });
          }
        }
      }
    }

    // Display results
    this.displayResults(results);
  }

  /**
   * Check if documentation is outdated
   * Uses git-based detection if available, falls back to parameter matching
   */
  async checkOutdated(func, filePath, gitHelper, metadataManager) {
    if (!func.docstring || !func.params) {
      return null;
    }
    
    // Try git-based detection first
    if (gitHelper) {
      const gitReason = await this.checkOutdatedGit(func, filePath, gitHelper, metadataManager);
      if (gitReason) {
        return gitReason;
      }
    }
    
    // Fall back to parameter-based detection
    return this.checkOutdatedParameters(func);
  }
  
  /**
   * Git-based outdated detection
   */
  async checkOutdatedGit(func, filePath, gitHelper, metadataManager) {
    // Check if we have metadata for this function
    const genInfo = await metadataManager.getGenerationInfo(filePath, func.name);
    
    if (!genInfo) {
      // No metadata - can't use git detection
      return null;
    }
    
    // Get last commit for the file
    const lastCommit = await gitHelper.getLastCommitForFile(filePath);
    
    if (!lastCommit) {
      return null;
    }
    
    // Compare commits
    if (lastCommit !== genInfo.gitCommit) {
      return `Code changed after documentation (git-based detection)`;
    }
    
    // Check for uncommitted changes
    const hasChanges = await gitHelper.hasUncommittedChanges(filePath);
    if (hasChanges) {
      return `File has uncommitted changes`;
    }
    
    return null; // Up to date according to git
  }
  
  /**
   * Parameter-based outdated detection
   */
  checkOutdatedParameters(func) {
    // Extract documented parameters from docstring
    const documentedParams = this.extractDocumentedParams(func.docstring);
    const actualParams = func.params;
    
    // Check if parameter count matches
    if (documentedParams.length !== actualParams.length) {
      return `Parameter count mismatch (docs: ${documentedParams.length}, actual: ${actualParams.length})`;
    }
    
    // Check if parameter names match
    for (const actualParam of actualParams) {
      if (!documentedParams.includes(actualParam)) {
        return `Missing parameter '${actualParam}' in documentation`;
      }
    }
    
    // Check for extra documented parameters
    for (const docParam of documentedParams) {
      if (!actualParams.includes(docParam)) {
        return `Extra parameter '${docParam}' in documentation (not in function)`;
      }
    }
    
    return null; // Up to date
  }
  
  /**
   * Extract parameter names from docstring
   */
  extractDocumentedParams(docstring) {
    const params = [];
    
    // Match common docstring patterns
    // Google style: "Args:\n    param_name (type): description"
    // NumPy style: "Parameters\n----------\nparam_name : type"
    // Sphinx style: ":param param_name: description"
    
    const patterns = [
      /^\s*(\w+)\s*\([^)]*\)\s*:/gm,  // Google: param_name (type):
      /^\s*:param\s+(\w+)\s*:/gm,      // Sphinx: :param param_name:
      /^\s*(\w+)\s*:\s*\w+/gm          // NumPy: param_name : type
    ];
    
    for (const pattern of patterns) {
      const matches = docstring.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !params.includes(match[1])) {
          params.push(match[1]);
        }
      }
    }
    
    return params;
  }

  /**
   * Display scan results
   */
  displayResults(results) {
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(chalk.cyan.bold('  Documentation Status'));
    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');

    // Summary
    const coverage = results.total > 0 
      ? ((results.hasDocs.length / results.total) * 100).toFixed(1)
      : 0;

    console.log(chalk.white(`Total functions/classes: ${results.total}`));
    console.log(chalk.green(`✓ Up-to-date documentation: ${results.hasDocs.length}`));
    console.log(chalk.yellow(`⚠ Outdated documentation: ${results.outdated.length}`));
    console.log(chalk.red(`✗ Missing documentation: ${results.missingDocs.length}`));
    console.log(chalk.blue(`Coverage: ${coverage}%`));
    console.log('');

    // Outdated documentation
    if (results.outdated.length > 0) {
      console.log(chalk.yellow.bold('Outdated Documentation:'));
      console.log('');

      // Group by file
      const byFile = this.groupByFile(results.outdated);
      
      for (const [filePath, items] of Object.entries(byFile)) {
        console.log(chalk.yellow(`  ${path.basename(filePath)}`));
        console.log(chalk.gray(`    ${filePath}`));
        
        items.forEach(item => {
          const icon = item.type === 'function' ? '𝑓' : 'C';
          console.log(chalk.yellow(`    ${icon} ${item.name}() `), chalk.gray(`(line ${item.line})`));
          console.log(chalk.gray(`       ${item.reason}`));
        });
        
        console.log('');
      }
    }

    // Missing documentation
    if (results.missingDocs.length > 0) {
      console.log(chalk.red.bold('Missing Documentation:'));
      console.log('');

      // Group by file
      const byFile = this.groupByFile(results.missingDocs);
      
      for (const [filePath, items] of Object.entries(byFile)) {
        console.log(chalk.yellow(`  ${path.basename(filePath)}`));
        console.log(chalk.gray(`    ${filePath}`));
        
        items.forEach(item => {
          const icon = item.type === 'function' ? '𝑓' : 'C';
          console.log(chalk.red(`    ${icon} ${item.name}() `), chalk.gray(`(line ${item.line})`));
        });
        
        console.log('');
      }

      // Suggestions
      console.log(chalk.cyan('━'.repeat(60)));
      console.log(chalk.white.bold('💡 To add documentation:'));
      console.log('');
      console.log(chalk.gray('  # Generate for all files'));
      console.log(chalk.cyan('  docai generate ./src'));
      console.log('');
      console.log(chalk.gray('  # Generate for specific file'));
      console.log(chalk.cyan(`  docai generate ${Object.keys(byFile)[0]}`));
      console.log('');
    } else {
      console.log(chalk.green.bold('✅ All functions and classes have documentation!'));
      console.log('');
    }

    console.log(chalk.cyan('━'.repeat(60)));
  }

  /**
   * Group items by file
   */
  groupByFile(items) {
    const grouped = {};
    
    items.forEach(item => {
      if (!grouped[item.file]) {
        grouped[item.file] = [];
      }
      grouped[item.file].push(item);
    });
    
    return grouped;
  }
}

/**
 * Run documentation scan
 */
async function scanDocumentation(options = {}) {
  try {
    const scanner = new DocumentationScanner(options);
    await scanner.scan();
  } catch (error) {
    console.error(chalk.red('Error during scan:'), error.message);
    process.exit(1);
  }
}

module.exports = {
  DocumentationScanner,
  scanDocumentation
};
