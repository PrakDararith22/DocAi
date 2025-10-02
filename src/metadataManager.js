const fs = require('fs').promises;
const path = require('path');

/**
 * Metadata Manager - DocAI's own tracking system
 * Separate from user's git
 */
class MetadataManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.metadataDir = path.join(projectPath, '.docai');
    this.metadataFile = path.join(this.metadataDir, 'metadata.json');
  }

  /**
   * Ensure .docai directory exists
   */
  async ensureMetadataDir() {
    try {
      await fs.access(this.metadataDir);
    } catch {
      await fs.mkdir(this.metadataDir, { recursive: true });
    }
  }

  /**
   * Load metadata
   */
  async loadMetadata() {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {
        version: '1.0.0',
        generated: {},
        lastUpdate: null
      };
    }
  }

  /**
   * Save metadata
   */
  async saveMetadata(metadata) {
    await this.ensureMetadataDir();
    await fs.writeFile(
      this.metadataFile,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
  }

  /**
   * Record when documentation was generated
   */
  async recordGeneration(filePath, functionName, gitCommit) {
    const metadata = await this.loadMetadata();
    
    const key = `${filePath}::${functionName}`;
    metadata.generated[key] = {
      timestamp: Date.now(),
      gitCommit: gitCommit,
      lastGenerated: new Date().toISOString()
    };
    
    metadata.lastUpdate = new Date().toISOString();
    
    await this.saveMetadata(metadata);
  }

  /**
   * Get generation info for a function
   */
  async getGenerationInfo(filePath, functionName) {
    const metadata = await this.loadMetadata();
    const key = `${filePath}::${functionName}`;
    return metadata.generated[key] || null;
  }

  /**
   * Check if function was documented
   */
  async wasDocumented(filePath, functionName) {
    const info = await this.getGenerationInfo(filePath, functionName);
    return info !== null;
  }

  /**
   * Get all documented functions
   */
  async getAllDocumented() {
    const metadata = await this.loadMetadata();
    return Object.keys(metadata.generated);
  }

  /**
   * Clear metadata for a file
   */
  async clearFile(filePath) {
    const metadata = await this.loadMetadata();
    
    // Remove all entries for this file
    Object.keys(metadata.generated).forEach(key => {
      if (key.startsWith(filePath + '::')) {
        delete metadata.generated[key];
      }
    });
    
    await this.saveMetadata(metadata);
  }

  /**
   * Clear all metadata
   */
  async clearAll() {
    const metadata = {
      version: '1.0.0',
      generated: {},
      lastUpdate: null
    };
    
    await this.saveMetadata(metadata);
  }
}

module.exports = MetadataManager;
