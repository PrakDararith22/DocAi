const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer');
const CodeRefactorer = require('./codeRefactorer');
const RefactoringUI = require('./refactoringUI');
const FileDiscovery = require('./fileDiscovery');
const { resolveOptions } = require('./config');

/**
 * Refactor Command Handler
 * Main entry point for refactoring workflow
 */
async function refactorCode(filePath, cliOptions) {
  try {
    // Load configuration
    const { options } = await resolveOptions(cliOptions);
    options.focusAreas = options.focusAreas || [];
    
    // Initialize components
    const refactorer = new CodeRefactorer(options);
    const ui = new RefactoringUI(options);
    
    // Determine focus areas
    const focusAreas = await determineFocusAreas(cliOptions);
    options.focusAreas = focusAreas;
    
    console.log(chalk.blue.bold('\n🔄 DocAI Refactoring\n'));
    
    if (options.verbose) {
      console.log(chalk.gray(`Focus: ${focusAreas.join(', ')}`));
      console.log('');
    }
    
    // Discover files
    const fileDiscovery = new FileDiscovery(options);
    const files = await fileDiscovery.discoverFiles(filePath);
    
    if (files.length === 0) {
      ui.showWarning('No files found to refactor.');
      return;
    }
    
    console.log(chalk.gray(`📁 Found ${files.length} file${files.length > 1 ? 's' : ''} to analyze\n`));
    
    // Show single-file warning
    ui.showWarning('⚠️  Single-file refactoring mode');
    ui.showInfo('Changes may affect other files that import from here');
    ui.showInfo('Please run your tests after refactoring\n');
    
    // Process each file
    const allResults = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (files.length > 1) {
        console.log(chalk.cyan(`\n${'='.repeat(60)}`));
        console.log(chalk.cyan.bold(`  File ${i + 1}/${files.length}: ${path.basename(file.path)}`));
        console.log(chalk.cyan(`${'='.repeat(60)}\n`));
      }
      
      try {
        const result = await processFile(file, options, refactorer, ui);
        allResults.push(result);
      } catch (error) {
        ui.showError(`Failed to process ${file.path}: ${error.message}`);
        if (options.verbose) {
          console.error(error);
        }
      }
    }
    
    // Show final summary if multiple files
    if (files.length > 1) {
      showFinalSummary(allResults, ui);
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error: ' + error.message));
    if (cliOptions.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Determine focus areas from CLI options
 * @param {Object} cliOptions - CLI options
 * @returns {Promise<Array>} Focus areas
 */
async function determineFocusAreas(cliOptions) {
  const focusAreas = [];
  
  // Check for explicit flags
  if (cliOptions.perf) focusAreas.push('performance');
  if (cliOptions.read) focusAreas.push('readability');
  if (cliOptions.best) focusAreas.push('best-practices');
  if (cliOptions.design) focusAreas.push('design-patterns');
  
  // If no flags, prompt user
  if (focusAreas.length === 0) {
    const { selectedMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedMode',
        message: 'Select refactoring focus:',
        choices: [
          { name: '🎯 All types (performance, readability, best practices)', value: 'all' },
          { name: '⚡ Performance optimizations only', value: 'performance' },
          { name: '📖 Readability improvements only', value: 'readability' },
          { name: '✨ Best practices only', value: 'best-practices' },
          { name: '🏗️  Design patterns only', value: 'design-patterns' }
        ],
        default: 'all'
      }
    ]);
    
    return selectedMode === 'all' ? ['all'] : [selectedMode];
  }
  
  return focusAreas;
}

/**
 * Process a single file
 * @param {Object} file - File object
 * @param {Object} options - Options
 * @param {CodeRefactorer} refactorer - Refactorer instance
 * @param {RefactoringUI} ui - UI instance
 * @returns {Promise<Object>} Result
 */
async function processFile(file, options, refactorer, ui) {
  // Read file
  const code = await fs.readFile(file.path, 'utf-8');
  
  // Check file size (1,000 line limit)
  const lineCount = code.split('\n').length;
  if (lineCount > 1000) {
    ui.showError(`File too large (${lineCount} lines). Maximum: 1,000 lines.`);
    ui.showInfo('Tip: Refactor smaller sections at a time.');
    return { skipped: 1, reason: 'too_large' };
  }
  
  // Get suggestions
  console.log(chalk.blue('🔍 Analyzing code...\n'));
  
  let suggestions;
  try {
    suggestions = await refactorer.getSuggestions(code, file.language, options.focusAreas, file.path);
  } catch (error) {
    ui.showError(`Failed to get suggestions: ${error.message}`);
    return { failed: [{ error: error.message }] };
  }
  
  // Show suggestions
  ui.showSuggestions(suggestions, path.basename(file.path));
  
  if (suggestions.length === 0) {
    return { skipped: 1, reason: 'no_suggestions' };
  }
  
  // Let user select
  const selected = await ui.selectRefactorings(suggestions);
  
  if (selected.length === 0) {
    ui.showInfo('No refactorings selected.');
    return { skipped: suggestions.length };
  }
  
  // Show preview for each selected
  console.log('');
  for (const suggestion of selected) {
    const preview = refactorer.previewChanges(code, code, suggestion);
    ui.showPreview(preview);
  }
  
  // Confirm application
  const confirmed = await ui.confirmApply(selected.length);
  
  if (!confirmed) {
    ui.showInfo('Refactoring cancelled.');
    return { skipped: selected.length };
  }
  
  // Apply refactorings
  console.log(chalk.blue('\n⚙️  Applying refactorings...\n'));
  
  const result = await refactorer.applyRefactorings(file.path, code, selected);
  
  if (result.success) {
    // Validate syntax before writing
    console.log(chalk.blue('🔍 Validating syntax...\n'));
    const isValid = await refactorer.validateSyntax(result.modifiedCode, file.language);
    
    if (!isValid) {
      // Rollback on syntax error
      ui.showError('Generated code has syntax errors. Rolling back changes.');
      await refactorer.backupManager.restoreBackup(file.path);
      return {
        failed: selected.length,
        reason: 'syntax_error'
      };
    }
    
    // Write modified code
    await fs.writeFile(file.path, result.modifiedCode, 'utf-8');
    
    // Cleanup backup on success
    await refactorer.backupManager.cleanupBackup(file.path);
    
    // Show results
    ui.showResults({
      applied: result.applied,
      skipped: suggestions.length - selected.length,
      failed: result.failed
    });
    
    return {
      applied: result.applied.length,
      skipped: suggestions.length - selected.length,
      failed: result.failed.length
    };
  } else {
    ui.showError('Some refactorings failed.');
    
    // Restore backup on failure
    await refactorer.backupManager.restoreBackup(file.path);
    
    ui.showResults({
      applied: result.applied,
      failed: result.failed
    });
    
    return {
      applied: result.applied.length,
      failed: result.failed.length
    };
  }
}

/**
 * Show final summary for multiple files
 * @param {Array} results - All results
 * @param {RefactoringUI} ui - UI instance
 */
function showFinalSummary(results, ui) {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.cyan.bold('  Final Summary'));
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');
  
  const totalApplied = results.reduce((sum, r) => sum + (r.applied || 0), 0);
  const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);
  const totalFailed = results.reduce((sum, r) => sum + (r.failed || 0), 0);
  
  console.log(chalk.green(`  ✅ Applied: ${totalApplied} refactoring${totalApplied !== 1 ? 's' : ''}`));
  if (totalSkipped > 0) {
    console.log(chalk.yellow(`  ⏭  Skipped: ${totalSkipped} refactoring${totalSkipped !== 1 ? 's' : ''}`));
  }
  if (totalFailed > 0) {
    console.log(chalk.red(`  ❌ Failed: ${totalFailed} refactoring${totalFailed !== 1 ? 's' : ''}`));
  }
  console.log('');
  console.log(chalk.blue('  💡 Remember to run your tests!'));
  console.log('');
}

module.exports = {
  refactorCode
};
