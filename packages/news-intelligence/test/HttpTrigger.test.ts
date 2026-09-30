"use strict";
import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { HttpTrigger } from '../src/HttpTrigger';
import { PipelineOrchestrator } from '../src/PipelineOrchestrator';

test('HttpTrigger', async (t) => {
  let trigger: HttpTrigger;
  let orchestrator: any; // mock
  let feedService: any; // mock
  const port = 34567;
  const token = 'test-secret';

  t.beforeEach(async () => {
    orchestrator = {
      run: async () => ({ collected: 10 }),
      isCurrentlyRunning: false,
      startSchedule: () => {},
      stopSchedule: () => {}
    };

    feedService = {
      getLatest: async (options: any) => ({ items: [], pagination: { limit: options?.limit || 10, offset: options?.offset || 0, total: 0 } }),
      getById: async (id: string) => id === '123' ? { item: { id: '123' } } : null,
      search: async (query: string, options: any) => ({ items: [], pagination: { limit: 10, offset: 0, total: 0 } })
    };
    
    trigger = new HttpTrigger(orchestrator as unknown as PipelineOrchestrator, feedService, {
      port,
      authToken: token
    });
    await trigger.start();
  });

  t.afterEach(async () => {
    await trigger.stop();
  });

  function makeRequest(method: string, path: string, headers: any = {}): Promise<{status: number, data: any}> {
    return new Promise((resolve) => {
      const req = http.request({
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
    assert.strictEqual(res.status, 404);
  });

  await t.test('✔ Missing auth token is rejected with 401', async () => {
    const res = await makeRequest('POST', '/api/news/run');
    assert.strictEqual(res.status, 401);
  });

  await t.test('✔ Invalid auth token is rejected with 401', async () => {
    const res = await makeRequest('POST', '/api/news/run', {
      'Authorization': 'Bearer wrong-token'
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test('✔ Valid trigger executes pipeline and returns structured result', async () => {
    const res = await makeRequest('POST', '/api/news/run', {
      'Authorization': `Bearer ${token}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.result.collected, 10);
  });

  await t.test('✔ Overlapping run returns 409 conflict', async () => {
    // Make the mock orchestrator return null to simulate overlap
    orchestrator.run = async () => null;

    const res = await makeRequest('POST', '/api/news/run', {
      'Authorization': `Bearer ${token}`
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.data.error, 'Pipeline is already running');
  });

  await t.test('✔ Pipeline failure returns 500 with structured error', async () => {
    // Make the mock orchestrator throw
    orchestrator.run = async () => { throw new Error('Database down'); };

    const res = await makeRequest('POST', '/api/news/run', {
      'Authorization': `Bearer ${token}`
    });
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.data.error, 'Internal server error');
  });

  await t.test('✔ GET /api/news returns paginated news (public access)', async () => {
    feedService.getLatest = async (options: any) => {
      assert.strictEqual(options.limit, undefined);
      assert.strictEqual(options.offset, undefined);
      return { items: [{ id: '1' }], pagination: { limit: 10, offset: 0, total: 1 } };
    };
    const res = await makeRequest('GET', '/api/news');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.data.items, [{ id: '1' }]);
  });

  await t.test('✔ GET /api/news/:id returns item', async () => {
    const res = await makeRequest('GET', '/api/news/123');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.data.item, { id: '123' });
  });

  await t.test('✔ GET /api/news/:id returns 404 when absent', async () => {
    const res = await makeRequest('GET', '/api/news/999');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.error, 'Item not found');
  });

  await t.test('✔ GET /api/news?category=cybersecurity filters correctly', async () => {
    let passedOptions: any;
    feedService.getLatest = async (options: any) => {
      passedOptions = options;
      return { items: [], pagination: { limit: 10, offset: 0, total: 0 } };
    };
    const res = await makeRequest('GET', '/api/news?category=cybersecurity');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(passedOptions.category, 'cybersecurity');
  });

  await t.test('✔ GET /api/news?severity=high filters correctly', async () => {
    let passedOptions: any;
    feedService.getLatest = async (options: any) => {
      passedOptions = options;
      return { items: [], pagination: { limit: 10, offset: 0, total: 0 } };
    };
    const res = await makeRequest('GET', '/api/news?severity=high');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(passedOptions.severity, 'high');
  });

  await t.test('✔ GET /api/news/search?query=... searches correctly', async () => {
    let passedQuery: string = '';
    feedService.search = async (query: string, options: any) => {
      passedQuery = query;
      return { items: [], pagination: { limit: 10, offset: 0, total: 0 } };
    };
    const res = await makeRequest('GET', '/api/news/search?query=bitcoin');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(passedQuery, 'bitcoin');
  });

  await t.test('✔ GET /api/news/search returns 400 if query is missing', async () => {
    const res = await makeRequest('GET', '/api/news/search');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error, 'Missing query parameter');
  });

  await t.test('✔ GET /api/news?page=2 pagination deterministic', async () => {
    let passedOptions: any;
    feedService.getLatest = async (options: any) => {
      passedOptions = options;
      return { items: [], pagination: { limit: 10, offset: 10, total: 20 } };
    };
    const res = await makeRequest('GET', '/api/news?page=2');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(passedOptions.offset, 10);
  });

  await t.test('✔ GET /api/news?limit=invalid returns 400', async () => {
    const res = await makeRequest('GET', '/api/news?limit=invalid');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error, 'Invalid limit parameter');
  });

  await t.test('✔ OPTIONS /api/news returns CORS headers', async () => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/news',
      method: 'OPTIONS',
      agent: false
    });
    const res = await new Promise<http.IncomingMessage>((resolve) => {
      req.on('response', resolve);
      req.end();
    });
    assert.strictEqual(res.statusCode, 204);
    assert.strictEqual(res.headers['access-control-allow-origin'], '*');
  });

});
