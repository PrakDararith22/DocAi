const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');

/**
 * Performance Optimizer
 * Handles performance optimization and monitoring
 */
class PerformanceOptimizer {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.concurrency = options.concurrency || 5;
    this.maxMemoryMB = options.maxMemoryMB || 200;
    this.performanceMetrics = {
      startTime: Date.now(),
      phases: {},
      memoryUsage: [],
      fileCounts: {},
      apiCalls: 0,
      errors: 0
    };
  }

  /**
   * Optimize file processing with parallel execution
   * @param {Array} files - Files to process
   * @param {Function} processor - Processing function
   * @returns {Promise<Array>} Processing results
   */
  async processFilesInParallel(files, processor) {
    const startTime = Date.now();
    this.performanceMetrics.phases.parallelProcessing = { startTime };

    console.log(chalk.blue(`\n⚡ Processing ${files.length} files (${this.concurrency} at a time)...`));
    
    const results = [];
    const batches = this.createBatches(files, this.concurrency);
    
    // Create progress bar
    const cliProgress = require('cli-progress');
    const progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} files | Batch {batch}/{totalBatches}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    progressBar.start(files.length, 0, {
      batch: 0,
      totalBatches: batches.length
    });
    
    let processedCount = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchStartTime = Date.now();

      // Process batch in parallel
      const batchPromises = batch.map(async (file, index) => {
        try {
          const result = await processor(file);
          this.trackMemoryUsage();
          return { success: true, result, file, batchIndex: i, fileIndex: index };
        } catch (error) {
          this.performanceMetrics.errors++;
          return { success: false, error: error.message, file, batchIndex: i, fileIndex: index };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Update progress
      processedCount += batch.length;
      progressBar.update(processedCount, {
        batch: i + 1,
        totalBatches: batches.length
      });

      const batchDuration = Date.now() - batchStartTime;
      if (this.verbose) {
        console.log(chalk.gray(`\n  Batch ${i + 1} completed in ${batchDuration}ms`));
      }

      // Memory check between batches
      await this.checkMemoryUsage();
    }
    
    progressBar.stop();

    this.performanceMetrics.phases.parallelProcessing.endTime = Date.now();
    this.performanceMetrics.phases.parallelProcessing.duration = 
      this.performanceMetrics.phases.parallelProcessing.endTime - this.performanceMetrics.phases.parallelProcessing.startTime;

    const totalDuration = Date.now() - startTime;
    console.log(chalk.green(`✅ Completed in ${(totalDuration / 1000).toFixed(1)}s`));
    
    return results;
  }

  /**
   * Create batches for parallel processing
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Batch size
   * @returns {Array} Array of batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Optimize API calls with batching
   * @param {Array} items - Items to process with API
   * @param {Function} apiCall - API call function
   * @param {number} batchSize - Batch size for API calls
   * @returns {Promise<Array>} API results
   */
  async batchAPICalls(items, apiCall, batchSize = 10) {
    const startTime = Date.now();
    this.performanceMetrics.phases.apiBatching = { startTime };

    if (this.verbose) {
      console.log(chalk.blue(`\n🤖 Batching API calls: ${items.length} items in batches of ${batchSize}`));
    }
    
    const results = [];
    const batches = this.createBatches(items, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      if (this.verbose) {
        console.log(chalk.gray(`API batch ${i + 1}/${batches.length} (${batch.length} items)`));
      }

      try {
        // Process batch with rate limiting
        await this.enforceRateLimit();
        
        const batchResults = await Promise.all(
          batch.map(item => apiCall(item))
        );
        
        results.push(...batchResults);
        this.performanceMetrics.apiCalls += batch.length;
        
        // Small delay between batches to respect rate limits
        if (i < batches.length - 1) {
          await this.sleep(100);
        }
        
      } catch (error) {
        console.log(chalk.red(`API batch ${i + 1} failed: ${error.message}`));
        this.performanceMetrics.errors++;
        
        // Add failed items to results
        batch.forEach(item => {
          results.push({ success: false, error: error.message, item });
        });
      }
    }

    this.performanceMetrics.phases.apiBatching.endTime = Date.now();
    this.performanceMetrics.phases.apiBatching.duration = 
      this.performanceMetrics.phases.apiBatching.endTime - this.performanceMetrics.phases.apiBatching.startTime;

    const totalDuration = Date.now() - startTime;
    if (this.verbose) {
      console.log(chalk.green(`✅ API batching completed in ${totalDuration}ms`));
    }
    
    return results;
  }

  /**
   * Optimize memory usage
   * @param {Function} processor - Processing function
   * @param {Array} items - Items to process
   * @returns {Promise<Array>} Processing results
   */
  async processWithMemoryOptimization(processor, items) {
    const startTime = Date.now();
    this.performanceMetrics.phases.memoryOptimization = { startTime };

    console.log(chalk.blue(`\n🧠 Memory optimization: Processing ${items.length} items`));
    
    const results = [];
    const streamSize = Math.min(50, Math.floor(items.length / 4)); // Process in smaller streams
    
    for (let i = 0; i < items.length; i += streamSize) {
      const stream = items.slice(i, i + streamSize);
      
      if (this.verbose) {
        console.log(chalk.gray(`Memory stream ${Math.floor(i / streamSize) + 1}: ${stream.length} items`));
      }

      // Process stream
      const streamResults = await Promise.all(
        stream.map(async (item) => {
          try {
            const result = await processor(item);
            this.trackMemoryUsage();
            return { success: true, result, item };
          } catch (error) {
            this.performanceMetrics.errors++;
            return { success: false, error: error.message, item };
          }
        })
      );
      
      results.push(...streamResults);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Check memory usage
      await this.checkMemoryUsage();
    }

    this.performanceMetrics.phases.memoryOptimization.endTime = Date.now();
    this.performanceMetrics.phases.memoryOptimization.duration = 
      this.performanceMetrics.phases.memoryOptimization.endTime - this.performanceMetrics.phases.memoryOptimization.startTime;

    const totalDuration = Date.now() - startTime;
    console.log(chalk.green(`✅ Memory optimization completed in ${totalDuration}ms`));
    
    return results;
  }

  /**
   * Cache parsed results to avoid re-parsing
   * @param {string} filePath - File path
   * @param {Object} parseResult - Parse result
   */
  cacheParseResult(filePath, parseResult) {
    if (!this.performanceMetrics.parseCache) {
      this.performanceMetrics.parseCache = new Map();
    }
    
    this.performanceMetrics.parseCache.set(filePath, {
      result: parseResult,
      timestamp: Date.now(),
      fileSize: parseResult.fileSize || 0
    });
  }

  /**
   * Get cached parse result
   * @param {string} filePath - File path
   * @param {number} fileSize - Current file size
   * @returns {Object|null} Cached result or null
   */
  getCachedParseResult(filePath, fileSize) {
    if (!this.performanceMetrics.parseCache) {
      return null;
    }
    
    const cached = this.performanceMetrics.parseCache.get(filePath);
    if (cached && cached.fileSize === fileSize) {
      return cached.result;
    }
    
    return null;
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage() {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      timestamp: Date.now()
    };
    
    this.performanceMetrics.memoryUsage.push(memUsageMB);
    
    // Keep only last 100 measurements
    if (this.performanceMetrics.memoryUsage.length > 100) {
      this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-100);
    }
  }

  /**
   * Check memory usage and warn if high
   * @returns {Promise<void>}
   */
  async checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > this.maxMemoryMB) {
      console.log(chalk.yellow(`⚠️  High memory usage: ${heapUsedMB}MB (limit: ${this.maxMemoryMB}MB)`));
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        const newMemUsage = process.memoryUsage();
        const newHeapUsedMB = Math.round(newMemUsage.heapUsed / 1024 / 1024);
        console.log(chalk.gray(`   After GC: ${newHeapUsedMB}MB`));
      }
    }
  }

  /**
   * Enforce rate limiting for API calls
   * @param {number} delay - Delay in milliseconds
   * @returns {Promise<void>}
   */
  async enforceRateLimit(delay = 200) {
    const now = Date.now();
    const lastCall = this.performanceMetrics.lastAPICall || 0;
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall < delay) {
      await this.sleep(delay - timeSinceLastCall);
    }
    
    this.performanceMetrics.lastAPICall = Date.now();
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const totalDuration = Date.now() - this.performanceMetrics.startTime;
    const memUsage = process.memoryUsage();
    
    return {
      ...this.performanceMetrics,
      totalDuration,
      currentMemoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      peakMemoryMB: Math.max(...this.performanceMetrics.memoryUsage.map(m => m.heapUsed)),
      averageMemoryMB: this.calculateAverageMemory(),
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024),
        freeMemory: Math.round(os.freemem() / 1024 / 1024)
      }
    };
  }

  /**
   * Calculate average memory usage
   * @returns {number} Average memory in MB
   */
  calculateAverageMemory() {
    if (this.performanceMetrics.memoryUsage.length === 0) {
      return 0;
    }
    
    const total = this.performanceMetrics.memoryUsage.reduce((sum, mem) => sum + mem.heapUsed, 0);
    return Math.round(total / this.performanceMetrics.memoryUsage.length);
  }

  /**
   * Show performance summary
   */
  showPerformanceSummary() {
    const metrics = this.getPerformanceMetrics();
    
    console.log(chalk.blue('\n📊 Performance Summary'));
    console.log(chalk.gray('====================='));
    console.log(chalk.cyan(`⏱️  Total Duration: ${this.formatDuration(metrics.totalDuration)}`));
    console.log(chalk.cyan(`🧠 Peak Memory: ${metrics.peakMemoryMB}MB`));
    console.log(chalk.cyan(`📈 Average Memory: ${metrics.averageMemoryMB}MB`));
    console.log(chalk.cyan(`🤖 API Calls: ${metrics.apiCalls}`));
    console.log(chalk.cyan(`❌ Errors: ${metrics.errors}`));
    
    if (metrics.phases.parallelProcessing) {
      console.log(chalk.gray(`\nParallel Processing: ${this.formatDuration(metrics.phases.parallelProcessing.duration)}`));
    }
    
    if (metrics.phases.apiBatching) {
      console.log(chalk.gray(`API Batching: ${this.formatDuration(metrics.phases.apiBatching.duration)}`));
    }
    
    if (metrics.phases.memoryOptimization) {
      console.log(chalk.gray(`Memory Optimization: ${this.formatDuration(metrics.phases.memoryOptimization.duration)}`));
    }
    
    // Performance recommendations
    this.showPerformanceRecommendations(metrics);
  }

  /**
   * Show performance recommendations
   * @param {Object} metrics - Performance metrics
   */
  showPerformanceRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.peakMemoryMB > this.maxMemoryMB) {
      recommendations.push('Consider reducing concurrency or processing smaller batches');
    }
    
    if (metrics.averageMemoryMB > this.maxMemoryMB * 0.8) {
      recommendations.push('Memory usage is high - consider enabling garbage collection');
    }
    
    if (metrics.errors > 0) {
      recommendations.push(`${metrics.errors} errors occurred - check error logs`);
    }
    
    if (metrics.apiCalls > 100) {
      recommendations.push('High API usage - consider implementing more aggressive caching');
    }
    
    if (recommendations.length > 0) {
      console.log(chalk.yellow('\n💡 Performance Recommendations:'));
      recommendations.forEach(rec => {
        console.log(chalk.yellow(`  • ${rec}`));
      });
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
    } else if (seconds > 0) {
      return `${seconds}s`;
    } else {
      return `${milliseconds}ms`;
    }
  }

  /**
   * Benchmark performance with different file counts
   * @param {Array} testFiles - Test files
   * @param {Function} processor - Processing function
   * @returns {Promise<Object>} Benchmark results
   */
  async benchmarkPerformance(testFiles, processor) {
    console.log(chalk.blue('\n🏁 Performance Benchmark'));
    console.log(chalk.gray('======================'));
    
    const benchmarks = [];
    const testSizes = [10, 50, 100, 250, 500].filter(size => size <= testFiles.length);
    
    for (const size of testSizes) {
      console.log(chalk.gray(`\nTesting with ${size} files...`));
      
      const testSet = testFiles.slice(0, size);
      const startTime = Date.now();
      
      // Reset metrics for this test
      this.performanceMetrics = {
        startTime,
        phases: {},
        memoryUsage: [],
        fileCounts: {},
        apiCalls: 0,
        errors: 0
      };
      
      try {
        await this.processFilesInParallel(testSet, processor);
        
        const duration = Date.now() - startTime;
        const memUsage = process.memoryUsage();
        const peakMemoryMB = Math.max(...this.performanceMetrics.memoryUsage.map(m => m.heapUsed));
        
        benchmarks.push({
          fileCount: size,
          duration,
          peakMemoryMB,
          averageMemoryMB: this.calculateAverageMemory(),
          apiCalls: this.performanceMetrics.apiCalls,
          errors: this.performanceMetrics.errors,
          filesPerSecond: Math.round(size / (duration / 1000))
        });
        
        console.log(chalk.green(`  ✅ ${size} files: ${this.formatDuration(duration)} (${Math.round(size / (duration / 1000))} files/sec)`));
        
      } catch (error) {
        console.log(chalk.red(`  ❌ ${size} files failed: ${error.message}`));
        benchmarks.push({
          fileCount: size,
          duration: -1,
          error: error.message
        });
      }
    }
    
    return {
      benchmarks,
      summary: this.generateBenchmarkSummary(benchmarks)
    };
  }

  /**
   * Generate benchmark summary
   * @param {Array} benchmarks - Benchmark results
   * @returns {Object} Summary
   */
  generateBenchmarkSummary(benchmarks) {
    const successful = benchmarks.filter(b => b.duration > 0);
    
    if (successful.length === 0) {
      return { status: 'failed', message: 'No successful benchmarks' };
    }
    
    const maxFiles = Math.max(...successful.map(b => b.fileCount));
    const maxDuration = Math.max(...successful.map(b => b.duration));
    const maxMemory = Math.max(...successful.map(b => b.peakMemoryMB));
    
    return {
      status: 'completed',
      maxFiles,
      maxDuration: this.formatDuration(maxDuration),
      maxMemory: `${maxMemory}MB`,
      averageFilesPerSecond: Math.round(
        successful.reduce((sum, b) => sum + b.filesPerSecond, 0) / successful.length
      )
    };
  }

  /**
   * Clear performance cache
   */
  clearCache() {
    if (this.performanceMetrics.parseCache) {
      this.performanceMetrics.parseCache.clear();
    }
    
    this.performanceMetrics.memoryUsage = [];
    this.performanceMetrics.apiCalls = 0;
    this.performanceMetrics.errors = 0;
  }
}

module.exports = PerformanceOptimizer;
