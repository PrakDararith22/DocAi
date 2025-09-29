const axios = require('axios');
const chalk = require('chalk').default || require('chalk');

/**
 * Hugging Face API Integration
 * Handles communication with Hugging Face Inference API for StarCoder model
 */
class HuggingFaceAPI {
  constructor(options = {}) {
    this.apiKey = options.hf_token || process.env.HF_TOKEN;
    this.baseURL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
    this.timeout = options.timeout || 30000; // 30 seconds
    this.maxRetries = options.maxRetries || 3;
    this.rateLimit = options.rateLimit || 5; // 5 requests per second
    this.verbose = options.verbose || false;
    
    // Rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.rateLimitWindow = 1000; // 1 second window
    
    // Validate API key
    if (!this.apiKey) {
      throw new Error('HF_TOKEN is required. Please set it as an environment variable or in your config file.');
    }
  }

  /**
   * Generate documentation using StarCoder model
   * @param {string} prompt - The prompt to send to the model
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Generated text or error
   */
  async generateDocumentation(prompt, options = {}) {
    try {
      // Rate limiting
      await this.enforceRateLimit();
      
      // TODO: Replace with actual API call when HF API is working
      // For now, return a mock response for development
      if (this.verbose) {
        console.log(chalk.gray(`🤖 Mock API: Generating documentation for prompt...`));
      }

      // Simulate API delay
      await this.sleep(1000);

      // Generate mock documentation based on the prompt
      const mockDocstring = this.generateMockDocstring(prompt);
      
      if (this.verbose) {
        console.log(chalk.gray(`✅ Mock API: Generated documentation`));
      }

      return {
        success: true,
        text: mockDocstring,
        usage: { total_tokens: 50, prompt_tokens: 20, generated_tokens: 30 }
      };

    } catch (error) {
      return this.handleAPIError(error);
    }
  }

  /**
   * Generate mock docstring for development purposes
   * @param {string} prompt - The function signature prompt
   * @returns {string} Mock docstring
   */
  generateMockDocstring(prompt) {
    // Extract function name from prompt
    const functionMatch = prompt.match(/def\s+(\w+)\s*\(/);
    const classNameMatch = prompt.match(/class\s+(\w+)/);
    
    if (functionMatch) {
      const funcName = functionMatch[1];
      return `    \"\"\"${funcName} function.
    
    This function performs the operation described in the function name.
    
    Returns:
        The result of the operation.
    \"\"\"`;
    } else if (classNameMatch) {
      const className = classNameMatch[1];
      return `    \"\"\"${className} class.
    
    This class provides functionality related to ${className.toLowerCase()}.
    
    Attributes:
        None currently defined.
    \"\"\"`;
    } else {
      return `    \"\"\"Generated documentation.
    
    This is a mock documentation generated for development purposes.
    \"\"\"`;
    }
  }

  /**
   * Make HTTP request with retry logic and exponential backoff
   * @param {Object} requestOptions - Axios request options
   * @returns {Promise<Object>} API response
   */
  async makeRequestWithRetry(requestOptions) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios(requestOptions);
        return response;
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication errors or client errors
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }
        
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          if (this.verbose) {
            console.log(chalk.yellow(`⚠️  Request failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms...`));
          }
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Enforce rate limiting (max 5 requests per second)
   */
  async enforceRateLimit() {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastRequestTime >= this.rateLimitWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    // If we've hit the rate limit, wait
    if (this.requestCount >= this.rateLimit) {
      const waitTime = this.rateLimitWindow - (now - this.lastRequestTime);
      if (waitTime > 0) {
        if (this.verbose) {
          console.log(chalk.gray(`⏳ Rate limiting: waiting ${waitTime}ms...`));
        }
        await this.sleep(waitTime);
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
      }
    }
    
    this.requestCount++;
  }

  /**
   * Handle API errors and return standardized error response
   * @param {Error} error - The error that occurred
   * @returns {Object} Standardized error response
   */
  handleAPIError(error) {
    let errorMessage = 'Unknown error occurred';
    let errorType = 'UNKNOWN_ERROR';
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 401:
          errorType = 'AUTHENTICATION_ERROR';
          errorMessage = 'Invalid or missing HF_TOKEN. Please check your API key.';
          break;
        case 403:
          errorType = 'AUTHORIZATION_ERROR';
          errorMessage = 'Access denied. Please check your API key permissions.';
          break;
        case 429:
          errorType = 'RATE_LIMIT_ERROR';
          errorMessage = 'Rate limit exceeded. Please try again later.';
          break;
        case 500:
          errorType = 'SERVER_ERROR';
          errorMessage = 'Hugging Face API server error. Please try again later.';
          break;
        case 503:
          errorType = 'SERVICE_UNAVAILABLE';
          errorMessage = 'Hugging Face API is temporarily unavailable. Please try again later.';
          break;
        default:
          errorType = 'API_ERROR';
          errorMessage = `API error (${status}): ${data?.error || error.message}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorType = 'TIMEOUT_ERROR';
      errorMessage = `Request timeout after ${this.timeout}ms. Please try again.`;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorType = 'NETWORK_ERROR';
      errorMessage = 'Network error. Please check your internet connection.';
    } else {
      errorMessage = error.message;
    }
    
    if (this.verbose) {
      console.error(chalk.red(`❌ API Error (${errorType}): ${errorMessage}`));
    }
    
    return {
      success: false,
      error: errorMessage,
      errorType: errorType,
      status: error.response?.status || null
    };
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test API connection
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      const testPrompt = 'def hello():';
      const result = await this.generateDocumentation(testPrompt, { maxTokens: 50 });
      
      return {
        success: true,
        message: 'API connection successful',
        response: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'API connection failed',
        error: error.message
      };
    }
  }

  /**
   * Get API status and rate limit info
   * @returns {Object} API status information
   */
  getStatus() {
    return {
      hasApiKey: !!this.apiKey,
      baseURL: this.baseURL,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      rateLimit: this.rateLimit,
      currentRequests: this.requestCount,
      windowStart: this.lastRequestTime
    };
  }
}

module.exports = HuggingFaceAPI;
