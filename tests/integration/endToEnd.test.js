const { generateDocumentation } = require('../../src/index');
const fs = require('fs').promises;
const path = require('path');

describe('End-to-End Integration Tests', () => {
  const testProjectPath = path.join(__dirname, '../fixtures/test-project');

  beforeEach(async () => {
    // Clean up any existing backup files
    const files = await fs.readdir(testProjectPath);
    for (const file of files) {
      if (file.endsWith('.bak')) {
        await fs.unlink(path.join(testProjectPath, file));
      }
    }
  });

  afterEach(async () => {
    // Clean up backup files after each test
    const files = await fs.readdir(testProjectPath);
    for (const file of files) {
      if (file.endsWith('.bak')) {
        await fs.unlink(path.join(testProjectPath, file));
      }
    }
  });

  describe('Low-level documentation generation', () => {
    test('should generate documentation for Python files', async () => {
      const options = {
        project: testProjectPath,
        lang: 'py',
        lowLevel: true,
        inline: true,
        backup: true,
        verbose: false,
        hf_token: 'test_token'
      };

      const result = await generateDocumentation(options);
      
      // Check that backup files were created
      const files = await fs.readdir(testProjectPath);
      const backupFiles = files.filter(f => f.endsWith('.bak'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });

    test('should generate documentation for JavaScript files', async () => {
      const options = {
        project: testProjectPath,
        lang: 'js',
        lowLevel: true,
        inline: true,
        backup: true,
        verbose: false,
        hf_token: 'test_token'
      };

      const result = await generateDocumentation(options);
      
      // Check that backup files were created
      const files = await fs.readdir(testProjectPath);
      const backupFiles = files.filter(f => f.endsWith('.bak'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });

    test('should generate documentation for TypeScript files', async () => {
      const options = {
        project: testProjectPath,
        lang: 'ts',
        lowLevel: true,
        inline: true,
        backup: true,
        verbose: false,
        hf_token: 'test_token'
      };

      const result = await generateDocumentation(options);
      
      // Check that backup files were created
      const files = await fs.readdir(testProjectPath);
      const backupFiles = files.filter(f => f.endsWith('.bak'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });
  });

  describe('High-level README generation', () => {
    test('should generate README for project', async () => {
      const options = {
        project: testProjectPath,
        highLevel: true,
        verbose: false,
        hf_token: 'test_token'
      };

      const result = await generateDocumentation(options);
      
      // Check that README was generated
      const readmePath = path.join(testProjectPath, 'README.md');
      const readmeExists = await fs.access(readmePath).then(() => true).catch(() => false);
      expect(readmeExists).toBe(true);
      
      // Check README content
      const readmeContent = await fs.readFile(readmePath, 'utf-8');
      expect(readmeContent).toContain('#');
      expect(readmeContent).toContain('##');
    });
  });

  describe('Error handling', () => {
    test('should handle missing HF token gracefully', async () => {
      const options = {
        project: testProjectPath,
        lang: 'py',
        lowLevel: true,
        inline: true,
        verbose: false
        // No hf_token provided
      };

      // Should not throw error, but should handle gracefully
      await expect(generateDocumentation(options)).resolves.not.toThrow();
    });

    test('should handle non-existent project directory', async () => {
      const options = {
        project: '/non/existent/directory',
        lang: 'py',
        lowLevel: true,
        inline: true,
        verbose: false,
        hf_token: 'test_token'
      };

      // Should not throw error, but should handle gracefully
      await expect(generateDocumentation(options)).resolves.not.toThrow();
    });
  });

  describe('Configuration handling', () => {
    test('should load configuration from .docaiConfig.json', async () => {
      const configPath = path.join(testProjectPath, '.docaiConfig.json');
      const config = {
        hf_token: 'test_token',
        lang: 'py',
        lowLevel: true,
        inline: true,
        verbose: false
      };
      
      await fs.writeFile(configPath, JSON.stringify(config), 'utf-8');
      
      const options = {
        project: testProjectPath
        // No other options provided, should use config
      };

      await expect(generateDocumentation(options)).resolves.not.toThrow();
      
      // Clean up
      await fs.unlink(configPath);
    });
  });
});
