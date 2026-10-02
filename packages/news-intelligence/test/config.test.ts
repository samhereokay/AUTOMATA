import test from 'node:test';
import assert from 'node:assert';
import { loadConfig } from '../src/config';

test('Configuration validation', async (t) => {
  const baseValidEnv = {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    API_AUTH_TOKEN: 'secret-token'
  };

  await t.test('✔ valid development config', () => {
    const config = loadConfig(baseValidEnv as any);
    assert.strictEqual(config.env, 'development');
    assert.strictEqual(config.port, 3000);
    assert.strictEqual(config.databaseUrl, baseValidEnv.DATABASE_URL);
    assert.strictEqual(config.apiAuthToken, baseValidEnv.API_AUTH_TOKEN);
    assert.strictEqual(config.corsOrigin, '*');
    assert.strictEqual(config.ollamaBaseUrl, 'http://localhost:11434');
    assert.strictEqual(config.ollamaModel, 'qwen2.5:3b');
    assert.strictEqual(config.pipelineIntervalMs, 0);
  });

  await t.test('✔ missing DATABASE_URL', () => {
    const env = { ...baseValidEnv, DATABASE_URL: '' };
    assert.throws(() => loadConfig(env as any), /DATABASE_URL is required and cannot be empty/);
  });

  await t.test('✔ missing API_AUTH_TOKEN', () => {
    const env = { ...baseValidEnv, API_AUTH_TOKEN: '   ' };
    assert.throws(() => loadConfig(env as any), /API_AUTH_TOKEN is required and cannot be empty/);
  });

  await t.test('✔ invalid PORT', () => {
    const env = { ...baseValidEnv, PORT: 'abc' };
    assert.throws(() => loadConfig(env as any), /Invalid PORT: abc/);
    
    const env2 = { ...baseValidEnv, PORT: '-10' };
    assert.throws(() => loadConfig(env2 as any), /Invalid PORT: -10/);
  });

  await t.test('✔ invalid NODE_ENV', () => {
    const env = { ...baseValidEnv, NODE_ENV: 'staging' };
    assert.throws(() => loadConfig(env as any), /Invalid NODE_ENV: staging/);
  });

  await t.test('✔ malformed DATABASE_URL', () => {
    const env = { ...baseValidEnv, DATABASE_URL: 'not-a-url' };
    assert.throws(() => loadConfig(env as any), /Invalid DATABASE_URL syntax: not-a-url/);
  });

  await t.test('✔ Telegram both absent', () => {
    const config = loadConfig(baseValidEnv as any);
    assert.strictEqual(config.telegramBotToken, undefined);
    assert.strictEqual(config.telegramChatId, undefined);
  });

  await t.test('✔ Telegram both present', () => {
    const env = { ...baseValidEnv, TELEGRAM_BOT_TOKEN: 'token123', TELEGRAM_CHAT_ID: 'chat123' };
    const config = loadConfig(env as any);
    assert.strictEqual(config.telegramBotToken, 'token123');
    assert.strictEqual(config.telegramChatId, 'chat123');
  });

  await t.test('✔ Telegram only token -> rejected', () => {
    const env1 = { ...baseValidEnv, TELEGRAM_BOT_TOKEN: 'token123' };
    assert.throws(() => loadConfig(env1 as any), /TELEGRAM_CHAT_ID must be provided if TELEGRAM_BOT_TOKEN is set/);
    
    const env2 = { ...baseValidEnv, TELEGRAM_CHAT_ID: 'chat123' };
    assert.throws(() => loadConfig(env2 as any), /TELEGRAM_BOT_TOKEN must be provided if TELEGRAM_CHAT_ID is set/);
  });

  await t.test('✔ production + CORS * -> rejected', () => {
    const env = { ...baseValidEnv, NODE_ENV: 'production', CORS_ORIGIN: '*' };
    assert.throws(() => loadConfig(env as any), /CORS_ORIGIN cannot be "\*" in production environment/);
    
    const env2 = { ...baseValidEnv, NODE_ENV: 'production' }; // Defaults to *
    assert.throws(() => loadConfig(env2 as any), /CORS_ORIGIN cannot be "\*" in production environment/);
  });

  await t.test('✔ production + explicit CORS -> accepted', () => {
    const env = { ...baseValidEnv, NODE_ENV: 'production', CORS_ORIGIN: 'https://example.com' };
    const config = loadConfig(env as any);
    assert.strictEqual(config.corsOrigin, 'https://example.com');
  });

  await t.test('✔ scheduler disabled with 0', () => {
    const env = { ...baseValidEnv, PIPELINE_INTERVAL_MS: '0' };
    const config = loadConfig(env as any);
    assert.strictEqual(config.pipelineIntervalMs, 0);
  });

  await t.test('✔ invalid scheduler interval -> rejected', () => {
    const env = { ...baseValidEnv, PIPELINE_INTERVAL_MS: 'abc' };
    assert.throws(() => loadConfig(env as any), /Invalid PIPELINE_INTERVAL_MS: abc/);
    
    const env2 = { ...baseValidEnv, PIPELINE_INTERVAL_MS: '-500' };
    assert.throws(() => loadConfig(env2 as any), /Invalid PIPELINE_INTERVAL_MS: -500/);
  });

  await t.test('✔ configured Ollama model is preserved exactly', () => {
    const env = { ...baseValidEnv, OLLAMA_MODEL: 'custom-model:latest' };
    const config = loadConfig(env as any);
    assert.strictEqual(config.ollamaModel, 'custom-model:latest');
  });
  
  await t.test('✔ cannot use TEST_DATABASE_URL as DATABASE_URL', () => {
    const env = { 
      ...baseValidEnv, 
      DATABASE_URL: 'postgres://automata_test',
      TEST_DATABASE_URL: 'postgres://automata_test'
    };
    assert.throws(() => loadConfig(env as any), /DATABASE_URL cannot be the same as TEST_DATABASE_URL/);
  });
});
