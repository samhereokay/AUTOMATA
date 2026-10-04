"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const http_1 = __importDefault(require("http"));
const HttpTrigger_1 = require("../src/HttpTrigger");
(0, node_test_1.default)('HttpTrigger', async (t) => {
    let trigger;
    let orchestrator; // mock
    let feedService; // mock
    let executionTracker; // mock
    let moduleRegistry; // mock
    const port = 34567;
    const token = 'test-secret';
    t.beforeEach(async () => {
        orchestrator = {
            executePrompt: async () => ({ collected: 10 }),
            isCurrentlyRunning: false,
            startSchedule: () => { },
            stopSchedule: () => { }
        };
        feedService = {
            getLatest: async (options) => ({ items: [], pagination: { limit: options?.limit || 10, offset: options?.offset || 0, total: 0 } }),
            getById: async (id) => id === '123' ? { item: { id: '123' } } : null,
            search: async (query, options) => ({ items: [], pagination: { limit: 10, offset: 0, total: 0 } })
        };
        executionTracker = {
            listExecutions: async () => [{ id: 'exec_123', module: 'cybersecurity-news' }],
            getExecution: async (id) => id === 'exec_123' ? { id: 'exec_123' } : null,
            startExecution: async () => 'exec_abc',
            completeExecution: async () => { },
            failExecution: async () => { }
        };
        moduleRegistry = {
            listModules: () => [{ id: 'cybersecurity-news', status: 'active' }],
            getModule: (id) => id === 'cybersecurity-news' ? { id: 'cybersecurity-news', status: 'active' } : undefined
        };
        trigger = new HttpTrigger_1.HttpTrigger(orchestrator, feedService, {
            port,
            authToken: token
        }, executionTracker, moduleRegistry);
        await trigger.start();
    });
    t.afterEach(async () => {
        await trigger.stop();
    });
    function makeRequest(method, path, headers = {}) {
        return new Promise((resolve) => {
            const req = http_1.default.request({
                hostname: '127.0.0.1',
                port,
                path,
                method,
                headers,
                agent: false // disable keep-alive to prevent ECONNRESET between tests
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({
                    status: res.statusCode || 500,
                    data: JSON.parse(body || '{}')
                }));
            });
            req.on('error', (err) => resolve({ status: 500, data: { error: err.message } }));
            req.end();
        });
    }
    await t.test('✔ GET request is rejected with 404', async () => {
        const res = await makeRequest('GET', '/api/news/run');
        node_assert_1.default.strictEqual(res.status, 404);
    });
    await t.test('✔ Missing auth token is rejected with 401', async () => {
        const res = await makeRequest('POST', '/api/news/run');
        node_assert_1.default.strictEqual(res.status, 401);
    });
    await t.test('✔ Invalid auth token is rejected with 401', async () => {
        const res = await makeRequest('POST', '/api/news/run', {
            'Authorization': 'Bearer wrong-token'
        });
        node_assert_1.default.strictEqual(res.status, 401);
    });
    await t.test('✔ Valid trigger executes pipeline and returns structured result', async () => {
        const res = await makeRequest('POST', '/api/news/run', {
            'Authorization': `Bearer ${token}`
        });
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.strictEqual(res.data.success, true);
        node_assert_1.default.strictEqual(res.data.result.collected, 10);
    });
    await t.test('✔ Overlapping run returns 409 conflict', async () => {
        // Make the mock orchestrator return null to simulate overlap
        orchestrator.executePrompt = async () => null;
        const res = await makeRequest('POST', '/api/news/run', {
            'Authorization': `Bearer ${token}`
        });
        node_assert_1.default.strictEqual(res.status, 409);
        node_assert_1.default.strictEqual(res.data.error, 'Pipeline is already running');
    });
    await t.test('✔ Pipeline failure returns 500 with structured error', async () => {
        // Make the mock orchestrator throw
        orchestrator.executePrompt = async () => { throw new Error('Database down'); };
        const res = await makeRequest('POST', '/api/news/run', {
            'Authorization': `Bearer ${token}`
        });
        node_assert_1.default.strictEqual(res.status, 500);
        node_assert_1.default.strictEqual(res.data.error, 'Internal server error');
    });
    await t.test('✔ GET /api/news returns paginated news (public access)', async () => {
        feedService.getLatest = async (options) => {
            node_assert_1.default.strictEqual(options.limit, undefined);
            node_assert_1.default.strictEqual(options.offset, undefined);
            return { items: [{ id: '1' }], pagination: { limit: 10, offset: 0, total: 1 } };
        };
        const res = await makeRequest('GET', '/api/news');
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.deepStrictEqual(res.data.items, [{ id: '1' }]);
    });
    await t.test('✔ GET /api/news/:id returns item', async () => {
        const res = await makeRequest('GET', '/api/news/123');
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.deepStrictEqual(res.data.item, { id: '123' });
    });
    await t.test('✔ GET /api/news/:id returns 404 when absent', async () => {
        const res = await makeRequest('GET', '/api/news/999');
        node_assert_1.default.strictEqual(res.status, 404);
        node_assert_1.default.strictEqual(res.data.error, 'Item not found');
    });
    await t.test('✔ GET /api/news?category=cybersecurity filters correctly', async () => {
        let passedOptions;
        feedService.getLatest = async (options) => {
            passedOptions = options;
            return { items: [], pagination: { limit: 10, offset: 0, total: 0 } };
        };
        const res = await makeRequest('GET', '/api/news?category=cybersecurity');
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.strictEqual(passedOptions.category, 'cybersecurity');
    });
    await t.test('✔ GET /api/news?severity=high filters correctly', async () => {
        let passedOptions;
        feedService.getLatest = async (options) => {
            passedOptions = options;
            return { items: [], pagination: { limit: 10, offset: 0, total: 0 } };
        };
        const res = await makeRequest('GET', '/api/news?severity=high');
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.strictEqual(passedOptions.severity, 'high');
    });
    await t.test('✔ GET /api/news/search?query=... searches correctly', async () => {
        let passedQuery = '';
        feedService.search = async (query, options) => {
            passedQuery = query;
            return { items: [], pagination: { limit: 10, offset: 0, total: 0 } };
        };
        const res = await makeRequest('GET', '/api/news/search?query=bitcoin');
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.strictEqual(passedQuery, 'bitcoin');
    });
    await t.test('✔ GET /api/news/search returns 400 if query is missing', async () => {
        const res = await makeRequest('GET', '/api/news/search');
        node_assert_1.default.strictEqual(res.status, 400);
        node_assert_1.default.strictEqual(res.data.error, 'Missing query parameter');
    });
    await t.test('✔ GET /api/news?page=2 pagination deterministic', async () => {
        let passedOptions;
        feedService.getLatest = async (options) => {
            passedOptions = options;
            return { items: [], pagination: { limit: 10, offset: 10, total: 20 } };
        };
        const res = await makeRequest('GET', '/api/news?page=2');
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.strictEqual(passedOptions.offset, 10);
    });
    await t.test('✔ GET /api/news?limit=invalid returns 400', async () => {
        const res = await makeRequest('GET', '/api/news?limit=invalid');
        node_assert_1.default.strictEqual(res.status, 400);
        node_assert_1.default.strictEqual(res.data.error, 'Invalid limit parameter');
    });
    await t.test('✔ OPTIONS /api/news returns CORS headers', async () => {
        const req = http_1.default.request({
            hostname: '127.0.0.1',
            port,
            path: '/api/news',
            method: 'OPTIONS',
            agent: false
        });
        const res = await new Promise((resolve) => {
            req.on('response', resolve);
            req.end();
        });
        node_assert_1.default.strictEqual(res.statusCode, 204);
        node_assert_1.default.strictEqual(res.headers['access-control-allow-origin'], '*');
    });
    await t.test('✔ GET /api/modules returns modules', async () => {
        const res = await makeRequest('GET', '/api/modules');
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.deepStrictEqual(res.data.modules, [{ id: 'cybersecurity-news', status: 'active' }]);
    });
    await t.test('✔ GET /api/modules/:id returns specific module', async () => {
        const res = await makeRequest('GET', '/api/modules/cybersecurity-news');
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.strictEqual(res.data.id, 'cybersecurity-news');
    });
    await t.test('✔ GET /api/executions requires auth', async () => {
        const res = await makeRequest('GET', '/api/executions');
        node_assert_1.default.strictEqual(res.status, 401);
    });
    await t.test('✔ GET /api/executions returns executions list', async () => {
        const res = await makeRequest('GET', '/api/executions', { 'Authorization': `Bearer ${token}` });
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.deepStrictEqual(res.data.executions, [{ id: 'exec_123', module: 'cybersecurity-news' }]);
    });
    await t.test('✔ GET /api/executions/:id returns execution details', async () => {
        const res = await makeRequest('GET', '/api/executions/exec_123', { 'Authorization': `Bearer ${token}` });
        node_assert_1.default.strictEqual(res.status, 200);
        node_assert_1.default.strictEqual(res.data.id, 'exec_123');
    });
    await t.test('✔ POST /api/executions executes module', async () => {
        const res = await makeRequest('POST', '/api/executions', { 'Authorization': `Bearer ${token}` });
        node_assert_1.default.strictEqual(res.status, 201);
        node_assert_1.default.strictEqual(res.data.status, 'success');
        node_assert_1.default.strictEqual(res.data.module, 'cybersecurity-news');
    });
});
//# sourceMappingURL=HttpTrigger.test.js.map