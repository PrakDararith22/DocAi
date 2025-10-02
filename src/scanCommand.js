const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const FileDiscovery = require('./fileDiscovery');
const ParserManager = require('./parserManager');

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
        parseResult.functions.forEach(func => {
          results.total++;
          
          if (!func.has_docstring) {
            results.missingDocs.push({
              file: file.path,
              name: func.name,
              line: func.line,
              type: 'function'
            });
          } else {
            results.hasDocs.push({
              file: file.path,
              name: func.name,
              line: func.line,
              type: 'function'
            });
          }
        });
      }

      if (parseResult.classes) {
        parseResult.classes.forEach(cls => {
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
        });
      }
    }

    // Display results
    this.displayResults(results);
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
    console.log(chalk.green(`✓ With documentation: ${results.hasDocs.length}`));
    console.log(chalk.red(`✗ Missing documentation: ${results.missingDocs.length}`));
    console.log(chalk.blue(`Coverage: ${coverage}%`));
    console.log('');

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
