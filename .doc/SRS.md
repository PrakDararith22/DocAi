# Software Requirements Specification (SRS) – DocAI with Gemini Provider

## 1. Introduction
- **Purpose**: Define requirements for DocAI’s documentation generation CLI with a pluggable AI provider, migrating from Hugging Face to Google’s Gemini API.
- **Scope**: CLI tool that parses code (Python/JS/TS), generates docstrings/README, and safely inserts results. This SRS focuses on the AI provider abstraction and Gemini integration.
- **Definitions**:
  - AI Provider: An implementation that exposes `generateDocumentation(prompt, options)`, `testConnection()`, `getStatus()`.
  - Provider Factory: Module that selects and constructs a provider based on config/env.

## 2. Overall Description
- **Product perspective**: Extends existing DocAI CLI. No behavioral change to users besides configuration of provider/model/auth.
- **User characteristics**: Developers comfortable with CLI, Node.js, and environment variables.
- **Assumptions/Dependencies**:
  - Node.js 16+.
  - Internet access for hosted providers (Gemini); offline when using local providers.
  - Valid Gemini API key with Generative Language API enabled.

## 3. Functional Requirements
### 3.1 Provider Abstraction
- The system MUST provide an `AIProvider` interface with:
  - `generateDocumentation(prompt: string, options?: object): Promise<{ success: boolean, text?: string, error?: string }>`
  - `testConnection(): Promise<{ success: boolean, message: string }>`
  - `getStatus(): { hasApiKey: boolean, baseURL?: string, timeout?: number, maxRetries?: number, rateLimit?: number }`
- A provider factory MUST instantiate the correct provider (`gemini`, `huggingface`, others) using config/env.

### 3.2 Gemini Provider
- The system MUST implement `GeminiProvider` using Google Generative Language API.
- It MUST read the API key from `GOOGLE_API_KEY` (env). Optional fallback from config for dev only.
- It MUST support configurable model (default `gemini-1.5-flash-latest` or `gemini-2.5-flash`).
- It MUST POST to `https://generativelanguage.googleapis.com/v1/models/{model}:generateContent` (or `v1beta` if configured).
- It MUST accept a prompt string and return only the generated text (provider should not wrap code blocks).
- It MUST implement retry with exponential backoff and map errors into standard error types.
- It MUST implement simple rate limiting (requests/second) similar to existing HF behavior.

### 3.3 Configuration & CLI
- `.docaiConfig.json` MUST support:
  - `provider` (string): e.g., `"gemini"`, `"huggingface"`.
  - `gemini_model` (string): e.g., `"gemini-1.5-flash-latest"`.
  - Backward compatibility: `hf_token` MAY remain but is ignored if `provider === "gemini"`.
- CLI SHOULD optionally provide `--provider` and `--model` flags overriding config.

### 3.4 Documentation Generation Flow
- The CLI MUST continue to:
  - Parse files, build prompts (`createFunctionPrompt`, `createClassPrompt`).
  - Call provider’s `generateDocumentation()`.
  - Post-process text (`postProcessDocstring`) and insert into files when `--inline` is set.
  - Respect `--preview`, `--force`, `--backup`, `--skip-errors`, `--verbose`.

### 3.5 Safety & Backups
- The system MUST create backups before inline modifications when `--backup` is enabled.
- On failure, the system MUST restore from backup and surface clear error messages.

## 4. Non-Functional Requirements
- **Performance**: Comparable to HF path. Concurrency parameter respected; default rate limit to avoid provider throttling.
- **Reliability**: Retries for transient errors; clear error categories (auth, quota, network, server).
- **Security**: Keys SHOULD be supplied via environment variables. Keys MUST NOT be logged or committed.
- **Usability**: Minimal configuration required; helpful errors when keys or API access are missing.
- **Portability**: macOS/Linux/Windows shells.

## 5. External Interface Requirements
- **API**: Google Generative Language API; HTTP POST JSON.
- **Environment variables**:
  - `GOOGLE_API_KEY` (required for Gemini provider)
  - Optional: `DOC_PROVIDER`, `DOC_MODEL` overrides
- **Files**:
  - `.docaiConfig.json` for defaults.

## 6. Error Handling & Logging
- Standardized error response with type: `AUTHENTICATION_ERROR`, `AUTHORIZATION_ERROR`, `RATE_LIMIT_ERROR`, `TIMEOUT_ERROR`, `NETWORK_ERROR`, `API_ERROR`, `UNKNOWN_ERROR`.
- Verbose mode logs request phases without printing secrets.

## 7. Acceptance Criteria
- Provider factory selects Gemini when `provider: "gemini"` (or env override) and successfully returns a provider instance.
- `testConnection()` confirms a minimal generation succeeds with a valid `GOOGLE_API_KEY`.
- `docai generate --low-level --preview` works end-to-end using Gemini and shows generated docstrings.
- `--inline --backup` modifies files safely and creates `.bak` files; restore works on error.
- Switching back to `provider: "huggingface"` requires no code changes and behaves as before.

## 8. Security & Compliance
- Keys stored in environment variables; repository MUST NOT contain plaintext keys.
- Document guidance for rotating keys and removing hardcoded tokens.

## 9. Open Items
- Optional CLI flags for provider/model.
- Optional support for additional providers via the same interface (Anthropic, OpenRouter, Ollama).
