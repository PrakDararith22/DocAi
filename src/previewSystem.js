const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Preview System
 * Handles preview and interactive approval of generated documentation
 */
class PreviewSystem {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.interactive = options.interactive || false;
    this.batchApproval = options.batchApproval || false;
  }

  /**
   * Show preview of generated documentation
   * @param {Object} generationResults - Results from DocumentationGenerator
   * @param {Object} parseResults - Original parsing results
   * @returns {Promise<Object>} Preview results with user decisions
   */
  async showPreview(generationResults, parseResults) {
    console.log(chalk.blue('\n📝 Review Generated Documentation'));
    console.log(chalk.gray('Please review each function and decide whether to add the documentation.\n'));

    const previewResults = {
      approved: [],
      rejected: [],
      skipped: [],
      summary: {
        total: generationResults.generated.length,
        approved: 0,
        rejected: 0,
        skipped: 0
      }
    };

    if (generationResults.generated.length === 0) {
      console.log(chalk.yellow('No documentation generated to preview.'));
      return previewResults;
    }

    // Group by file for better organization
    const filesToPreview = this.groupByFile(generationResults.generated);
    
    for (const [filePath, items] of Object.entries(filesToPreview)) {
      if (this.verbose) {
        console.log(chalk.cyan(`\n📄 File: ${path.basename(filePath)}`));
        console.log(chalk.gray(`   Path: ${filePath}`));
        console.log(chalk.gray(`   Items: ${items.length} functions/classes\n`));
      }

      const fileResults = await this.previewFile(filePath, items, parseResults);
      
      previewResults.approved.push(...fileResults.approved);
      previewResults.rejected.push(...fileResults.rejected);
      previewResults.skipped.push(...fileResults.skipped);
    }

    // Update summary
    previewResults.summary.approved = previewResults.approved.length;
    previewResults.summary.rejected = previewResults.rejected.length;
    previewResults.summary.skipped = previewResults.skipped.length;

    this.showPreviewSummary(previewResults);
    return previewResults;
  }

  /**
   * Preview a single file's documentation
   * @param {string} filePath - File path
   * @param {Array} items - Items to preview
   * @param {Object} parseResults - Original parsing results
   * @returns {Promise<Object>} File preview results
   */
  async previewFile(filePath, items, parseResults) {
    const fileResults = {
      approved: [],
      rejected: [],
      skipped: []
    };

    for (const item of items) {
      const preview = await this.previewItem(item, parseResults);
      
      if (preview.decision === 'approve') {
        fileResults.approved.push(item);
      } else if (preview.decision === 'reject') {
        fileResults.rejected.push(item);
      } else {
        fileResults.skipped.push(item);
      }
    }

    return fileResults;
  }

  /**
   * Preview a single item (function/class)
   * @param {Object} item - Item to preview
   * @param {Object} parseResults - Original parsing results
   * @returns {Promise<Object>} Item preview result
   */
  async previewItem(item, parseResults) {
    // Find original item in parse results
    const originalItem = this.findOriginalItem(item, parseResults);
    
    // Show function/class signature
    this.showItemSignature(item, originalItem);
    
    // Show existing documentation if any
    if (originalItem && originalItem.has_docstring) {
      this.showExistingDocumentation(originalItem);
    }
    
    // Show generated documentation
    this.showGeneratedDocumentation(item);
    
    // Show diff if replacing existing documentation
    if (originalItem && originalItem.has_docstring) {
      this.showDiff(originalItem.docstring, item.docstring);
    }

    // Get user decision
    const decision = await this.getUserDecision(item, originalItem);
    
    return {
      item: item,
      decision: decision,
      originalItem: originalItem
    };
  }

  /**
   * Show function/class signature
   * @param {Object} item - Item to show
   * @param {Object} originalItem - Original item from parsing
   */
  showItemSignature(item, originalItem) {
    const isNew = !originalItem || !originalItem.has_docstring;
    
    console.log('');
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(chalk.cyan.bold(`  ${item.name}()`));
    console.log(chalk.cyan('━'.repeat(60)));
  }

  /**
   * Show existing documentation
   * @param {Object} originalItem - Original item with existing docstring
   */
  showExistingDocumentation(originalItem) {
    console.log(chalk.yellow('📜 Existing Documentation:'));
    console.log(chalk.gray('┌─────────────────────────────────────────────────────────┐'));
    
    const lines = originalItem.docstring.split('\n');
    lines.forEach(line => {
      console.log(chalk.gray(`│ ${line.padEnd(55)} │`));
    });
    
    console.log(chalk.gray('└─────────────────────────────────────────────────────────┘'));
    console.log('');
  }

  /**
   * Show generated documentation
   * @param {Object} item - Item with generated docstring
   */
  showGeneratedDocumentation(item) {
    // Check if docstring is empty or undefined
    if (!item.docstring || item.docstring.trim() === '') {
      console.log(chalk.red('  ❌ No documentation generated\n'));
    } else {
      const lines = item.docstring.split('\n');
      const maxLines = 8; // Show first 8 lines
      
      lines.slice(0, maxLines).forEach((line, idx) => {
        if (idx === 0) {
          console.log(chalk.white(line)); // First line in white
        } else {
          console.log(chalk.gray(line)); // Rest in gray
        }
      });
      
      if (lines.length > maxLines) {
        console.log(chalk.gray(`  ... +${lines.length - maxLines} more lines`));
      }
      console.log('');
    }
  }

  /**
   * Show diff between existing and generated documentation
   * @param {string} existing - Existing docstring
   * @param {string} generated - Generated docstring
   */
  showDiff(existing, generated) {
    console.log(chalk.blue('🔄 Changes:'));
    console.log(chalk.gray('┌─────────────────────────────────────────────────────────┐'));
    
    const existingLines = existing.split('\n');
    const generatedLines = generated.split('\n');
    
    // Simple diff display
    const maxLines = Math.max(existingLines.length, generatedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const existingLine = existingLines[i] || '';
      const generatedLine = generatedLines[i] || '';
      
      if (existingLine !== generatedLine) {
        if (existingLine) {
          console.log(chalk.red(`- ${existingLine.padEnd(53)}`));
        }
        if (generatedLine) {
          console.log(chalk.green(`+ ${generatedLine.padEnd(53)}`));
        }
      } else if (existingLine) {
        console.log(chalk.gray(`  ${existingLine.padEnd(53)}`));
      }
    }
    
    console.log(chalk.gray('└─────────────────────────────────────────────────────────┘'));
    console.log('');
  }

  /**
   * Get user decision for an item
   * @param {Object} item - Item to decide on
   * @param {Object} originalItem - Original item
   * @returns {Promise<string>} User decision
   */
  async getUserDecision(item, originalItem) {
    // Auto-skip items with empty docstrings
    if (!item.docstring || item.docstring.trim() === '') {
      console.log(chalk.yellow('  ⏭  Skipped\n'));
      return 'skip';
    }
    
    if (!this.interactive) {
      // Non-interactive mode - show preview and return 'approve'
      return 'approve';
    }

    // Check if this function already has documentation
    const hasExisting = originalItem && originalItem.has_docstring;
    
    let message, choices;
    
    if (hasExisting) {
      // Function already has docs - ask if they want to override
      message = chalk.yellow('⚠️  This function already has documentation. Override it?');
      choices = [
        { name: 'Yes, replace with new documentation', value: 'approve' },
        { name: 'No, keep existing documentation', value: 'reject' }
      ];
    } else {
      // New documentation - normal prompt
      message = 'Add this documentation?';
      choices = [
        { name: 'Yes, add this', value: 'approve' },
        { name: 'No, skip this', value: 'reject' }
      ];
    }

    // Add batch options for similar items
    if (this.batchApproval) {
      if (hasExisting) {
        choices.push(
          { name: 'Yes to all remaining (override all)', value: 'approve_all_functions' }
        );
      } else {
        choices.push(
          { name: 'Yes to all remaining', value: 'approve_all_functions' }
        );
      }
    }

    const { decision } = await inquirer.prompt([
      {
        type: 'list',
        name: 'decision',
        message: message,
        choices: choices,
        default: hasExisting ? 'reject' : 'approve', // Default to 'reject' for existing docs
        pageSize: 5
      }
    ]);

    console.log(''); // Add spacing after choice
    return decision;
  }

  /**
   * Show preview summary
   * @param {Object} previewResults - Preview results
   */
  showPreviewSummary(previewResults) {
    const approved = previewResults.summary.approved;
    const rejected = previewResults.summary.rejected;
    const total = previewResults.summary.total;
    
    console.log('');
    if (approved > 0) {
      console.log(chalk.green(`✓ You accepted ${approved} of ${total} items`));
    } else {
      console.log(chalk.yellow(`⚠️  No items were accepted`));
    }
  }

  /**
   * Save preview to file
   * @param {Object} generationResults - Generation results
   * @param {string} outputPath - Output file path
   * @returns {Promise<Object>} Save result
   */
  async savePreviewToFile(generationResults, outputPath) {
    try {
      const previewContent = this.generatePreviewContent(generationResults);
      await fs.writeFile(outputPath, previewContent, 'utf-8');
      
      return {
        success: true,
        path: outputPath,
        items: generationResults.generated.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate preview content for file output
   * @param {Object} generationResults - Generation results
   * @returns {string} Preview content
   */
  generatePreviewContent(generationResults) {
    let content = '# DocAI Documentation Preview\n\n';
    content += `Generated on: ${new Date().toISOString()}\n`;
    content += `Total items: ${generationResults.generated.length}\n\n`;
    content += '---\n\n';

    // Group by file
    const filesToPreview = this.groupByFile(generationResults.generated);
    
    for (const [filePath, items] of Object.entries(filesToPreview)) {
      content += `## File: ${path.basename(filePath)}\n`;
      content += `Path: ${filePath}\n\n`;
      
      items.forEach((item, index) => {
        content += `### ${index + 1}. ${item.type === 'function' ? 'Function' : 'Class'}: ${item.name}()\n`;
        content += `Line: ${item.line}\n\n`;
        content += '```\n';
        content += item.docstring;
        content += '\n```\n\n';
      });
      
      content += '---\n\n';
    }

    return content;
  }

  /**
   * Find original item in parse results
   * @param {Object} item - Generated item
   * @param {Object} parseResults - Parse results
   * @returns {Object|null} Original item or null
   */
  findOriginalItem(item, parseResults) {
    // Search through all language results
    const allResults = [...parseResults.python, ...parseResults.javascript, ...parseResults.typescript];
    
    for (const fileResult of allResults) {
      if (fileResult.file_path === item.file) {
        const items = fileResult.functions || fileResult.classes || [];
        return items.find(originalItem => 
          originalItem.name === item.name && 
          originalItem.line === item.line
        ) || null;
      }
    }
    
    return null;
  }

  /**
   * Group items by file
   * @param {Array} items - Items to group
   * @returns {Object} Grouped items
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

  /**
   * Show final confirmation before applying changes
   * @param {Object} previewResults - Preview results
   * @returns {Promise<boolean>} User confirmation
   */
  async showFinalConfirmation(previewResults) {
    if (previewResults.summary.approved === 0) {
      console.log(chalk.yellow('\n⚠️  No changes to apply'));
      return false;
    }

    console.log('');
    
    if (this.interactive) {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Apply these ${previewResults.summary.approved} change${previewResults.summary.approved > 1 ? 's' : ''} to your code?`,
          default: true
        }
      ]);
      
      return confirmed;
    } else {
      return true;
    }
  }
}

module.exports = PreviewSystem;
