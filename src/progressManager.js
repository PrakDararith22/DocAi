const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');
const cliProgress = require('cli-progress').default || require('cli-progress');

/**
 * Progress Manager
 * Handles progress indicators, feedback, and logging throughout operations
 */
class ProgressManager {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.minimal = options.minimal || false;
    this.startTime = Date.now();
    this.spinners = new Map();
    this.progressBars = new Map();
    this.logs = [];
  }

  /**
   * Start a spinner for an operation
   * @param {string} id - Unique identifier for the spinner
   * @param {string} text - Text to display
   * @returns {Object} Spinner instance
   */
  startSpinner(id, text) {
    if (this.minimal && !this.verbose) {
      return null;
    }

    const spinner = ora({
      text: text,
      spinner: 'dots',
      color: 'blue'
    }).start();

    this.spinners.set(id, spinner);
    return spinner;
  }

  /**
   * Update spinner text
   * @param {string} id - Spinner identifier
   * @param {string} text - New text
   */
  updateSpinner(id, text) {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.text = text;
    }
  }

  /**
   * Stop a spinner
   * @param {string} id - Spinner identifier
   * @param {string} status - 'succeed', 'fail', or 'info'
   * @param {string} text - Final text
   */
  stopSpinner(id, status = 'succeed', text = '') {
    const spinner = this.spinners.get(id);
    if (spinner) {
      if (status === 'succeed') {
        spinner.succeed(text || 'Completed');
      } else if (status === 'fail') {
        spinner.fail(text || 'Failed');
      } else {
        spinner.info(text || 'Done');
      }
      this.spinners.delete(id);
    }
  }

  /**
   * Create a progress bar
   * @param {string} id - Unique identifier
   * @param {number} total - Total number of items
   * @param {string} format - Progress bar format
   * @returns {Object} Progress bar instance
   */
  createProgressBar(id, total, format = 'Progress |{bar}| {percentage}% | {value}/{total} | {label}') {
    if (this.minimal && !this.verbose) {
      return null;
    }

    const progressBar = new cliProgress.SingleBar({
      format: format,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true
    }, cliProgress.Presets.shades_classic);

    progressBar.start(total, 0, { label: 'Starting...' });
    this.progressBars.set(id, progressBar);
    
    return progressBar;
  }

  /**
   * Update progress bar
   * @param {string} id - Progress bar identifier
   * @param {number} value - Current value
   * @param {Object} options - Additional options
   */
  updateProgressBar(id, value, options = {}) {
    const progressBar = this.progressBars.get(id);
    if (progressBar) {
      progressBar.update(value, options);
    }
  }

  /**
   * Stop progress bar
   * @param {string} id - Progress bar identifier
   */
  stopProgressBar(id) {
    const progressBar = this.progressBars.get(id);
    if (progressBar) {
      progressBar.stop();
      this.progressBars.delete(id);
    }
  }

  /**
   * Log a message with appropriate color and level
   * @param {string} message - Message to log
   * @param {string} level - Log level: 'info', 'success', 'warning', 'error'
   * @param {boolean} force - Force logging even in minimal mode
   */
  log(message, level = 'info', force = false) {
    if (this.minimal && !this.verbose && !force) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message
    };

    this.logs.push(logEntry);

    let color = chalk.gray;
    let prefix = '';

    switch (level) {
      case 'success':
        color = chalk.green;
        prefix = '✅ ';
        break;
      case 'warning':
        color = chalk.yellow;
        prefix = '⚠️  ';
        break;
      case 'error':
        color = chalk.red;
        prefix = '❌ ';
        break;
      case 'info':
      default:
        color = chalk.blue;
        prefix = 'ℹ️  ';
        break;
    }

    if (this.verbose) {
      console.log(color(`${prefix}${message}`));
    } else if (force || level === 'error' || level === 'success') {
      console.log(color(`${prefix}${message}`));
    }
  }

  /**
   * Log file processing result
   * @param {string} filePath - File path
   * @param {Object} result - Processing result
   */
  logFileResult(filePath, result) {
    const fileName = require('path').basename(filePath);
    
    if (result.success) {
      const changes = result.modifications || 0;
      if (changes > 0) {
        this.log(`Processed ${fileName} (${changes} changes)`, 'success');
      } else {
        this.log(`Processed ${fileName} (no changes)`, 'info');
      }
    } else {
      this.log(`Failed to process ${fileName}: ${result.error}`, 'error');
    }
  }

  /**
   * Log API operation
   * @param {string} operation - Operation description
   * @param {Object} result - API result
   */
  logAPIResult(operation, result) {
    if (result.success) {
      this.log(`API ${operation}: Success`, 'success');
    } else {
      this.log(`API ${operation}: ${result.error}`, 'error');
    }
  }

  /**
   * Show processing statistics
   * @param {Object} stats - Processing statistics
   */
  showStatistics(stats) {
    const duration = Date.now() - this.startTime;
    const durationText = this.formatDuration(duration);

    console.log(chalk.blue('\n📊 Processing Statistics:'));
    console.log(chalk.gray('========================'));
    console.log(chalk.green(`✅ Successful: ${stats.successful || 0}`));
    console.log(chalk.yellow(`⏭️  Skipped: ${stats.skipped || 0}`));
    console.log(chalk.red(`❌ Failed: ${stats.failed || 0}`));
    console.log(chalk.cyan(`⏱️  Duration: ${durationText}`));
    
    if (stats.total > 0) {
      const successRate = ((stats.successful / stats.total) * 100).toFixed(1);
      console.log(chalk.cyan(`📈 Success Rate: ${successRate}%`));
    }
  }

  /**
   * Show real-time status update
   * @param {string} operation - Current operation
   * @param {number} current - Current progress
   * @param {number} total - Total items
   */
  showStatusUpdate(operation, current, total) {
    if (this.minimal && !this.verbose) {
      return;
    }

    const percentage = Math.round((current / total) * 100);
    const statusText = `${operation}: ${current}/${total} (${percentage}%)`;
    
    if (this.verbose) {
      console.log(chalk.gray(`   ${statusText}`));
    }
  }

  /**
   * Show file discovery progress
   * @param {number} current - Current files found
   * @param {number} total - Total files to scan
   */
  showFileDiscoveryProgress(current, total) {
    if (total === 0) {
      this.log('No files found to process', 'warning');
      return;
    }

    if (current === total) {
      this.log(`Found ${current} files to process`, 'success');
    } else if (this.verbose) {
      this.log(`Scanning files: ${current}/${total}`, 'info');
    }
  }

  /**
   * Show parsing progress
   * @param {number} current - Current files parsed
   * @param {number} total - Total files to parse
   * @param {string} language - Programming language
   */
  showParsingProgress(current, total, language) {
    const langEmoji = language === 'python' ? '🐍' : language === 'javascript' ? '📜' : '📘';
    const langName = language.charAt(0).toUpperCase() + language.slice(1);
    
    if (current === total) {
      this.log(`Parsed ${current} ${langName} files`, 'success');
    } else if (this.verbose) {
      this.log(`${langEmoji} Parsing ${langName}: ${current}/${total}`, 'info');
    }
  }

  /**
   * Show AI generation progress
   * @param {number} current - Current items generated
   * @param {number} total - Total items to generate
   * @param {string} itemType - Type of item (function/class)
   */
  showAIGenerationProgress(current, total, itemType) {
    if (current === total) {
      this.log(`Generated ${current} ${itemType}s`, 'success');
    } else if (this.verbose) {
      this.log(`🤖 Generating ${itemType}: ${current}/${total}`, 'info');
    }
  }

  /**
   * Show file modification progress
   * @param {number} current - Current files modified
   * @param {number} total - Total files to modify
   */
  showFileModificationProgress(current, total) {
    if (current === total) {
      this.log(`Modified ${current} files`, 'success');
    } else if (this.verbose) {
      this.log(`📝 Modifying files: ${current}/${total}`, 'info');
    }
  }

  /**
   * Show backup progress
   * @param {number} current - Current backups created
   * @param {number} total - Total files to backup
   */
  showBackupProgress(current, total) {
    if (current === total) {
      this.log(`Created ${current} backups`, 'success');
    } else if (this.verbose) {
      this.log(`💾 Creating backups: ${current}/${total}`, 'info');
    }
  }

  /**
   * Show watch mode status
   * @param {number} fileCount - Number of files being watched
   * @param {string} pattern - File pattern being watched
   */
  showWatchStatus(fileCount, pattern) {
    console.log(chalk.blue(`\n👁️  Watch Mode Active`));
    console.log(chalk.gray(`Watching ${fileCount} files for changes...`));
    console.log(chalk.gray(`Pattern: ${pattern}`));
    console.log(chalk.gray(`Press Ctrl+C to stop watching\n`));
  }

  /**
   * Show file change detected
   * @param {string} filePath - Changed file path
   * @param {string} event - Change event type
   */
  showFileChange(filePath, event) {
    const fileName = require('path').basename(filePath);
    const eventEmoji = event === 'add' ? '➕' : event === 'change' ? '📝' : '🗑️';
    
    console.log(chalk.yellow(`\n${eventEmoji} File ${event}: ${fileName}`));
    console.log(chalk.gray(`Processing in 2 seconds...`));
  }

  /**
   * Show processing started for file change
   * @param {string} filePath - File being processed
   */
  showFileProcessing(filePath) {
    const fileName = require('path').basename(filePath);
    console.log(chalk.blue(`\n🔄 Processing: ${fileName}`));
  }

  /**
   * Show processing completed for file change
   * @param {string} filePath - File that was processed
   * @param {Object} result - Processing result
   */
  showFileProcessed(filePath, result) {
    const fileName = require('path').basename(filePath);
    
    if (result.success) {
      const changes = result.modifications || 0;
      if (changes > 0) {
        console.log(chalk.green(`✅ Updated: ${fileName} (${changes} changes)`));
      } else {
        console.log(chalk.gray(`⏭️  No changes: ${fileName}`));
      }
    } else {
      console.log(chalk.red(`❌ Failed: ${fileName} - ${result.error}`));
    }
  }

  /**
   * Format duration in human-readable format
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get all logs
   * @returns {Array} Array of log entries
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Stop all active spinners and progress bars
   */
  stopAll() {
    // Stop all spinners
    this.spinners.forEach((spinner, id) => {
      spinner.stop();
    });
    this.spinners.clear();

    // Stop all progress bars
    this.progressBars.forEach((progressBar, id) => {
      progressBar.stop();
    });
    this.progressBars.clear();
  }

  /**
   * Show final summary
   * @param {Object} results - Final results
   */
  showFinalSummary(results) {
    console.log(chalk.blue('\n🎉 DocAI Processing Complete!'));
    console.log(chalk.gray('============================'));
    
    if (results.summary) {
      this.showStatistics(results.summary);
    }
    
    if (results.errors && results.errors.length > 0) {
      console.log(chalk.red(`\n🚨 ${results.errors.length} errors occurred during processing`));
    }
    
    const duration = Date.now() - this.startTime;
    console.log(chalk.gray(`\nTotal time: ${this.formatDuration(duration)}`));
  }
}

module.exports = ProgressManager;
