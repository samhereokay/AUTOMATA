"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const config_1 = require("../src/config");
(0, node_test_1.default)('Configuration validation', async (t) => {
    const baseValidEnv = {
        DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
        API_AUTH_TOKEN: 'secret-token'
    };
    await t.test('✔ valid development config', () => {
        const config = (0, config_1.loadConfig)(baseValidEnv);
        node_assert_1.default.strictEqual(config.env, 'development');
        node_assert_1.default.strictEqual(config.port, 3000);
        node_assert_1.default.strictEqual(config.databaseUrl, baseValidEnv.DATABASE_URL);
        node_assert_1.default.strictEqual(config.apiAuthToken, baseValidEnv.API_AUTH_TOKEN);
        node_assert_1.default.strictEqual(config.corsOrigin, '*');
        node_assert_1.default.strictEqual(config.ollamaBaseUrl, 'http://localhost:11434');
        node_assert_1.default.strictEqual(config.ollamaModel, 'qwen2.5:3b');
        node_assert_1.default.strictEqual(config.pipelineIntervalMs, 0);
    });
    await t.test('✔ missing DATABASE_URL', () => {
        const env = { ...baseValidEnv, DATABASE_URL: '' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env), /DATABASE_URL is required and cannot be empty/);
    });
    await t.test('✔ missing API_AUTH_TOKEN', () => {
        const env = { ...baseValidEnv, API_AUTH_TOKEN: '   ' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env), /API_AUTH_TOKEN is required and cannot be empty/);
    });
    await t.test('✔ invalid PORT', () => {
        const env = { ...baseValidEnv, PORT: 'abc' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env), /Invalid PORT: abc/);
        const env2 = { ...baseValidEnv, PORT: '-10' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env2), /Invalid PORT: -10/);
    });
    await t.test('✔ invalid NODE_ENV', () => {
        const env = { ...baseValidEnv, NODE_ENV: 'staging' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env), /Invalid NODE_ENV: staging/);
    });
    await t.test('✔ malformed DATABASE_URL', () => {
        const env = { ...baseValidEnv, DATABASE_URL: 'not-a-url' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env), /Invalid DATABASE_URL syntax: not-a-url/);
    });
    await t.test('✔ Telegram both absent', () => {
        const config = (0, config_1.loadConfig)(baseValidEnv);
        node_assert_1.default.strictEqual(config.telegramBotToken, undefined);
        node_assert_1.default.strictEqual(config.telegramChatId, undefined);
    });
    await t.test('✔ Telegram both present', () => {
        const env = { ...baseValidEnv, TELEGRAM_BOT_TOKEN: 'token123', TELEGRAM_CHAT_ID: 'chat123' };
        const config = (0, config_1.loadConfig)(env);
        node_assert_1.default.strictEqual(config.telegramBotToken, 'token123');
        node_assert_1.default.strictEqual(config.telegramChatId, 'chat123');
    });
    await t.test('✔ Telegram only token -> rejected', () => {
        const env1 = { ...baseValidEnv, TELEGRAM_BOT_TOKEN: 'token123' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env1), /TELEGRAM_CHAT_ID must be provided if TELEGRAM_BOT_TOKEN is set/);
        const env2 = { ...baseValidEnv, TELEGRAM_CHAT_ID: 'chat123' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env2), /TELEGRAM_BOT_TOKEN must be provided if TELEGRAM_CHAT_ID is set/);
    });
    await t.test('✔ production + CORS * -> rejected', () => {
        const env = { ...baseValidEnv, NODE_ENV: 'production', CORS_ORIGIN: '*' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env), /CORS_ORIGIN cannot be "\*" in production environment/);
        const env2 = { ...baseValidEnv, NODE_ENV: 'production' }; // Defaults to *
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env2), /CORS_ORIGIN cannot be "\*" in production environment/);
    });
    await t.test('✔ production + explicit CORS -> accepted', () => {
        const env = { ...baseValidEnv, NODE_ENV: 'production', CORS_ORIGIN: 'https://example.com' };
        const config = (0, config_1.loadConfig)(env);
        node_assert_1.default.strictEqual(config.corsOrigin, 'https://example.com');
    });
    await t.test('✔ scheduler disabled with 0', () => {
        const env = { ...baseValidEnv, PIPELINE_INTERVAL_MS: '0' };
        const config = (0, config_1.loadConfig)(env);
        node_assert_1.default.strictEqual(config.pipelineIntervalMs, 0);
    });
    await t.test('✔ invalid scheduler interval -> rejected', () => {
        const env = { ...baseValidEnv, PIPELINE_INTERVAL_MS: 'abc' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env), /Invalid PIPELINE_INTERVAL_MS: abc/);
        const env2 = { ...baseValidEnv, PIPELINE_INTERVAL_MS: '-500' };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env2), /Invalid PIPELINE_INTERVAL_MS: -500/);
    });
    await t.test('✔ configured Ollama model is preserved exactly', () => {
        const env = { ...baseValidEnv, OLLAMA_MODEL: 'custom-model:latest' };
        const config = (0, config_1.loadConfig)(env);
        node_assert_1.default.strictEqual(config.ollamaModel, 'custom-model:latest');
    });
    await t.test('✔ cannot use TEST_DATABASE_URL as DATABASE_URL', () => {
        const env = {
            ...baseValidEnv,
            DATABASE_URL: 'postgres://automata_test',
            TEST_DATABASE_URL: 'postgres://automata_test'
        };
        node_assert_1.default.throws(() => (0, config_1.loadConfig)(env), /DATABASE_URL cannot be the same as TEST_DATABASE_URL/);
    });
});
//# sourceMappingURL=config.test.js.map