const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * Backup Manager
 * Handles file backup operations with safety and integrity checks
 */
class BackupManager {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.timestamped = options.timestamped || false;
    this.cleanup = options.cleanup || false;
    this.backups = new Map(); // Track created backups
  }

  /**
   * Create backup for a file
   * @param {string} filePath - Path to file to backup
   * @returns {Promise<Object>} Backup result
   */
  async createBackup(filePath) {
    try {
      // Validate file exists and is readable
      await fs.access(filePath, fs.constants.R_OK);
      
      // Check disk space
      await this.validateDiskSpace(filePath);
      
      // Generate backup path
      const backupPath = this.generateBackupPath(filePath);
      
      if (this.verbose) {
        console.log(chalk.gray(`Creating backup for ${path.basename(filePath)}`));
      }

      // Read original file
      const originalContent = await fs.readFile(filePath, 'utf-8');
      const originalStats = await fs.stat(filePath);

      // Write backup file atomically
      await this.writeFileAtomically(backupPath, originalContent, originalStats);

      // Track backup
      this.backups.set(filePath, {
        originalPath: filePath,
        backupPath: backupPath,
        createdAt: new Date(),
        size: originalStats.size
      });

      return {
        success: true,
        backupPath: backupPath,
        size: originalStats.size
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        filePath: filePath
      };
    }
  }

  /**
   * Create backups for multiple files
   * @param {Array} filePaths - Array of file paths
   * @returns {Promise<Object>} Backup results
   */
  async createBackups(filePaths) {
    const results = {
      successful: [],
      failed: [],
      totalSize: 0
    };

    for (const filePath of filePaths) {
      const result = await this.createBackup(filePath);
      
      if (result.success) {
        results.successful.push(result);
        results.totalSize += result.size;
      } else {
        results.failed.push(result);
      }
    }

    if (this.verbose) {
      this.logBackupResults(results);
    }

    return results;
  }

  /**
   * Restore file from backup
   * @param {string} filePath - Original file path
   * @returns {Promise<Object>} Restore result
   */
  async restoreFromBackup(filePath) {
    const backup = this.backups.get(filePath);
    
    if (!backup) {
      return {
        success: false,
        error: 'No backup found for file'
      };
    }

    try {
      // Read backup content
      const backupContent = await fs.readFile(backup.backupPath, 'utf-8');
      const backupStats = await fs.stat(backup.backupPath);

      // Restore original file atomically
      await this.writeFileAtomically(filePath, backupContent, backupStats);

      if (this.verbose) {
        console.log(chalk.green(`Restored ${path.basename(filePath)} from backup`));
      }

      return {
        success: true,
        restoredFrom: backup.backupPath
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up backup files
   * @param {string} filePath - Original file path (optional, if not provided cleans all)
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupBackups(filePath = null) {
    const results = {
      cleaned: [],
      failed: [],
      totalSize: 0
    };

    const filesToClean = filePath ? [filePath] : Array.from(this.backups.keys());

    for (const originalPath of filesToClean) {
      const backup = this.backups.get(originalPath);
      
      if (backup) {
        try {
          await fs.unlink(backup.backupPath);
          results.cleaned.push(backup.backupPath);
          results.totalSize += backup.size;
          this.backups.delete(originalPath);
        } catch (error) {
          results.failed.push({
            path: backup.backupPath,
            error: error.message
          });
        }
      }
    }

    if (this.verbose && results.cleaned.length > 0) {
      console.log(chalk.gray(`Cleaned up ${results.cleaned.length} backup files`));
    }

    return results;
  }

  /**
   * Generate backup file path
   * @param {string} filePath - Original file path
   * @returns {string} Backup file path
   */
  generateBackupPath(filePath) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext);

    if (this.timestamped) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      return path.join(dir, `${basename}_${timestamp}${ext}.bak`);
    } else {
      return path.join(dir, `${basename}${ext}.bak`);
    }
  }

  /**
   * Write file atomically
   * @param {string} filePath - File path to write
   * @param {string} content - File content
   * @param {Object} stats - Original file stats
   * @returns {Promise<void>}
   */
  async writeFileAtomically(filePath, content, stats) {
    const tempPath = filePath + '.tmp';
    
    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, content, 'utf-8');
      
      // Preserve original file permissions
      await fs.chmod(tempPath, stats.mode);
      
      // Atomic rename
      await fs.rename(tempPath, filePath);
      
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Validate disk space before creating backup
   * @param {string} filePath - File to backup
   * @returns {Promise<void>}
   */
  async validateDiskSpace(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const freeSpace = await this.getFreeDiskSpace(path.dirname(filePath));
      
      // Require at least 2x the file size as free space
      const requiredSpace = stats.size * 2;
      
      if (freeSpace < requiredSpace) {
        throw new Error(`Insufficient disk space. Required: ${this.formatBytes(requiredSpace)}, Available: ${this.formatBytes(freeSpace)}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Get free disk space for directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>} Free space in bytes
   */
  async getFreeDiskSpace(dirPath) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const command = process.platform === 'win32' 
        ? `wmic logicaldisk where caption="${dirPath.charAt(0)}:" get freespace /value`
        : `df -k "${dirPath}" | tail -1 | awk '{print $4}'`;
      
      const { stdout } = await execAsync(command);
      
      if (process.platform === 'win32') {
        const match = stdout.match(/FreeSpace=(\d+)/);
        return match ? parseInt(match[1]) : 0;
      } else {
        return parseInt(stdout.trim()) * 1024; // Convert KB to bytes
      }
    } catch (error) {
      // If we can't determine free space, assume it's available
      return Number.MAX_SAFE_INTEGER;
    }
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Log backup results
   * @param {Object} results - Backup results
   */
  logBackupResults(results) {
    console.log(chalk.blue('\n💾 Backup Results:'));
    console.log(chalk.gray('================='));
    console.log(chalk.green(`✅ Successful: ${results.successful.length}`));
    console.log(chalk.red(`❌ Failed: ${results.failed.length}`));
    console.log(chalk.gray(`📦 Total size: ${this.formatBytes(results.totalSize)}`));
    
    if (results.failed.length > 0) {
      console.log(chalk.red('\nFailed backups:'));
      results.failed.forEach(failure => {
        console.log(chalk.red(`  ${failure.filePath}: ${failure.error}`));
      });
    }
  }

  /**
   * Get backup information for a file
   * @param {string} filePath - Original file path
   * @returns {Object|null} Backup information or null
   */
  getBackupInfo(filePath) {
    return this.backups.get(filePath) || null;
  }

  /**
   * List all tracked backups
   * @returns {Array} Array of backup information
   */
  listBackups() {
    return Array.from(this.backups.values());
  }

  /**
   * Check if file has backup
   * @param {string} filePath - Original file path
   * @returns {boolean} True if backup exists
   */
  hasBackup(filePath) {
    return this.backups.has(filePath);
  }
}

module.exports = BackupManager;
