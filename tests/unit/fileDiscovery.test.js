const FileDiscovery = require('../../src/fileDiscovery');
const path = require('path');
const fs = require('fs').promises;

describe('FileDiscovery', () => {
  let fileDiscovery;
  const testProjectPath = path.join(__dirname, '../fixtures/test-project');

  beforeEach(() => {
    fileDiscovery = new FileDiscovery({
      project: testProjectPath,
      lang: 'all',
      verbose: false
    });
  });

  describe('discoverFiles', () => {
    test('should discover Python files', async () => {
      const files = await fileDiscovery.discoverFiles();
      const pythonFiles = files.filter(f => f.path.endsWith('.py'));
      expect(pythonFiles.length).toBeGreaterThan(0);
    });

    test('should discover JavaScript files', async () => {
      const files = await fileDiscovery.discoverFiles();
      const jsFiles = files.filter(f => f.path.endsWith('.js'));
      expect(jsFiles.length).toBeGreaterThan(0);
    });

    test('should discover TypeScript files', async () => {
      const files = await fileDiscovery.discoverFiles();
      const tsFiles = files.filter(f => f.path.endsWith('.ts'));
      expect(tsFiles.length).toBeGreaterThan(0);
    });

    test('should filter by language', async () => {
      const pyDiscovery = new FileDiscovery({
        project: testProjectPath,
        lang: 'py',
        verbose: false
      });
      const files = await pyDiscovery.discoverFiles();
      const nonPyFiles = files.filter(f => !f.path.endsWith('.py'));
      expect(nonPyFiles.length).toBe(0);
    });

    test('should exclude common directories', async () => {
      const files = await fileDiscovery.discoverFiles();
      const excludedFiles = files.filter(f => 
        f.path.includes('node_modules') || 
        f.path.includes('__pycache__') ||
        f.path.includes('.git')
      );
      expect(excludedFiles.length).toBe(0);
    });
  });

  describe('validateFiles', () => {
    test('should validate accessible files', async () => {
      const files = await fileDiscovery.discoverFiles();
      const { validFiles, errors } = await fileDiscovery.validateFiles(files);
      expect(validFiles.length).toBeGreaterThan(0);
      expect(errors.length).toBe(0);
    });

    test('should handle non-existent files', async () => {
      const nonExistentFiles = [
        { path: '/non/existent/file.py', size: 0, lastModified: Date.now() }
      ];
      const { validFiles, errors } = await fileDiscovery.validateFiles(nonExistentFiles);
      expect(validFiles.length).toBe(0);
      expect(errors.length).toBe(1);
    });
  });
});
