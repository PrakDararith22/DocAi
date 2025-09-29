const GeminiProvider = require('./providers/geminiProvider');
const HuggingFaceAPI = require('./huggingFaceAPI');

/**
 * Factory to select AI provider based on options/env/config
 */
function createAIProvider(options = {}) {
  const envProvider = process.env.DOC_PROVIDER && process.env.DOC_PROVIDER.trim();
  const configProvider = options.provider && String(options.provider).trim();

  // Heuristics: prefer explicit provider; fallback to env; then infer by keys; default gemini
  let provider = configProvider || envProvider;
  if (!provider) {
    if (process.env.GOOGLE_API_KEY || options.gemini_api_key) provider = 'gemini';
    else if (options.hf_token || process.env.HF_TOKEN) provider = 'huggingface';
    else provider = 'gemini';
  }

  switch (provider.toLowerCase()) {
    case 'gemini':
      return new GeminiProvider(options);
    case 'huggingface':
      return new HuggingFaceAPI(options);
    default:
      // Default to Gemini, but warn
      if (options.verbose) {
        console.warn(`Unknown provider "${provider}", defaulting to Gemini`);
      }
      return new GeminiProvider(options);
  }
}

module.exports = { createAIProvider };
