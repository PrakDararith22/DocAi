const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Git Helper - Read-only access to user's git
 * NEVER modifies user's git repository
 */
class GitHelper {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Check if directory is a git repository
   */
  async isGitRepository() {
    try {
      execSync('git rev-parse --git-dir', {
        cwd: this.projectPath,
        stdio: 'ignore'
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get last commit hash for a specific file
   * READ ONLY - doesn't modify anything
   */
  async getLastCommitForFile(filePath) {
    try {
      const relativePath = path.relative(this.projectPath, filePath);
      const commit = execSync(`git log -1 --format="%H" -- "${relativePath}"`, {
        cwd: this.projectPath,
        encoding: 'utf-8'
      }).trim();
      
      return commit || null;
    } catch {
      return null;
    }
  }

  /**
   * Get last commit date for a specific file
   * READ ONLY
   */
  async getLastCommitDateForFile(filePath) {
    try {
      const relativePath = path.relative(this.projectPath, filePath);
      const date = execSync(`git log -1 --format="%ct" -- "${relativePath}"`, {
        cwd: this.projectPath,
        encoding: 'utf-8'
      }).trim();
      
      return date ? parseInt(date) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get last commit hash for specific lines in a file
   * READ ONLY
   */
  async getLastCommitForLines(filePath, startLine, endLine) {
    try {
      const relativePath = path.relative(this.projectPath, filePath);
      const commit = execSync(
        `git log -1 --format="%H" -L ${startLine},${endLine}:"${relativePath}"`,
        {
          cwd: this.projectPath,
          encoding: 'utf-8'
        }
      ).trim();
      
      // Extract commit hash from output
      const match = commit.match(/^commit ([a-f0-9]+)/m);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if file has uncommitted changes
   * READ ONLY
   */
  async hasUncommittedChanges(filePath) {
    try {
      const relativePath = path.relative(this.projectPath, filePath);
      const status = execSync(`git status --porcelain "${relativePath}"`, {
        cwd: this.projectPath,
        encoding: 'utf-8'
      }).trim();
      
      return status.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get current commit hash
   * READ ONLY
   */
  async getCurrentCommit() {
    try {
      const commit = execSync('git rev-parse HEAD', {
        cwd: this.projectPath,
        encoding: 'utf-8'
      }).trim();
      
      return commit;
    } catch {
      return null;
    }
  }
}

module.exports = GitHelper;
