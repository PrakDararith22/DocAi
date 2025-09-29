const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * Error Manager
 * Handles error recovery, reporting, and logging throughout the pipeline
 */
class ErrorManager {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.strict = options.strict || false;
    this.logErrors = options.logErrors || false;
    this.errors = [];
    this.stats = {
      processed: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Handle error during processing
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   * @param {Object} metadata - Additional error metadata
   * @returns {Object} Error handling result
   */
  handleError(error, context, metadata = {}) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      context: context,
      type: this.categorizeError(error),
      message: error.message,
      stack: error.stack,
      metadata: metadata,
      severity: this.getErrorSeverity(error)
    };

    this.errors.push(errorInfo);
    this.stats.errors.push(errorInfo);
    this.stats.failed++;

    // Log error based on severity
    this.logError(errorInfo);

    // In strict mode, throw error to stop processing
    if (this.strict && errorInfo.severity === 'critical') {
      throw error;
    }

    return {
      handled: true,
      errorId: errorInfo.id,
      shouldContinue: !this.strict || errorInfo.severity !== 'critical'
    };
  }

  /**
   * Handle file processing error
   * @param {string} filePath - File path where error occurred
   * @param {Error} error - Error object
   * @param {string} operation - Operation being performed
   * @returns {Object} Error handling result
   */
  handleFileError(filePath, error, operation) {
    return this.handleError(error, `File: ${filePath}`, {
      filePath: filePath,
      operation: operation,
      fileName: path.basename(filePath)
    });
  }

  /**
   * Handle API error
   * @param {Error} error - Error object
   * @param {string} endpoint - API endpoint
   * @param {Object} requestData - Request data
   * @returns {Object} Error handling result
   */
  handleAPIError(error, endpoint, requestData = {}) {
    return this.handleError(error, `API: ${endpoint}`, {
      endpoint: endpoint,
      requestData: requestData
    });
  }

  /**
   * Handle parsing error
   * @param {string} filePath - File path
   * @param {Error} error - Error object
   * @param {string} language - Programming language
   * @returns {Object} Error handling result
   */
  handleParsingError(filePath, error, language) {
    return this.handleError(error, `Parsing: ${filePath}`, {
      filePath: filePath,
      language: language,
      fileName: path.basename(filePath)
    });
  }

  /**
   * Categorize error type
   * @param {Error} error - Error object
   * @returns {string} Error category
   */
  categorizeError(error) {
    if (error.code === 'ENOENT') return 'file_not_found';
    if (error.code === 'EACCES') return 'permission_denied';
    if (error.code === 'ENOSPC') return 'no_space_left';
    if (error.code === 'EMFILE' || error.code === 'ENFILE') return 'too_many_files';
    if (error.message.includes('syntax')) return 'syntax_error';
    if (error.message.includes('API') || error.message.includes('HTTP')) return 'api_error';
    if (error.message.includes('timeout')) return 'timeout';
    if (error.message.includes('network')) return 'network_error';
    if (error.message.includes('permission')) return 'permission_error';
    if (error.message.includes('backup')) return 'backup_error';
    if (error.message.includes('modification')) return 'modification_error';
    
    return 'unknown';
  }

  /**
   * Get error severity
   * @param {Error} error - Error object
   * @returns {string} Error severity
   */
  getErrorSeverity(error) {
    const criticalTypes = ['permission_denied', 'no_space_left', 'backup_error'];
    const warningTypes = ['syntax_error', 'api_error', 'timeout'];
    
    const errorType = this.categorizeError(error);
    
    if (criticalTypes.includes(errorType)) return 'critical';
    if (warningTypes.includes(errorType)) return 'warning';
    
    return 'error';
  }

  /**
   * Log error to console
   * @param {Object} errorInfo - Error information
   */
  logError(errorInfo) {
    const severity = errorInfo.severity;
    const context = errorInfo.context;
    const message = errorInfo.message;
    
    let logMessage = '';
    let logColor = chalk.gray;
    
    switch (severity) {
      case 'critical':
        logColor = chalk.red;
        logMessage = `❌ CRITICAL: ${context} - ${message}`;
        break;
      case 'error':
        logColor = chalk.red;
        logMessage = `❌ ERROR: ${context} - ${message}`;
        break;
      case 'warning':
        logColor = chalk.yellow;
        logMessage = `⚠️  WARNING: ${context} - ${message}`;
        break;
      default:
        logMessage = `ℹ️  INFO: ${context} - ${message}`;
    }
    
    if (this.verbose || severity === 'critical' || severity === 'error') {
      console.log(logColor(logMessage));
      
      if (this.verbose && errorInfo.stack) {
        console.log(chalk.gray(`   Stack: ${errorInfo.stack.split('\n')[1]?.trim()}`));
      }
    }
  }

  /**
   * Update processing statistics
   * @param {string} status - Processing status
   * @param {Object} metadata - Additional metadata
   */
  updateStats(status, metadata = {}) {
    this.stats.processed++;
    
    switch (status) {
      case 'success':
        this.stats.successful++;
        break;
      case 'skipped':
        this.stats.skipped++;
        break;
      case 'failed':
        this.stats.failed++;
        break;
    }
  }

  /**
   * Generate error report
   * @returns {Object} Error report
   */
  generateErrorReport() {
    const report = {
      summary: {
        totalProcessed: this.stats.processed,
        successful: this.stats.successful,
        skipped: this.stats.skipped,
        failed: this.stats.failed,
        errorRate: this.stats.processed > 0 ? (this.stats.failed / this.stats.processed * 100).toFixed(2) : 0
      },
      errors: this.errors,
      categories: this.getErrorCategories(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Get error categories summary
   * @returns {Object} Error categories
   */
  getErrorCategories() {
    const categories = {};
    
    this.errors.forEach(error => {
      const type = error.type;
      if (!categories[type]) {
        categories[type] = {
          count: 0,
          severity: error.severity,
          examples: []
        };
      }
      categories[type].count++;
      if (categories[type].examples.length < 3) {
        categories[type].examples.push({
          message: error.message,
          context: error.context
        });
      }
    });
    
    return categories;
  }

  /**
   * Generate recommendations based on errors
   * @returns {Array} Array of recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const categories = this.getErrorCategories();
    
    if (categories.syntax_error) {
      recommendations.push({
        type: 'syntax_error',
        message: 'Fix syntax errors in source files before running DocAI',
        action: 'Review and fix syntax errors in the reported files'
      });
    }
    
    if (categories.permission_denied) {
      recommendations.push({
        type: 'permission_denied',
        message: 'Check file permissions and ensure DocAI has write access',
        action: 'Run with appropriate permissions or fix file ownership'
      });
    }
    
    if (categories.api_error) {
      recommendations.push({
        type: 'api_error',
        message: 'Check Hugging Face API token and network connectivity',
        action: 'Verify HF_TOKEN and ensure stable internet connection'
      });
    }
    
    if (categories.no_space_left) {
      recommendations.push({
        type: 'no_space_left',
        message: 'Insufficient disk space for backup operations',
        action: 'Free up disk space or disable backup mode'
      });
    }
    
    return recommendations;
  }

  /**
   * Save error log to file
   * @param {string} logPath - Path to save log file
   * @returns {Promise<Object>} Save result
   */
  async saveErrorLog(logPath) {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        version: require('../package.json').version,
        report: this.generateErrorReport()
      };
      
      await fs.writeFile(logPath, JSON.stringify(logData, null, 2), 'utf-8');
      
      return {
        success: true,
        logPath: logPath,
        errorCount: this.errors.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Print final summary
   */
  printSummary() {
    console.log(chalk.blue('\n📊 Processing Summary:'));
    console.log(chalk.gray('====================='));
    console.log(chalk.green(`✅ Successful: ${this.stats.successful}`));
    console.log(chalk.yellow(`⏭️  Skipped: ${this.stats.skipped}`));
    console.log(chalk.red(`❌ Failed: ${this.stats.failed}`));
    
    if (this.stats.processed > 0) {
      const successRate = ((this.stats.successful / this.stats.processed) * 100).toFixed(1);
      console.log(chalk.cyan(`📈 Success Rate: ${successRate}%`));
    }
    
    if (this.errors.length > 0) {
      console.log(chalk.red(`\n🚨 Total Errors: ${this.errors.length}`));
      
      const criticalErrors = this.errors.filter(e => e.severity === 'critical').length;
      if (criticalErrors > 0) {
        console.log(chalk.red(`   Critical: ${criticalErrors}`));
      }
    }
  }

  /**
   * Generate unique error ID
   * @returns {string} Error ID
   */
  generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear all errors and reset statistics
   */
  reset() {
    this.errors = [];
    this.stats = {
      processed: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Get current error count
   * @returns {number} Error count
   */
  getErrorCount() {
    return this.errors.length;
  }

  /**
   * Check if processing should continue
   * @returns {boolean} True if processing should continue
   */
  shouldContinue() {
    if (this.strict) {
      return this.errors.filter(e => e.severity === 'critical').length === 0;
    }
    return true;
  }

  /**
   * Get exit code based on errors
   * @returns {number} Exit code
   */
  getExitCode() {
    if (this.errors.filter(e => e.severity === 'critical').length > 0) {
      return 1; // Critical errors
    }
    if (this.stats.failed > 0) {
      return 2; // Some failures
    }
    return 0; // Success
  }
}

module.exports = ErrorManager;
