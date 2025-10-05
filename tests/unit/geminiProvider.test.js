const GeminiProvider = require('../../src/providers/geminiProvider');
const axios = require('axios');

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('GeminiProvider', () => {
  let provider;
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_API_KEY = 'test-api-key';
    provider = new GeminiProvider({ verbose: false });
  });

  afterEach(() => {
    delete process.env.GOOGLE_API_KEY;
  });

  describe('Constructor', () => {
    test('should initialize with GOOGLE_API_KEY from env', () => {
      expect(provider.apiKey).toBe('test-api-key');
      expect(provider.model).toBe('gemini-1.5-flash-latest');
    });

    test('should use config fallback for API key', () => {
      delete process.env.GOOGLE_API_KEY;
      const providerWithConfig = new GeminiProvider({ gemini_api_key: 'config-key' });
      expect(providerWithConfig.apiKey).toBe('config-key');
    });

    test('should use custom model from options', () => {
      const providerWithModel = new GeminiProvider({ gemini_model: 'gemini-2.5-flash' });
      expect(providerWithModel.model).toBe('gemini-2.5-flash');
    });

    test('should use DOC_MODEL env var', () => {
      process.env.DOC_MODEL = 'gemini-2.5-flash';
      const providerWithEnvModel = new GeminiProvider({});
      expect(providerWithEnvModel.model).toBe('gemini-2.5-flash');
      delete process.env.DOC_MODEL;
    });
  });

  describe('generateDocumentation', () => {
    test('should successfully generate documentation', async () => {
      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: 'Generated docstring content' }]
              }
            }
          ]
        }
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(true);
      expect(result.text).toBe('Generated docstring content');
      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent',
        headers: {
          'x-goog-api-key': 'test-api-key',
          'Content-Type': 'application/json'
        },
        data: {
          contents: [{ parts: [{ text: 'test prompt' }] }]
        },
        timeout: 30000
      });
    });

    test('should handle multiple text parts in response', async () => {
      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  { text: 'Part 1' },
                  { text: 'Part 2' }
                ]
              }
            }
          ]
        }
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(true);
      expect(result.text).toBe('Part 1\nPart 2');
    });

    test('should handle empty response gracefully', async () => {
      const mockResponse = { data: { candidates: [] } };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(true);
      expect(result.text).toBe('');
    });
  });

  describe('Error Mapping', () => {
    test('should map 401 to AUTHENTICATION_ERROR', async () => {
      const error = {
        response: {
          status: 401,
          data: { error: { message: 'Invalid API key' } }
        }
      };
      mockedAxios.mockRejectedValueOnce(error);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('AUTHENTICATION_ERROR');
      expect(result.error).toBe('Invalid or missing API key');
    });

    test('should map 403 to AUTHORIZATION_ERROR', async () => {
      const error = {
        response: {
          status: 403,
          data: { error: { message: 'Access denied' } }
        }
      };
      mockedAxios.mockRejectedValueOnce(error);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('AUTHORIZATION_ERROR');
      expect(result.error).toBe('Access denied or unregistered caller');
    });

    test('should map 429 to RATE_LIMIT_ERROR', async () => {
      const error = {
        response: {
          status: 429,
          data: { error: { message: 'Rate limit exceeded' } }
        }
      };
      // Mock all retry attempts to fail
      mockedAxios.mockRejectedValue(error);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('RATE_LIMIT_ERROR');
      expect(result.error).toBe('Rate limit exceeded');
    });

    test('should map timeout to TIMEOUT_ERROR', async () => {
      const error = { code: 'ECONNABORTED' };
      mockedAxios.mockRejectedValue(error);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('TIMEOUT_ERROR');
      expect(result.error).toBe('Request timeout after 30000ms');
    });

    test('should map network errors to NETWORK_ERROR', async () => {
      const error = { code: 'ENOTFOUND' };
      mockedAxios.mockRejectedValue(error);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('NETWORK_ERROR');
      expect(result.error).toBe('Network error. Check your connection.');
    });

    test('should handle missing API key', async () => {
      delete process.env.GOOGLE_API_KEY;
      const providerNoKey = new GeminiProvider({});
      
      const result = await providerNoKey.generateDocumentation('test prompt');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('AUTHENTICATION_ERROR');
      expect(result.error).toBe('Missing GOOGLE_API_KEY for Gemini provider.');
    });
  });

  describe('testConnection', () => {
    test('should return success when connection works', async () => {
      const mockResponse = {
        data: {
          candidates: [
            { content: { parts: [{ text: 'ok' }] } }
          ]
        }
      };
      mockedAxios.mockResolvedValueOnce(mockResponse);

      const result = await provider.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Gemini connection successful');
    });

    test('should return failure when connection fails', async () => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized'
      };
      mockedAxios.mockRejectedValueOnce(error);

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or missing API key');
    });
  });

  describe('getStatus', () => {
    test('should return correct status information', () => {
      const status = provider.getStatus();

      expect(status).toEqual({
        hasApiKey: true,
        baseURL: 'https://generativelanguage.googleapis.com',
        model: 'gemini-1.5-flash-latest',
        timeout: 30000,
        maxRetries: 3,
        rateLimit: 5
      });
    });

    test('should indicate missing API key', () => {
      delete process.env.GOOGLE_API_KEY;
      const providerNoKey = new GeminiProvider({});
      const status = providerNoKey.getStatus();

      expect(status.hasApiKey).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limit', async () => {
      const mockResponse = {
        data: { candidates: [{ content: { parts: [{ text: 'test' }] } }] }
      };
      mockedAxios.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      
      // Make 6 requests (exceeds limit of 5)
      const promises = Array(6).fill().map(() => 
        provider.generateDocumentation('test')
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least 1 second due to rate limiting
      expect(duration).toBeGreaterThan(900);
    });
  });

  describe('Retry Logic', () => {
    test('should retry on 500 error', async () => {
      const error500 = {
        response: { status: 500, data: { error: { message: 'Server error' } } }
      };
      const successResponse = {
        data: { candidates: [{ content: { parts: [{ text: 'success' }] } }] }
      };

      mockedAxios
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce(successResponse);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(true);
      expect(result.text).toBe('success');
      expect(mockedAxios).toHaveBeenCalledTimes(2);
    });

    test('should not retry on 400 error', async () => {
      const error400 = {
        response: { status: 400, data: { error: { message: 'Bad request' } } }
      };
      mockedAxios.mockRejectedValueOnce(error400);

      const result = await provider.generateDocumentation('test prompt');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('API_ERROR');
      expect(mockedAxios).toHaveBeenCalledTimes(1);
    });
  });
});
