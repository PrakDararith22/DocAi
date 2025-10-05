const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');

/**
 * Refactoring UI
 * Interactive UI for showing suggestions and getting user input
 * Matches Phase 1 UI style
 */
class RefactoringUI {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
  }

  /**
   * Show refactoring suggestions
   * @param {Array} suggestions - Refactoring suggestions
   * @param {string} filePath - File path
   * @returns {Array} Suggestions for backward compatibility
   */
  showSuggestions(suggestions, filePath) {
    console.log('');
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(chalk.cyan.bold(`  Refactoring Suggestions for ${filePath || 'file'}`));
    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');

    if (!suggestions || suggestions.length === 0) {
      console.log(chalk.yellow('  No refactoring suggestions found.'));
      console.log(chalk.gray('  The code looks good!'));
      console.log('');
      return [];
    }

    suggestions.forEach((suggestion, index) => {
      this.showSingleSuggestion(suggestion, index + 1);
    });

    return suggestions;
  }

  /**
   * Show a single suggestion
   * @param {Object} suggestion - Suggestion object
   * @param {number} number - Suggestion number
   */
  showSingleSuggestion(suggestion, number) {
    // Handle missing properties gracefully
    const title = suggestion.title || 'Refactoring suggestion';
    const type = suggestion.type || 'improvement';
    const impact = suggestion.impact || 'medium';
    const lineStart = suggestion.lineStart || 1;
    const lineEnd = suggestion.lineEnd || 1;
    
    // Header with type and impact
    const typeIcon = this.getTypeIcon(type);
    const impactColor = this.getImpactColor(impact);
    const impactText = impact.toUpperCase();
    
    console.log(chalk.white.bold(`[${number}] ${typeIcon} ${title}`));
    console.log(chalk.gray(`    Lines ${lineStart}-${lineEnd} | Impact: ${impactColor(impactText)}`));
    console.log('');

    // Description
    if (suggestion.description) {
      console.log(chalk.gray(`    ${suggestion.description}`));
      console.log('');
    }
    
    // Show detailed explanation if enabled
    if (this.options.explain && suggestion.explanation) {
      console.log(chalk.cyan('    📖 Detailed Explanation:'));
      console.log(chalk.gray(`    ${suggestion.explanation}`));
      console.log('');
    }

    // Show code comparison
    if (suggestion.originalCode && suggestion.refactoredCode) {
      console.log(chalk.gray('    Current:'));
      const originalLines = suggestion.originalCode.split('\n');
      originalLines.forEach(line => {
        console.log(chalk.red(`    - ${line}`));
      });
      console.log('');

      console.log(chalk.gray('    Improved:'));
      const refactoredLines = suggestion.refactoredCode.split('\n');
      refactoredLines.forEach(line => {
        console.log(chalk.green(`    + ${line}`));
      });
      console.log('');
    }

    // Reason and improvement
    if (suggestion.reason) {
      console.log(chalk.blue(`    💡 ${suggestion.reason}`));
    }
    if (suggestion.estimatedImprovement) {
      console.log(chalk.cyan(`    ⚡ ${suggestion.estimatedImprovement}`));
    }
    console.log('');
    console.log(chalk.gray('    ' + '─'.repeat(56)));
    console.log('');
  }

  /**
   * Get icon for suggestion type
   * @param {string} type - Suggestion type
   * @returns {string} Icon
   */
  getTypeIcon(type) {
    const icons = {
      'performance': '⚡',
      'readability': '📖',
      'best-practice': '✨',
      'design-pattern': '🏗️'
    };
    return icons[type] || '🔧';
  }

  /**
   * Get color for impact level
   * @param {string} impact - Impact level
   * @returns {Function} Chalk color function
   */
  getImpactColor(impact) {
    const colors = {
      'high': chalk.red,
      'medium': chalk.yellow,
      'low': chalk.blue
    };
    return colors[impact] || chalk.yellow;
  }

  /**
   * Let user select which refactorings to apply
   * @param {Array} suggestions - All suggestions
   * @returns {Promise<Array>} Selected suggestions
   */
  async selectRefactorings(suggestions) {
    if (suggestions.length === 0) {
      return [];
    }

    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');

    const choices = suggestions.map((suggestion, index) => ({
      name: `[${index + 1}] ${this.getTypeIcon(suggestion.type)} ${suggestion.title} (${suggestion.impact || 'medium'} impact)`,
      value: index,
      checked: false
    }));

    choices.push({ type: 'separator' });
    choices.push({
      name: chalk.gray('Select all'),
      value: 'all',
      checked: false
    });

    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select refactorings to apply:',
        choices: choices,
        pageSize: 15
      }
    ]);

    // Handle "select all"
    if (selected.includes('all')) {
      return suggestions;
    }

    // Return selected suggestions
    return selected.map(index => suggestions[index]);
  }

  /**
   * Show preview of changes
   * @param {Object} preview - Preview data
   */
  showPreview(preview) {
    console.log('');
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(chalk.cyan.bold('  Preview Changes'));
    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');

    // Show context before
    if (preview.contextBefore && preview.contextBefore.length > 0) {
      console.log(chalk.gray('  Context:'));
      preview.contextBefore.forEach(line => {
        console.log(chalk.gray(`    ${line}`));
      });
      console.log('');
    }

    // Show before (red)
    console.log(chalk.red.bold('  Before:'));
    if (preview.original && Array.isArray(preview.original)) {
      preview.original.forEach(line => {
        console.log(chalk.red(`  - ${line}`));
      });
    }
    console.log('');

    // Show after (green)
    console.log(chalk.green.bold('  After:'));
    if (preview.refactored && Array.isArray(preview.refactored)) {
      preview.refactored.forEach(line => {
        console.log(chalk.green(`  + ${line}`));
      });
    }
    console.log('');

    // Show context after
    if (preview.contextAfter && preview.contextAfter.length > 0) {
      console.log(chalk.gray('  Context:'));
      preview.contextAfter.forEach(line => {
        console.log(chalk.gray(`    ${line}`));
      });
      console.log('');
    }

    // Show metadata
    console.log(chalk.blue(`  Type: ${preview.type}`));
    console.log(chalk.blue(`  Impact: ${preview.impact || 'medium'}`));
    if (preview.reason) {
      console.log(chalk.blue(`  Reason: ${preview.reason}`));
    }
    console.log('');
  }

  /**
   * Confirm application of refactorings
   * @param {number|Array} countOrSuggestions - Number of refactorings or suggestions array
   * @returns {Promise<boolean>} User confirmed
   */
  async confirmApply(countOrSuggestions) {
    // Handle both number and array inputs for backward compatibility
    const count = Array.isArray(countOrSuggestions) ? countOrSuggestions.length : countOrSuggestions;
    
    if (count === 0) {
      return false;
    }

    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Apply ${count} refactoring${count > 1 ? 's' : ''}?`,
        default: true
      }
    ]);

    console.log('');
    return confirmed;
  }

  /**
   * Show progress indicator
   * @param {number} current - Current item
   * @param {number} total - Total items
   * @param {string} message - Progress message
   */
  showProgress(current, total, message = 'Processing') {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.round(percentage / 5));
    const empty = '░'.repeat(20 - Math.round(percentage / 5));
    
    console.log(chalk.cyan(`  ${bar}${empty} ${percentage}% | ${current}/${total} ${message}`));
  }

  /**
   * Show results summary
   * @param {Object} results - Results object
   */
  showResults(results) {
    console.log('');
    console.log(chalk.cyan('━'.repeat(60)));
    console.log(chalk.cyan.bold('  Results'));
    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');

    if (results.applied && results.applied.length > 0) {
      console.log(chalk.green(`  ✅ Applied ${results.applied.length} refactoring${results.applied.length > 1 ? 's' : ''}`));
      console.log('');
      
      results.applied.forEach((suggestion, index) => {
        console.log(chalk.green(`    ${index + 1}. ${suggestion.title} (lines ${suggestion.lineStart}-${suggestion.lineEnd})`));
      });
      console.log('');
    }

    if (results.skipped && results.skipped > 0) {
      console.log(chalk.yellow(`  ⏭  Skipped ${results.skipped} refactoring${results.skipped > 1 ? 's' : ''}`));
      console.log('');
    }

    if (results.failed && results.failed.length > 0) {
      console.log(chalk.red(`  ❌ Failed ${results.failed.length} refactoring${results.failed.length > 1 ? 's' : ''}`));
      console.log('');
      
      results.failed.forEach((failure, index) => {
        console.log(chalk.red(`    ${index + 1}. ${failure.suggestion.title}: ${failure.error}`));
      });
      console.log('');
    }

    // Show tips
    console.log(chalk.cyan('━'.repeat(60)));
    console.log('');
    console.log(chalk.blue('  💡 Tips:'));
    console.log(chalk.gray('    • Run your tests to verify changes'));
    console.log(chalk.gray('    • Review the changes with git diff'));
    console.log(chalk.gray('    • Commit if everything looks good'));
    console.log('');
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    console.log('');
    console.log(chalk.red('  ❌ Error: ' + message));
    console.log('');
  }

  /**
   * Show warning message
   * @param {string} message - Warning message
   */
  showWarning(message) {
    console.log('');
    console.log(chalk.yellow('  ⚠️  Warning: ' + message));
    console.log('');
  }

  /**
   * Show info message
   * @param {string} message - Info message
   */
  showInfo(message) {
    console.log('');
    console.log(chalk.blue('  ℹ️  ' + message));
    console.log('');
  }

  /**
   * Show success message
   * @param {string} message - Success message
   */
  showSuccess(message) {
    console.log('');
    console.log(chalk.green('  ✅ ' + message));
    console.log('');
  }

  /**
   * Format impact level with colors
   * @param {string} impact - Impact level
   * @returns {string} Formatted impact
   */
  formatImpact(impact) {
    const color = this.getImpactColor(impact);
    return color(impact.toUpperCase());
  }

  /**
   * Format suggestion type with colors
   * @param {string} type - Suggestion type
   * @returns {string} Formatted type
   */
  formatType(type) {
    const icon = this.getTypeIcon(type);
    const colors = {
      'performance': chalk.red,
      'readability': chalk.blue,
      'best-practice': chalk.green,
      'best-practices': chalk.green,
      'design-pattern': chalk.magenta,
      'design-patterns': chalk.magenta
    };
    const color = colors[type] || chalk.white;
    return `${icon} ${color(type)}`;
  }
}

module.exports = RefactoringUI;
