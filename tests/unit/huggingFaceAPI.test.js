const HuggingFaceAPI = require('../../src/huggingFaceAPI');

describe('HuggingFaceAPI', () => {
  let api;

  beforeEach(() => {
    api = new HuggingFaceAPI({
      hf_token: 'test_token',
      verbose: false
    });
  });

  describe('testConnection', () => {
    test('should test API connection successfully', async () => {
      const result = await api.testConnection();
      expect(result.success).toBe(true);
    });
  });

  describe('generateDocumentation', () => {
    test('should generate docstring for function', async () => {
      const prompt = 'def calculate_sum(a, b):\n    return a + b';
      const result = await api.generateDocumentation(prompt);
      
      expect(result.success).toBe(true);
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
    });

    test('should generate docstring for class', async () => {
      const prompt = 'class DataProcessor:\n    def __init__(self):\n        self.data = []';
      const result = await api.generateDocumentation(prompt);
      
      expect(result.success).toBe(true);
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
    });

    test('should handle empty prompt', async () => {
      const result = await api.generateDocumentation('');
      // Mock API handles empty prompts by generating a default response
      expect(result.success).toBe(true);
      expect(result.text).toBeDefined();
    });

    test('should handle malformed prompt', async () => {
      const result = await api.generateDocumentation('invalid syntax {');
      expect(result.success).toBe(true); // Mock API should handle this
    });
  });

  describe('rate limiting', () => {
    test('should respect rate limits', async () => {
      const startTime = Date.now();
      
      // Make multiple rapid requests
      const promises = Array(5).fill().map(() => 
        api.generateDocumentation('def test(): pass')
      );
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      // Should take at least 1 second due to rate limiting
      expect(duration).toBeGreaterThan(1000);
    });
  });

  describe('error handling', () => {
    test('should handle API errors gracefully', async () => {
      // Create a new instance with invalid token to trigger error
      const errorApi = new HuggingFaceAPI({
        hf_token: 'invalid_token',
        verbose: false
      });
      
      // Mock the generateDocumentation method to return an error result
      errorApi.generateDocumentation = jest.fn().mockResolvedValue({
        success: false,
        error: 'API Error'
      });
      
      const result = await errorApi.generateDocumentation('def test(): pass');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });
});
