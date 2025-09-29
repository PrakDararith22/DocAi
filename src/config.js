const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk').default || require('chalk');

const DEFAULT_CONFIG_FILENAME = '.docaiConfig.json';

function getDefaultOptions(cwd) {
  return {
    project: cwd || process.cwd(),
    lowLevel: false,
    highLevel: false,
    inline: false,
    file: undefined,
    lang: 'all',
    output: './docs',
    preview: false,
    watch: false,
    force: false,
    skipErrors: false,
    backup: false,
    cleanup: false,
    timestamped: false,
    strict: false,
    logErrors: false,
    verbose: false,
    style: 'google',
  };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadConfigFile(projectPath, explicitPath) {
  const configPath = explicitPath
    ? path.isAbsolute(explicitPath) ? explicitPath : path.join(projectPath, explicitPath)
    : path.join(projectPath, DEFAULT_CONFIG_FILENAME);

  if (!(await fileExists(configPath))) {
    return { config: {}, configPath: null };
  }

  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);
    return { config, configPath };
  } catch (err) {
    throw new Error(`Failed to load config file at ${configPath}: ${err.message}`);
  }
}

function validateConfig(config) {
  if (config == null || typeof config !== 'object') {
    throw new Error('Configuration must be a JSON object.');
  }
  
  // Validate required fields for Phase 2.1
  if (config.hf_token && typeof config.hf_token !== 'string') {
    throw new Error('hf_token must be a string.');
  }
  
  if (config.project && typeof config.project !== 'string') {
    throw new Error('project must be a string.');
  }
}

function envOverrides() {
  const env = {};
  if (process.env.HF_TOKEN) {
    env.hf_token = process.env.HF_TOKEN;
  }
  return env;
}

function normalizeOptionNames(opts) {
  // Commander passes camelCase; config may use snake_case. Support both.
  const out = { ...opts };
  if (Object.prototype.hasOwnProperty.call(out, 'low_level')) out.lowLevel = out.low_level;
  if (Object.prototype.hasOwnProperty.call(out, 'high_level')) out.highLevel = out.high_level;
  if (Object.prototype.hasOwnProperty.call(out, 'skip_errors')) out.skipErrors = out.skip_errors;
  if (Object.prototype.hasOwnProperty.call(out, 'hf_token')) out.hf_token = out.hf_token;
  return out;
}

function mergeOptions({ defaults, config, env, cli }) {
  // Precedence: CLI > ENV > CONFIG > DEFAULTS
  return {
    ...defaults,
    ...normalizeOptionNames(config || {}),
    ...normalizeOptionNames(env || {}),
    ...normalizeOptionNames(cli || {}),
  };
}

async function saveConfigFile(projectPath, config) {
  const configPath = path.join(projectPath, DEFAULT_CONFIG_FILENAME);
  const toSave = { ...config };
  // Do not persist transient/derived values
  delete toSave.version;
  // Keep hf_token if present, but never log it elsewhere
  await fs.writeFile(configPath, JSON.stringify(toSave, null, 2) + '\n', 'utf-8');
  return configPath;
}

async function resolveOptions(cliOptions) {
  const projectPath = cliOptions.project || process.cwd();
  const defaults = getDefaultOptions(projectPath);

  const { config, configPath } = await loadConfigFile(projectPath, cliOptions.config);
  if (configPath) {
    try {
      validateConfig(config);
      if (!cliOptions.quiet) {
        console.log(chalk.gray(`Loaded configuration from ${configPath}`));
      }
    } catch (err) {
      throw err;
    }
  }

  const finalOptions = mergeOptions({
    defaults,
    config,
    env: envOverrides(),
    cli: cliOptions,
  });

  return { options: finalOptions, configPath };
}

module.exports = {
  resolveOptions,
  saveConfigFile,
  DEFAULT_CONFIG_FILENAME,
};


