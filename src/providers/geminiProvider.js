const https = require('https');
const { URL } = require('url');
const chalk = require('chalk').default || require('chalk');

/**
 * Gemini Provider
 * Implements AIProvider for Google Generative Language API (Gemini)
 */
class GeminiProvider {
  constructor(options = {}) {
    this.apiKey = process.env.GOOGLE_API_KEY || options.gemini_api_key;
    this.model = options.gemini_model || process.env.DOC_MODEL || 'gemini-1.5-flash';
    this.baseURL = 'https://generativelanguage.googleapis.com';
    this.apiPath = options.gemini_api_path || 'v1beta';
    this.timeout = options.timeout || 15000;
    this.maxRetries = options.maxRetries || 3;
    this.rateLimit = options.rateLimit || 5; // req/s
    this.verbose = options.verbose || false;

    // Rate limiting
    this.requestCount = 0;
    this.lastWindowStart = 0;
    this.windowMs = 1000;

    if (!this.apiKey) {
      // Defer throwing to allow calling code to show friendly guidance
      if (this.verbose) {
        console.error(chalk.red('GeminiProvider: Missing GOOGLE_API_KEY.')); 
      }
    }
  }

  async generate(prompt, options = {}) {
    // Backward compatibility - delegate to generateDocumentation
    return this.generateDocumentation(prompt, options);
  }

  async generateDocumentation(prompt, options = {}) {
    try {
      await this._enforceRateLimit();

      const url = `${this.baseURL}/${this.apiPath}/models/${this.model}:generateContent`;
      const payload = {
        contents: [
          {
            parts: [{ text: String(prompt) }]
          }
        ]
      };

      // Add a race condition with a timeout to prevent hanging
      const requestPromise = this._requestWithRetry({
        method: 'POST',
        url,
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: payload,
        timeout: this.timeout
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - no response received')), this.timeout + 5000);
      });

      const response = await Promise.race([requestPromise, timeoutPromise]);

      // Extract text from candidates with error handling
      const candidates = response.data?.candidates || [];
      if (candidates.length === 0) {
        throw new Error('No candidates in response');
      }

      const parts = candidates[0]?.content?.parts || [];
      if (parts.length === 0) {
        throw new Error('No parts in response content');
      }

      const textParts = parts
        .map(p => (typeof p.text === 'string' ? p.text : ''))
        .filter(Boolean);

      if (textParts.length === 0) {
        throw new Error('No text content in response');
      }

      const text = textParts.join('\n').trim();

      if (this.verbose) {
        console.log(chalk.gray('✅ Gemini: generation succeeded'));
      }

      return { success: true, text };
    } catch (error) {
      return this._mapError(error);
    }
  }

  async testConnection() {
    try {
      const result = await this.generateDocumentation('Reply with the word: ok', { maxTokens: 8 });
      if (result.success) {
        return { success: true, message: 'Gemini connection successful' };
      }
      return { success: false, message: result.error || 'Unknown error' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  getStatus() {
    return {
      hasApiKey: !!this.apiKey,
      baseURL: this.baseURL,
      model: this.model,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      rateLimit: this.rateLimit
    };
  }

  // Internal helpers
  async _requestWithRetry(config) {
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this._makeHttpRequest(config);
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        // Do not retry on 4xx except 429
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 500; // backoff
          if (this.verbose) {
            console.log(chalk.yellow(`⚠️  Gemini request failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms...`));
          }
          await this._sleep(delay);
        }
      }
    }
    throw lastError;
  }

  _makeHttpRequest(config) {
    return new Promise((resolve, reject) => {
        const url = new URL(config.url);
        const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;

        const options = {
            method: config.method,
            headers: config.headers,
        };

        if (proxyUrl) {
            const proxy = new URL(proxyUrl);
            options.host = proxy.hostname;
            options.port = proxy.port;
            options.path = url.href;
            options.headers.Host = url.host;
        } else {
            options.hostname = url.hostname;
            options.path = url.pathname + url.search;
        }

        // Set up timeout manually
        const timeoutId = setTimeout(() => {
            req.destroy();
            reject(new Error(`Request timeout after ${config.timeout}ms`));
        }, config.timeout);

        const req = https.request(options, (res) => {
            clearTimeout(timeoutId);
            let data = '';
            
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ data: jsonData, status: res.statusCode });
                    } else {
                        const error = new Error(`Request failed with status code ${res.statusCode}`);
                        error.response = { data: jsonData, status: res.statusCode };
                        reject(error);
                    }
                } catch (e) {
                    reject(new Error('Failed to parse JSON response: ' + e.message));
                }
            });
        });

        req.on('error', (e) => {
            clearTimeout(timeoutId);
            reject(e);
        });

        if (config.data) {
            req.write(JSON.stringify(config.data));
        }
        req.end();
    });
  }

  async _enforceRateLimit() {
    const now = Date.now();
    if (now - this.lastWindowStart >= this.windowMs) {
      this.requestCount = 0;
      this.lastWindowStart = now;
    }
    if (this.requestCount >= this.rateLimit) {
      const wait = this.windowMs - (now - this.lastWindowStart);
      if (wait > 0) {
        if (this.verbose) console.log(chalk.gray(`⏳ Gemini rate limit: waiting ${wait}ms...`));
        await this._sleep(wait);
        this.requestCount = 0;
        this.lastWindowStart = Date.now();
      }
    }
    this.requestCount++;
  }

  _mapError(error) {
    let errorType = 'UNKNOWN_ERROR';
    let message = 'Unknown error occurred';

    if (!this.apiKey) {
      errorType = 'AUTHENTICATION_ERROR';
      message = 'Missing GOOGLE_API_KEY for Gemini provider.';
    } else if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      switch (status) {
        case 400: errorType = 'API_ERROR'; message = data?.error?.message || 'Bad request'; break;
        case 401: errorType = 'AUTHENTICATION_ERROR'; message = 'Invalid or missing API key'; break;
        case 403: errorType = 'AUTHORIZATION_ERROR'; message = 'Access denied or unregistered caller'; break;
        case 404: errorType = 'API_ERROR'; message = 'Model not found'; break;
        case 429: errorType = 'RATE_LIMIT_ERROR'; message = 'Rate limit exceeded'; break;
        case 500: errorType = 'SERVER_ERROR'; message = 'Server error'; break;
        case 503: errorType = 'SERVICE_UNAVAILABLE'; message = 'Service unavailable'; break;
        default: errorType = 'API_ERROR'; message = data?.error?.message || `API error (${status})`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorType = 'TIMEOUT_ERROR';
      message = `Request timeout after ${this.timeout}ms`;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorType = 'NETWORK_ERROR';
      message = 'Network error. Check your connection.';
    } else if (error.message) {
      message = error.message;
    }

    if (this.verbose) {
      console.error(chalk.red(`❌ Gemini Error (${errorType}): ${message}`));
    }

    return { success: false, error: message, errorType, status: error.response?.status || null };
  }

  _sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }
}

module.exports = GeminiProvider;
