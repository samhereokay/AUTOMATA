"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const logger_1 = require("../src/logger");
(0, node_test_1.test)('Logger', async (t) => {
    await t.test('JSON structure and log levels', () => {
        let capturedLog = '';
        const originalConsoleInfo = console.log;
        console.log = (msg) => { capturedLog = msg; };
        try {
            const logger = new logger_1.Logger('info');
            logger.info('Test message', { foo: 'bar' });
            const parsed = JSON.parse(capturedLog);
            strict_1.default.equal(parsed.level, 'info');
            strict_1.default.equal(parsed.message, 'Test message');
            strict_1.default.equal(parsed.foo, 'bar');
            strict_1.default.ok(parsed.timestamp);
            capturedLog = '';
            logger.debug('Debug message'); // Should not log (min level is info)
            strict_1.default.equal(capturedLog, '');
        }
        finally {
            console.log = originalConsoleInfo;
        }
    });
    await t.test('Error logging uses console.error and formats error object', () => {
        let capturedErrorLog = '';
        const originalConsoleError = console.error;
        console.error = (msg) => { capturedErrorLog = msg; };
        try {
            const logger = new logger_1.Logger('info');
            const err = new Error('Something went wrong');
            logger.error('An error occurred', { error: err });
            const parsed = JSON.parse(capturedErrorLog);
            strict_1.default.equal(parsed.level, 'error');
            strict_1.default.equal(parsed.message, 'An error occurred');
            strict_1.default.equal(parsed.error.name, 'Error');
            strict_1.default.equal(parsed.error.message, 'Something went wrong');
            strict_1.default.ok(parsed.error.stack);
        }
        finally {
            console.error = originalConsoleError;
        }
    });
    await t.test('Secret redaction', () => {
        let capturedLog = '';
        const originalConsoleInfo = console.log;
        console.log = (msg) => { capturedLog = msg; };
        try {
            const logger = new logger_1.Logger('info');
            logger.info('Secret test', {
                apiAuthToken: 'secret-token',
                telegramBotToken: 'bot1234',
                databaseUrl: 'postgres://pass@host/db',
                safeKey: 'hello'
            });
            const parsed = JSON.parse(capturedLog);
            strict_1.default.equal(parsed.apiAuthToken, '[REDACTED]');
            strict_1.default.equal(parsed.telegramBotToken, '[REDACTED]');
            strict_1.default.equal(parsed.databaseUrl, '[REDACTED]');
            strict_1.default.equal(parsed.safeKey, 'hello');
        }
        finally {
            console.log = originalConsoleInfo;
        }
    });
    await t.test('Request ID propagation using AsyncLocalStorage', () => {
        let capturedLogs = [];
        const originalConsoleInfo = console.log;
        console.log = (msg) => { capturedLogs.push(msg); };
        try {
            const logger = new logger_1.Logger('info');
            // Inside context
            logger.runWithContext({ requestId: 'req-123' }, () => {
                logger.info('Context log');
            });
            // Outside context
            logger.info('No context log');
            const parsed1 = JSON.parse(capturedLogs[0]);
            strict_1.default.equal(parsed1.requestId, 'req-123');
            const parsed2 = JSON.parse(capturedLogs[1]);
            strict_1.default.equal(parsed2.requestId, undefined);
        }
        finally {
            console.log = originalConsoleInfo;
        }
    });
    await t.test('Config allowlisting restricts full config object logging', () => {
        let capturedLog = '';
        const originalConsoleInfo = console.log;
        console.log = (msg) => { capturedLog = msg; };
        try {
            const logger = new logger_1.Logger('info');
            logger.info('Config test', {
                config: {
                    port: 3000,
                    apiAuthToken: 'supersecret', // Should be dropped entirely, not even redacted (unless allowlisted and then redacted)
                    logLevel: 'debug',
                    unknownField: 'dropped'
                }
            });
            const parsed = JSON.parse(capturedLog);
            strict_1.default.ok(parsed.config);
            strict_1.default.equal(parsed.config.port, 3000);
            strict_1.default.equal(parsed.config.logLevel, 'debug');
            strict_1.default.equal(parsed.config.apiAuthToken, undefined); // Dropped
            strict_1.default.equal(parsed.config.unknownField, undefined); // Dropped
        }
        finally {
            console.log = originalConsoleInfo;
        }
    });
});
//# sourceMappingURL=Logger.test.js.map