export type NodeEnv = 'development' | 'test' | 'production';

export interface Config {
  env: NodeEnv;
  port: number;
  apiAuthToken: string;
  corsOrigin: string;
  
  databaseUrl: string;
  testDatabaseUrl?: string;

  ollamaBaseUrl: string;
  ollamaModel: string;

  telegramBotToken?: string;
  telegramChatId?: string;

  pipelineIntervalMs: number;
  
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export function loadConfig(envData: NodeJS.ProcessEnv = process.env): Readonly<Config> {
  // 1. NODE_ENV
  const envRaw = (envData.NODE_ENV || 'development').toLowerCase();
  if (!['development', 'test', 'production'].includes(envRaw)) {
    throw new Error(`Invalid NODE_ENV: ${envRaw}. Allowed values are 'development', 'test', 'production'`);
  }
  const env = envRaw as NodeEnv;

  // 2. PORT
  const portRaw = envData.PORT || '3000';
  const port = parseInt(portRaw, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${portRaw}`);
  }

  // 3. API_AUTH_TOKEN
  const apiAuthToken = envData.API_AUTH_TOKEN;
  if (!apiAuthToken || apiAuthToken.trim() === '') {
    throw new Error('API_AUTH_TOKEN is required and cannot be empty');
  }

  // 4. CORS_ORIGIN
  const corsOrigin = envData.CORS_ORIGIN || '*';
  if (env === 'production' && corsOrigin === '*') {
    throw new Error('CORS_ORIGIN cannot be "*" in production environment');
  }

  // 5. DATABASE_URL
  const databaseUrl = envData.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error('DATABASE_URL is required and cannot be empty');
  }
  
  // Refuse to use TEST_DATABASE_URL as production DATABASE_URL
  if (envData.TEST_DATABASE_URL && databaseUrl === envData.TEST_DATABASE_URL) {
    throw new Error('DATABASE_URL cannot be the same as TEST_DATABASE_URL');
  }
  
  try {
    new URL(databaseUrl);
  } catch {
    throw new Error(`Invalid DATABASE_URL syntax: ${databaseUrl}`);
  }

  // 6. PIPELINE_INTERVAL_MS
  const pipelineIntervalRaw = envData.PIPELINE_INTERVAL_MS || '0';
  const pipelineIntervalMs = parseInt(pipelineIntervalRaw, 10);
  if (isNaN(pipelineIntervalMs) || pipelineIntervalMs < 0) {
    throw new Error(`Invalid PIPELINE_INTERVAL_MS: ${pipelineIntervalRaw}`);
  }

  // 7. OLLAMA
  const ollamaBaseUrl = envData.OLLAMA_BASE_URL || 'http://localhost:11434';
  try {
    new URL(ollamaBaseUrl);
  } catch {
    throw new Error(`Invalid OLLAMA_BASE_URL syntax: ${ollamaBaseUrl}`);
  }
  const ollamaModel = envData.OLLAMA_MODEL || 'qwen2.5:3b';

  // 8. TELEGRAM
  const telegramBotToken = envData.TELEGRAM_BOT_TOKEN;
  const telegramChatId = envData.TELEGRAM_CHAT_ID;
  
  if (telegramBotToken && !telegramChatId) {
    throw new Error('TELEGRAM_CHAT_ID must be provided if TELEGRAM_BOT_TOKEN is set');
  }
  if (!telegramBotToken && telegramChatId) {
    throw new Error('TELEGRAM_BOT_TOKEN must be provided if TELEGRAM_CHAT_ID is set');
  }

  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  const logLevelRaw = (envData.LOG_LEVEL || 'info').toLowerCase();
  if (!validLogLevels.includes(logLevelRaw)) {
    throw new Error(`Invalid LOG_LEVEL: ${logLevelRaw}. Allowed values are 'debug', 'info', 'warn', 'error'`);
  }

  const config: Config = {
    env,
    port,
    apiAuthToken,
    corsOrigin,
    databaseUrl,
    testDatabaseUrl: envData.TEST_DATABASE_URL,
    ollamaBaseUrl,
    ollamaModel,
    telegramBotToken,
    telegramChatId,
    pipelineIntervalMs,
    logLevel: logLevelRaw as 'debug' | 'info' | 'warn' | 'error'
  };

  return Object.freeze(config);
}
