const chokidar = require('chokidar').default || require('chokidar');
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * Watch Mode
 * Handles continuous file monitoring and auto-documentation
 */
class WatchMode {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.debounceDelay = options.debounceDelay || 2000; // 2 seconds
    this.watcher = null;
    this.debounceTimers = new Map();
    this.isProcessing = false;
    this.processedFiles = new Set();
    this.excludePatterns = [
      '**/*.bak',
      '**/*.tmp',
      '**/node_modules/**',
      '**/__pycache__/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**'
    ];
  }

  /**
   * Start watching files for changes
   * @param {Array} files - Files to watch
   * @param {Object} options - Watch options
   * @param {Function} generateDocFn - Documentation generation function
   * @returns {Promise<void>}
   */
  async startWatching(files, options = {}, generateDocFn = null) {
    this.generateDocFn = generateDocFn;
    if (files.length === 0) {
      console.log(chalk.yellow('No files to watch.'));
      return;
    }

    // Convert file objects to paths
    const filePaths = files.map(file => file.path);
    
    console.log(chalk.blue('\n👁️  Starting Watch Mode'));
    console.log(chalk.gray('===================='));
    console.log(chalk.gray(`Watching ${filePaths.length} files for changes...`));
    
    if (this.verbose) {
      console.log(chalk.gray('\nFiles being watched:'));
      filePaths.forEach(filePath => {
        console.log(chalk.gray(`  ${filePath}`));
      });
    }

    // Create watcher
    this.watcher = chokidar.watch(filePaths, {
      ignored: this.excludePatterns,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    });

    // Set up event handlers
    this.setupEventHandlers(options);

    // Handle graceful shutdown
    this.setupGracefulShutdown();

    console.log(chalk.green('\n✅ Watch mode active! Press Ctrl+C to stop.'));
  }

  /**
   * Set up event handlers for file changes
   * @param {Object} options - Processing options
   */
  setupEventHandlers(options) {
    this.watcher
      .on('add', (filePath) => this.handleFileChange(filePath, 'add', options))
      .on('change', (filePath) => this.handleFileChange(filePath, 'change', options))
      .on('unlink', (filePath) => this.handleFileChange(filePath, 'unlink', options))
      .on('error', (error) => this.handleError(error))
      .on('ready', () => {
        console.log(chalk.green('Watch mode initialized successfully!'));
      });
  }

  /**
   * Handle file change event
   * @param {string} filePath - Changed file path
   * @param {string} event - Event type
   * @param {Object} options - Processing options
   */
  handleFileChange(filePath, event, options) {
    // Skip if we're currently processing
    if (this.isProcessing) {
      if (this.verbose) {
        console.log(chalk.gray(`Skipping ${event} of ${path.basename(filePath)} - already processing`));
      }
      return;
    }

    // Skip if file was just processed by DocAI
    if (this.processedFiles.has(filePath)) {
      this.processedFiles.delete(filePath);
      if (this.verbose) {
        console.log(chalk.gray(`Skipping ${event} of ${path.basename(filePath)} - file was just processed`));
      }
      return;
    }

    // Skip non-supported file types
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    // Show file change notification
    this.showFileChangeNotification(filePath, event);

    // Debounce the processing
    this.debounceProcessing(filePath, event, options);
  }

  /**
   * Debounce file processing to avoid excessive regeneration
   * @param {string} filePath - File path
   * @param {string} event - Event type
   * @param {Object} options - Processing options
   */
  debounceProcessing(filePath, event, options) {
    // Clear existing timer for this file
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processFile(filePath, event, options);
      this.debounceTimers.delete(filePath);
    }, this.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process a single file
   * @param {string} filePath - File path to process
   * @param {string} event - Event type
   * @param {Object} options - Processing options
   */
  async processFile(filePath, event, options) {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      console.log(chalk.blue(`\n🔄 Processing: ${path.basename(filePath)}`));
      
      // Create processing options for this file
      const fileOptions = {
        ...options,
        file: filePath,
        project: path.dirname(filePath),
        verbose: this.verbose,
        watch: false // Prevent recursive watch mode
      };

      // Process the file
      const startTime = Date.now();
      if (this.generateDocFn) {
        await this.generateDocFn(fileOptions);
      }
      const duration = Date.now() - startTime;

      // Mark file as processed by DocAI
      this.processedFiles.add(filePath);
      
      // Remove from processed files after a delay
      setTimeout(() => {
        this.processedFiles.delete(filePath);
      }, 5000);

      console.log(chalk.green(`✅ Processed: ${path.basename(filePath)} (${duration}ms)`));

    } catch (error) {
      console.log(chalk.red(`❌ Error processing ${path.basename(filePath)}: ${error.message}`));
      
      if (this.verbose) {
        console.log(chalk.gray(`Stack trace: ${error.stack}`));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if file is supported for processing
   * @param {string} filePath - File path to check
   * @returns {boolean} True if supported
   */
  isSupportedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ['.py', '.js', '.ts'].includes(ext);
  }

  /**
   * Show file change notification
   * @param {string} filePath - Changed file path
   * @param {string} event - Event type
   */
  showFileChangeNotification(filePath, event) {
    const fileName = path.basename(filePath);
    const eventEmoji = event === 'add' ? '➕' : event === 'change' ? '📝' : '🗑️';
    const eventText = event === 'add' ? 'added' : event === 'change' ? 'changed' : 'deleted';
    
    console.log(chalk.yellow(`\n${eventEmoji} File ${eventText}: ${fileName}`));
    
    if (event === 'unlink') {
      console.log(chalk.gray('File deleted - no processing needed'));
      return;
    }
    
    console.log(chalk.gray(`Processing in ${this.debounceDelay / 1000} seconds...`));
  }

  /**
   * Handle watch errors
   * @param {Error} error - Error object
   */
  handleError(error) {
    console.log(chalk.red(`\n❌ Watch mode error: ${error.message}`));
    
    if (this.verbose) {
      console.log(chalk.gray(`Stack trace: ${error.stack}`));
    }
  }

  /**
   * Set up graceful shutdown handling
   */
  setupGracefulShutdown() {
    const shutdown = () => {
      console.log(chalk.yellow('\n\n🛑 Shutting down watch mode...'));
      
      // Clear all debounce timers
      this.debounceTimers.forEach(timer => clearTimeout(timer));
      this.debounceTimers.clear();
      
      // Close watcher
      if (this.watcher) {
        this.watcher.close();
      }
      
      console.log(chalk.green('✅ Watch mode stopped.'));
      process.exit(0);
    };

    // Handle Ctrl+C
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * Stop watching files
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    console.log(chalk.green('Watch mode stopped.'));
  }

  /**
   * Get watch statistics
   * @returns {Object} Watch statistics
   */
  getStats() {
    return {
      isWatching: this.watcher !== null,
      isProcessing: this.isProcessing,
      pendingFiles: this.debounceTimers.size,
      processedFiles: this.processedFiles.size,
      debounceDelay: this.debounceDelay
    };
  }

  /**
   * Update exclude patterns
   * @param {Array} patterns - New exclude patterns
   */
  updateExcludePatterns(patterns) {
    this.excludePatterns = [...this.excludePatterns, ...patterns];
    
    if (this.watcher) {
      // Restart watcher with new patterns
      this.stopWatching();
      // Note: Would need to restart with new patterns
      // This would require the original file list
    }
  }

  /**
   * Add file to watch list
   * @param {string} filePath - File path to add
   */
  addFile(filePath) {
    if (this.watcher && this.isSupportedFile(filePath)) {
      this.watcher.add(filePath);
      
      if (this.verbose) {
        console.log(chalk.gray(`Added to watch: ${path.basename(filePath)}`));
      }
    }
  }

  /**
   * Remove file from watch list
   * @param {string} filePath - File path to remove
   */
  removeFile(filePath) {
    if (this.watcher) {
      this.watcher.unwatch(filePath);
      
      if (this.verbose) {
        console.log(chalk.gray(`Removed from watch: ${path.basename(filePath)}`));
      }
    }
  }
}

module.exports = WatchMode;
