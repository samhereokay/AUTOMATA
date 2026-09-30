"use strict";
import test from 'node:test';
import assert from 'node:assert';
import { LocalAIProvider } from '../src/LocalAIProvider';

test('LocalAIProvider', async (t) => {

  function createMockFetch(status: number, data: any, delay: number = 0): typeof fetch {
    return async (url: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        if (init?.signal?.aborted) {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          throw err;
        }
      }
      return {
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        json: async () => data
      } as Response;
    };
  }

  await t.test('✔ Successful local AI response', async () => {
    const mockFetch = createMockFetch(200, {
      choices: [{
        message: { content: '{"summary": "test", "keyPoints": [], "entities": [], "technologies": [], "tags": [], "severity": "low"}' }
      }]
    });
    const provider = new LocalAIProvider({ fetchFn: mockFetch });
    const res = await provider.analyze('Some news item');
    assert.ok(res.includes('"summary": "test"'));
  });

  await t.test('✔ Ollama unavailable (connection refused)', async () => {
    const mockFetch: typeof fetch = async () => {
      const err = new Error('connect ECONNREFUSED 127.0.0.1:11434');
      (err as any).cause = { code: 'ECONNREFUSED' };
      throw err;
    };
    const provider = new LocalAIProvider({ fetchFn: mockFetch, baseUrl: 'http://127.0.0.1:11434/v1' });
    await assert.rejects(
      async () => await provider.analyze('test'),
      /AI Provider unavailable: connection refused to http:\/\/127.0.0.1:11434\/v1/
    );
  });

  await t.test('✔ HTTP error', async () => {
    const mockFetch = createMockFetch(500, {});
    const provider = new LocalAIProvider({ fetchFn: mockFetch });
    await assert.rejects(
      async () => await provider.analyze('test'),
      /AI Provider HTTP Error: 500 Error/
    );
  });

  await t.test('✔ Request timeout', async () => {
    const mockFetch = createMockFetch(200, {}, 100);
    const provider = new LocalAIProvider({ fetchFn: mockFetch, timeoutMs: 50 });
    await assert.rejects(
      async () => await provider.analyze('test'),
      /AI Provider timeout after 50ms/
    );
  });

  await t.test('✔ Malformed/non-JSON provider response', async () => {
    const mockFetch = createMockFetch(200, {
      choices: [{ message: {} }] // Missing content
    });
    const provider = new LocalAIProvider({ fetchFn: mockFetch });
    await assert.rejects(
      async () => await provider.analyze('test'),
      /Empty content in provider response/
    );
  });
  
  await t.test('✔ Invalid AI output rejected', async () => {
    // Note: The rejection of invalid JSON happens in AIAnalyzer, not LocalAIProvider.
    // LocalAIProvider only guarantees it gets a string back from choices[0].message.content.
    // We will verify the interaction via a full pipeline or analyzer test shortly.
    const mockFetch = createMockFetch(200, {
      choices: [{ message: { content: 'not valid json' } }]
    });
    const provider = new LocalAIProvider({ fetchFn: mockFetch });
    const res = await provider.analyze('test');
    assert.strictEqual(res, 'not valid json');
  });

});
