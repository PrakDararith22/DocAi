const BackupManager = require('../../src/backupManager');
const fs = require('fs').promises;
const path = require('path');

describe('BackupManager', () => {
  let backupManager;
  const testDir = path.join(__dirname, '../fixtures/backup-test');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    backupManager = new BackupManager({
      project: testDir,
      verbose: false
    });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('createBackups', () => {
    test('should create backup files', async () => {
      // Create test files
      const testFiles = [
        path.join(testDir, 'test1.py'),
        path.join(testDir, 'test2.js')
      ];

      for (const file of testFiles) {
        await fs.writeFile(file, 'test content', 'utf-8');
      }

      const results = await backupManager.createBackups(testFiles);
      
      expect(results.successful.length).toBe(2);
      expect(results.failed.length).toBe(0);
      
      // Check that backup files exist
      for (const file of testFiles) {
        const backupFile = file + '.bak';
        const exists = await fs.access(backupFile).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    test('should handle non-existent files', async () => {
      const nonExistentFiles = [
        path.join(testDir, 'non-existent.py')
      ];

      const results = await backupManager.createBackups(nonExistentFiles);
      
      expect(results.successful.length).toBe(0);
      expect(results.failed.length).toBe(1);
      expect(results.failed[0].error).toContain('ENOENT');
    });

    test('should create timestamped backups', async () => {
      const timestampedManager = new BackupManager({
        project: testDir,
        timestamped: true,
        verbose: false
      });

      const testFile = path.join(testDir, 'test.py');
      await fs.writeFile(testFile, 'test content', 'utf-8');

      const results = await timestampedManager.createBackups([testFile]);
      
      expect(results.successful.length).toBe(1);
      
      // Check that timestamped backup exists
      const backupFiles = await fs.readdir(testDir);
      const timestampedBackup = backupFiles.find(f => f.startsWith('test_') && f.endsWith('.py.bak'));
      expect(timestampedBackup).toBeDefined();
    });
  });

  describe('restoreFromBackup', () => {
    test('should restore file from backup', async () => {
      const testFile = path.join(testDir, 'test.py');
      
      // Create original file
      await fs.writeFile(testFile, 'original content', 'utf-8');
      
      // Create backup first
      const backupResult = await backupManager.createBackups([testFile]);
      expect(backupResult.successful.length).toBe(1);
      
      // Now restore
      const result = await backupManager.restoreFromBackup(testFile);
      
      expect(result.success).toBe(true);
    });

    test('should handle missing backup file', async () => {
      const testFile = path.join(testDir, 'no-backup.py');
      
      const result = await backupManager.restoreFromBackup(testFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No backup found');
    });
  });

  describe('cleanupBackups', () => {
    test('should clean up backup files', async () => {
      // Create test files and backups using the backup manager
      const testFiles = [
        path.join(testDir, 'test1.py'),
        path.join(testDir, 'test2.js')
      ];

      for (const file of testFiles) {
        await fs.writeFile(file, 'test content', 'utf-8');
      }

      // Create backups using the backup manager
      const backupResults = await backupManager.createBackups(testFiles);
      expect(backupResults.successful.length).toBe(2);

      // Now cleanup
      const results = await backupManager.cleanupBackups();
      
      expect(results.cleaned.length).toBe(2);
      expect(results.failed.length).toBe(0);
      
      // Check that backup files are gone
      for (const file of testFiles) {
        const backupFile = file + '.bak';
        const exists = await fs.access(backupFile).then(() => true).catch(() => false);
        expect(exists).toBe(false);
      }
    });
  });
});
