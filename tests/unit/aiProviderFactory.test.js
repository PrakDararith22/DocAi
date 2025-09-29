const { createAIProvider } = require('../../src/aiProviderFactory');
const GeminiProvider = require('../../src/providers/geminiProvider');
const HuggingFaceAPI = require('../../src/huggingFaceAPI');

// Mock the providers
jest.mock('../../src/providers/geminiProvider');
jest.mock('../../src/huggingFaceAPI');

describe('AIProviderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables
    delete process.env.DOC_PROVIDER;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.HF_TOKEN;
  });

  describe('Provider Selection', () => {
    test('should select Gemini when provider is explicitly set to "gemini"', () => {
      const options = { provider: 'gemini' };
      createAIProvider(options);
      expect(GeminiProvider).toHaveBeenCalledWith(options);
    });

    test('should select HuggingFace when provider is explicitly set to "huggingface"', () => {
      const options = { provider: 'huggingface' };
      createAIProvider(options);
      expect(HuggingFaceAPI).toHaveBeenCalledWith(options);
    });

    test('should select Gemini via DOC_PROVIDER env var', () => {
      process.env.DOC_PROVIDER = 'gemini';
      const options = {};
      createAIProvider(options);
      expect(GeminiProvider).toHaveBeenCalledWith(options);
    });

    test('should select HuggingFace via DOC_PROVIDER env var', () => {
      process.env.DOC_PROVIDER = 'huggingface';
      const options = {};
      createAIProvider(options);
      expect(HuggingFaceAPI).toHaveBeenCalledWith(options);
    });

    test('should infer Gemini when GOOGLE_API_KEY is present', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const options = {};
      createAIProvider(options);
      expect(GeminiProvider).toHaveBeenCalledWith(options);
    });

    test('should infer HuggingFace when HF_TOKEN is present', () => {
      process.env.HF_TOKEN = 'test-token';
      const options = { hf_token: 'test-token' };
      createAIProvider(options);
      expect(HuggingFaceAPI).toHaveBeenCalledWith(options);
    });

    test('should default to Gemini when no provider specified', () => {
      const options = {};
      createAIProvider(options);
      expect(GeminiProvider).toHaveBeenCalledWith(options);
    });

    test('should handle unknown provider gracefully', () => {
      const options = { provider: 'unknown-provider', verbose: true };
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      createAIProvider(options);
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown provider "unknown-provider", defaulting to Gemini');
      expect(GeminiProvider).toHaveBeenCalledWith(options);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Precedence Rules', () => {
    test('should prioritize config provider over env provider', () => {
      process.env.DOC_PROVIDER = 'huggingface';
      const options = { provider: 'gemini' };
      createAIProvider(options);
      expect(GeminiProvider).toHaveBeenCalledWith(options);
    });

    test('should prioritize env provider over key inference', () => {
      process.env.DOC_PROVIDER = 'huggingface';
      process.env.GOOGLE_API_KEY = 'test-key';
      const options = {};
      createAIProvider(options);
      expect(HuggingFaceAPI).toHaveBeenCalledWith(options);
    });

    test('should prioritize GOOGLE_API_KEY over HF_TOKEN for inference', () => {
      process.env.GOOGLE_API_KEY = 'test-gemini-key';
      process.env.HF_TOKEN = 'test-hf-token';
      const options = {};
      createAIProvider(options);
      expect(GeminiProvider).toHaveBeenCalledWith(options);
    });
  });

  describe('Case Sensitivity', () => {
    test('should handle case-insensitive provider names', () => {
      const options = { provider: 'GEMINI' };
      createAIProvider(options);
      expect(GeminiProvider).toHaveBeenCalledWith(options);
    });

    test('should handle mixed case provider names', () => {
      const options = { provider: 'HuggingFace' };
      createAIProvider(options);
      expect(HuggingFaceAPI).toHaveBeenCalledWith(options);
    });
  });
});
