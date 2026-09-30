"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const LocalAIProvider_1 = require("../src/LocalAIProvider");
(0, node_test_1.default)('LocalAIProvider', async (t) => {
    function createMockFetch(status, data, delay = 0) {
        return async (url, init) => {
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
            };
        };
    }
    await t.test('✔ Successful local AI response', async () => {
        const mockFetch = createMockFetch(200, {
            choices: [{
                    message: { content: '{"summary": "test", "keyPoints": [], "entities": [], "technologies": [], "tags": [], "severity": "low"}' }
                }]
        });
        const provider = new LocalAIProvider_1.LocalAIProvider({ fetchFn: mockFetch });
        const res = await provider.analyze('Some news item');
        node_assert_1.default.ok(res.includes('"summary": "test"'));
    });
    await t.test('✔ Ollama unavailable (connection refused)', async () => {
        const mockFetch = async () => {
            const err = new Error('connect ECONNREFUSED 127.0.0.1:11434');
            err.cause = { code: 'ECONNREFUSED' };
            throw err;
        };
        const provider = new LocalAIProvider_1.LocalAIProvider({ fetchFn: mockFetch, baseUrl: 'http://127.0.0.1:11434/v1' });
        await node_assert_1.default.rejects(async () => await provider.analyze('test'), /AI Provider unavailable: connection refused to http:\/\/127.0.0.1:11434\/v1/);
    });
    await t.test('✔ HTTP error', async () => {
        const mockFetch = createMockFetch(500, {});
        const provider = new LocalAIProvider_1.LocalAIProvider({ fetchFn: mockFetch });
        await node_assert_1.default.rejects(async () => await provider.analyze('test'), /AI Provider HTTP Error: 500 Error/);
    });
    await t.test('✔ Request timeout', async () => {
        const mockFetch = createMockFetch(200, {}, 100);
        const provider = new LocalAIProvider_1.LocalAIProvider({ fetchFn: mockFetch, timeoutMs: 50 });
        await node_assert_1.default.rejects(async () => await provider.analyze('test'), /AI Provider timeout after 50ms/);
    });
    await t.test('✔ Malformed/non-JSON provider response', async () => {
        const mockFetch = createMockFetch(200, {
            choices: [{ message: {} }] // Missing content
        });
        const provider = new LocalAIProvider_1.LocalAIProvider({ fetchFn: mockFetch });
        await node_assert_1.default.rejects(async () => await provider.analyze('test'), /Empty content in provider response/);
    });
    await t.test('✔ Invalid AI output rejected', async () => {
        // Note: The rejection of invalid JSON happens in AIAnalyzer, not LocalAIProvider.
        // LocalAIProvider only guarantees it gets a string back from choices[0].message.content.
        // We will verify the interaction via a full pipeline or analyzer test shortly.
        const mockFetch = createMockFetch(200, {
            choices: [{ message: { content: 'not valid json' } }]
        });
        const provider = new LocalAIProvider_1.LocalAIProvider({ fetchFn: mockFetch });
        const res = await provider.analyze('test');
        node_assert_1.default.strictEqual(res, 'not valid json');
    });
});
//# sourceMappingURL=LocalAIProvider.test.js.map