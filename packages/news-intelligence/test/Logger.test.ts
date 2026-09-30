import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Logger } from '../src/logger';
import { AsyncLocalStorage } from 'async_hooks';

test('Logger', async (t) => {
  await t.test('JSON structure and log levels', () => {
    let capturedLog = '';
    const originalConsoleInfo = console.log;
    console.log = (msg) => { capturedLog = msg; };

    try {
      const logger = new Logger('info');
      logger.info('Test message', { foo: 'bar' });
      
      const parsed = JSON.parse(capturedLog);
      assert.equal(parsed.level, 'info');
      assert.equal(parsed.message, 'Test message');
      assert.equal(parsed.foo, 'bar');
      assert.ok(parsed.timestamp);

      capturedLog = '';
      logger.debug('Debug message'); // Should not log (min level is info)
      assert.equal(capturedLog, '');
    } finally {
      console.log = originalConsoleInfo;
    }
  });

  await t.test('Error logging uses console.error and formats error object', () => {
    let capturedErrorLog = '';
    const originalConsoleError = console.error;
    console.error = (msg) => { capturedErrorLog = msg; };

    try {
      const logger = new Logger('info');
      const err = new Error('Something went wrong');
      logger.error('An error occurred', { error: err });
      
      const parsed = JSON.parse(capturedErrorLog);
      assert.equal(parsed.level, 'error');
      assert.equal(parsed.message, 'An error occurred');
      assert.equal(parsed.error.name, 'Error');
      assert.equal(parsed.error.message, 'Something went wrong');
      assert.ok(parsed.error.stack);
    } finally {
      console.error = originalConsoleError;
    }
  });

  await t.test('Secret redaction', () => {
    let capturedLog = '';
    const originalConsoleInfo = console.log;
    console.log = (msg) => { capturedLog = msg; };

    try {
      const logger = new Logger('info');
      logger.info('Secret test', {
        apiAuthToken: 'secret-token',
        telegramBotToken: 'bot1234',
        databaseUrl: 'postgres://pass@host/db',
        safeKey: 'hello'
      });
      
      const parsed = JSON.parse(capturedLog);
      assert.equal(parsed.apiAuthToken, '[REDACTED]');
      assert.equal(parsed.telegramBotToken, '[REDACTED]');
      assert.equal(parsed.databaseUrl, '[REDACTED]');
      assert.equal(parsed.safeKey, 'hello');
    } finally {
      console.log = originalConsoleInfo;
    }
  });

  await t.test('Request ID propagation using AsyncLocalStorage', () => {
    let capturedLogs: string[] = [];
    const originalConsoleInfo = console.log;
    console.log = (msg) => { capturedLogs.push(msg); };

    try {
      const logger = new Logger('info');
      
      // Inside context
      logger.runWithContext({ requestId: 'req-123' }, () => {
        logger.info('Context log');
      });
      
      // Outside context
      logger.info('No context log');

      const parsed1 = JSON.parse(capturedLogs[0]);
      assert.equal(parsed1.requestId, 'req-123');

      const parsed2 = JSON.parse(capturedLogs[1]);
      assert.equal(parsed2.requestId, undefined);
    } finally {
      console.log = originalConsoleInfo;
    }
  });

  await t.test('Config allowlisting restricts full config object logging', () => {
    let capturedLog = '';
    const originalConsoleInfo = console.log;
    console.log = (msg) => { capturedLog = msg; };

    try {
      const logger = new Logger('info');
      logger.info('Config test', {
        config: {
          port: 3000,
          apiAuthToken: 'supersecret', // Should be dropped entirely, not even redacted (unless allowlisted and then redacted)
          logLevel: 'debug',
          unknownField: 'dropped'
        }
      });
      
      const parsed = JSON.parse(capturedLog);
      assert.ok(parsed.config);
      assert.equal(parsed.config.port, 3000);
      assert.equal(parsed.config.logLevel, 'debug');
      assert.equal(parsed.config.apiAuthToken, undefined); // Dropped
      assert.equal(parsed.config.unknownField, undefined); // Dropped
    } finally {
      console.log = originalConsoleInfo;
    }
  });
});
