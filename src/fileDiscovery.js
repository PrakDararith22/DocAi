const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');

/**
 * File Discovery Engine
 * Scans project directory for Python, JavaScript, and TypeScript files
 */
class FileDiscovery {
  constructor(options = {}) {
    this.projectPath = options.project || process.cwd();
    this.languageFilter = options.lang || 'all';
    this.filePattern = options.file || null;
    this.verbose = options.verbose || false;
    
    // File extensions by language
    this.extensions = {
      py: ['.py'],
      js: ['.js'],
      ts: ['.ts'],
      all: ['.py', '.js', '.ts']
    };
    
    // Directories to exclude
    this.excludePatterns = [
      'node_modules/**',
      '__pycache__/**',
      '.git/**',
      'dist/**',
      'build/**',
      '*.log',
      '*.bak'
    ];
  }

  /**
   * Discover files based on configuration
   * @returns {Promise<Array>} Array of file objects with metadata
   */
  async discoverFiles() {
    try {
      const spinner = ora('🔍 Discovering files...').start();
      
      let files = [];
      
      if (this.filePattern) {
        // Use specific file pattern
        files = await this.discoverByPattern();
      } else {
        // Scan entire project
        files = await this.discoverByLanguage();
      }
      
      // Filter by language if specified
      if (this.languageFilter !== 'all') {
        files = files.filter(file => 
          this.extensions[this.languageFilter].includes(path.extname(file.path))
        );
      }
      
      // Exclude unwanted files
      files = this.filterExcludedFiles(files);
      
      spinner.succeed(`Found ${files.length} files to process`);
      
      if (this.verbose) {
        console.log(chalk.gray('\nFiles discovered:'));
        files.forEach(file => {
          console.log(chalk.gray(`  ${file.path} (${file.language})`));
        });
      }
      
      return files;
      
    } catch (error) {
      console.error(chalk.red('Error discovering files:'), error.message);
      throw error;
    }
  }

  /**
   * Discover files using glob pattern
   */
  async discoverByPattern() {
    try {
      const files = await glob(this.filePattern, { 
        cwd: this.projectPath,
        absolute: true,
        ignore: this.excludePatterns
      });
      
      const fileObjects = files.map(filePath => ({
        path: filePath,
        language: this.getLanguageFromExtension(filePath),
        size: 0, // Will be filled later
        exists: true
      }));
      
      return fileObjects;
    } catch (error) {
      throw new Error(`Glob pattern error: ${error.message}`);
    }
  }

  /**
   * Discover files by scanning directory recursively
   */
  async discoverByLanguage() {
    const files = [];
    const extensions = this.extensions[this.languageFilter];
    
    await this.scanDirectory(this.projectPath, files, extensions);
    
    return files;
  }

  /**
   * Recursively scan directory for files
   */
  async scanDirectory(dirPath, files, extensions) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip excluded directories
          if (!this.shouldExcludeDirectory(entry.name)) {
            await this.scanDirectory(fullPath, files, extensions);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            const stats = await fs.stat(fullPath);
            files.push({
              path: fullPath,
              language: this.getLanguageFromExtension(fullPath),
              size: stats.size,
              exists: true
            });
          }
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(chalk.yellow(`Warning: Could not read directory ${dirPath}: ${error.message}`));
      }
    }
  }

  /**
   * Get language from file extension
   */
  getLanguageFromExtension(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.py': return 'py';
      case '.js': return 'js';
      case '.ts': return 'ts';
      default: return 'unknown';
    }
  }

  /**
   * Check if directory should be excluded
   */
  shouldExcludeDirectory(dirName) {
    const excludeDirs = ['node_modules', '__pycache__', '.git', 'dist', 'build'];
    return excludeDirs.includes(dirName) || dirName.startsWith('.');
  }

  /**
   * Filter out excluded files
   */
  filterExcludedFiles(files) {
    return files.filter(file => {
      const relativePath = path.relative(this.projectPath, file.path);
      
      // Check against exclude patterns
      for (const pattern of this.excludePatterns) {
        if (this.matchesPattern(relativePath, pattern)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Simple pattern matching (supports * wildcards)
   */
  matchesPattern(filePath, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(filePath);
  }

  /**
   * Validate that files exist and are readable
   */
  async validateFiles(files) {
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        await fs.access(file.path, fs.constants.R_OK);
        validFiles.push(file);
      } catch (error) {
        errors.push({
          file: file.path,
          error: `Permission denied or file not found: ${error.message}`
        });
      }
    }

    if (errors.length > 0 && this.verbose) {
      console.log(chalk.yellow('\nFiles with access issues:'));
      errors.forEach(err => {
        console.log(chalk.yellow(`  ${err.file}: ${err.error}`));
      });
    }

    return { validFiles, errors };
  }
}

module.exports = FileDiscovery;
