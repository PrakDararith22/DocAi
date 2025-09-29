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
    console.log(chalk.blue('\n📋 Documentation Preview'));
    console.log(chalk.gray('========================\n'));

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
      console.log(chalk.cyan(`\n📄 File: ${path.basename(filePath)}`));
      console.log(chalk.gray(`   Path: ${filePath}`));
      console.log(chalk.gray(`   Items: ${items.length} functions/classes\n`));

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
    const type = item.type === 'function' ? '🔧 Function' : '🏗️  Class';
    const status = originalItem && originalItem.has_docstring ? 'yellow' : 'green';
    const statusText = originalItem && originalItem.has_docstring ? 'UPDATE' : 'NEW';
    
    console.log(chalk[status](`${type}: ${item.name}() - ${statusText}`));
    
    if (originalItem && originalItem.params && originalItem.params.length > 0) {
      const params = originalItem.params.map(param => {
        const typeInfo = param.type ? `: ${param.type}` : '';
        return `${param.name}${typeInfo}`;
      }).join(', ');
      console.log(chalk.gray(`   Parameters: ${params}`));
    }
    
    if (originalItem && originalItem.return_type) {
      console.log(chalk.gray(`   Returns: ${originalItem.return_type}`));
    }
    
    console.log(chalk.gray(`   Line: ${item.line}`));
    console.log('');
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
    console.log(chalk.green('✨ Generated Documentation:'));
    console.log(chalk.gray('┌─────────────────────────────────────────────────────────┐'));
    
    const lines = item.docstring.split('\n');
    lines.forEach(line => {
      console.log(chalk.green(`│ ${line.padEnd(55)} │`));
    });
    
    console.log(chalk.gray('└─────────────────────────────────────────────────────────┘'));
    console.log('');
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
    if (!this.interactive) {
      // Non-interactive mode - show preview and return 'approve'
      console.log(chalk.gray('📝 Preview mode: Will be applied automatically'));
      return 'approve';
    }

    const choices = [
      { name: '✅ Approve', value: 'approve' },
      { name: '❌ Reject', value: 'reject' },
      { name: '⏭️  Skip', value: 'skip' }
    ];

    // Add batch options for similar items
    if (this.batchApproval && !originalItem?.has_docstring) {
      choices.push(
        { name: '✅ Approve all new functions', value: 'approve_all_functions' },
        { name: '✅ Approve all new classes', value: 'approve_all_classes' }
      );
    }

    const { decision } = await inquirer.prompt([
      {
        type: 'list',
        name: 'decision',
        message: `What would you like to do with ${item.name}()?`,
        choices: choices,
        pageSize: 10
      }
    ]);

    return decision;
  }

  /**
   * Show preview summary
   * @param {Object} previewResults - Preview results
   */
  showPreviewSummary(previewResults) {
    console.log(chalk.blue('\n📊 Preview Summary:'));
    console.log(chalk.gray('=================='));
    console.log(chalk.green(`✅ Approved: ${previewResults.summary.approved}`));
    console.log(chalk.red(`❌ Rejected: ${previewResults.summary.rejected}`));
    console.log(chalk.yellow(`⏭️  Skipped: ${previewResults.summary.skipped}`));
    console.log(chalk.cyan(`📈 Total: ${previewResults.summary.total}`));
    
    if (previewResults.summary.approved > 0) {
      console.log(chalk.green(`\n🎉 ${previewResults.summary.approved} items will be applied!`));
    }
    
    if (previewResults.summary.rejected > 0) {
      console.log(chalk.red(`\n🚫 ${previewResults.summary.rejected} items were rejected.`));
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
      console.log(chalk.yellow('No changes to apply.'));
      return false;
    }

    console.log(chalk.blue('\n🤔 Final Confirmation'));
    console.log(chalk.gray('===================='));
    console.log(chalk.cyan(`Ready to apply ${previewResults.summary.approved} changes?`));
    
    if (this.interactive) {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Proceed with applying the approved changes?',
          default: true
        }
      ]);
      
      return confirmed;
    } else {
      console.log(chalk.gray('Preview mode: Changes will be applied automatically'));
      return true;
    }
  }
}

module.exports = PreviewSystem;
