import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { NewsPipeline } from '../src/NewsPipeline';
import { Deduplicator } from '../src/Deduplicator';
import { EvidenceValidator } from '../src/EvidenceValidator';
import { AIAnalyzer } from '../src/AIAnalyzer';
import { PostgresNewsRepository } from '../src/persistence/PostgresNewsRepository';
import { PostgresNotificationStateRepository } from '../src/persistence/PostgresNotificationStateRepository';
import { TelegramService } from '../src/TelegramService';
import { PipelineOrchestrator } from '../src/PipelineOrchestrator';
import { HttpTrigger } from '../src/HttpTrigger';
import { FeedService } from '../src/FeedService';
import { renderFeedItem, renderStoryDetail } from '../../../apps/website/app.js';
import { runMigrations } from '../src/persistence/migrate';

// Mocks
class MockCollector {
  id: string;
  items: any[];
  constructor(id: string, items: any[]) {
    this.id = id;
    this.items = items;
  }
  async collect() { return this.items; }
}

class MockAIProvider {
  public shouldFail = false;
  async analyze(content: string) {
    if (this.shouldFail) throw new Error('Ollama connection refused');
    return JSON.stringify({
      summary: 'Mock Summary',
      keyPoints: ['Point 1'],
      entities: ['Mock Entity'],
      technologies: ['Mock Tech'],
      tags: ['mock-tag'],
      severity: 'high'
    });
  }
}

class MockTelegramProvider {
  public messages: { chatId: string, message: string }[] = [];
  public shouldFail = false;
  async sendMessage(chatId: string, message: string) {
    if (this.shouldFail) throw new Error('Telegram API Error');
    this.messages.push({ chatId, message });
  }
}

function makeRequest(port: number, method: string, path: string, headers: any = {}): Promise<{status: number, data: any}> {
  return new Promise((resolve) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers, agent: false }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 500, data: JSON.parse(body || '{}') }));
    });
    req.on('error', (err) => resolve({ status: 500, data: { error: err.message } }));
    req.end();
  });
}

test('Production E2E Verification', async (t) => {
  const dbUrl = process.env.TEST_DATABASE_URL;
  if (!dbUrl) {
    throw new Error('TEST_DATABASE_URL is required for Production E2E tests');
  }

  // Generate unique test IDs for isolation
  const runId = Date.now().toString();
  
  let newsRepo: PostgresNewsRepository;
  let stateRepo: PostgresNotificationStateRepository;
  let aiProvider: MockAIProvider;
  let telegramProvider: MockTelegramProvider;
  let trigger: HttpTrigger;
  let orchestrator: PipelineOrchestrator;
  let feedService: FeedService;
  
  const port = 34568;
  const token = 'e2e-secret-token';

  t.beforeEach(async () => {
    await runMigrations(dbUrl);
    newsRepo = new PostgresNewsRepository(dbUrl);
    stateRepo = new PostgresNotificationStateRepository(dbUrl);
    await newsRepo.initialize();
    await stateRepo.initialize();

    aiProvider = new MockAIProvider();
    telegramProvider = new MockTelegramProvider();
    const telegramService = new TelegramService(telegramProvider, stateRepo, 'mock-chat-id');
    
    // We'll set the collector list per test
    const pipeline = new NewsPipeline(
      [],
      new Deduplicator(),
      new EvidenceValidator(),
      new AIAnalyzer(aiProvider),
      newsRepo,
      telegramService
    );

    orchestrator = new PipelineOrchestrator(pipeline);
    feedService = new FeedService(newsRepo);
    trigger = new HttpTrigger(orchestrator, feedService, { port, authToken: token });
    await trigger.start();
  });

  t.afterEach(async () => {
    await trigger.stop();
    await newsRepo.close();
    await stateRepo.close();
  });

  await t.test('1. Happy path, 2. Duplicate sources, 7. API, 8. Website rendering', async () => {
    // Inject mock collector directly to pipeline
    const pipeline = (orchestrator as any).pipeline;
    pipeline.collectors = [
      new MockCollector('source-a', [{
        id: `happy-1-${runId}`, title: `E2E Happy Path ${runId}`, source: 'Source A', url: 'http://test/happy', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
      }]),
      new MockCollector('source-b', [{
        id: `happy-2-${runId}`, title: `E2E Happy Path ${runId}`, source: 'Source B', url: 'http://test/happy', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
      }])
    ];

    // Trigger run (Security - valid token)
    const runRes = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
    assert.strictEqual(runRes.status, 200);
    assert.strictEqual(runRes.data.success, true);
    
    // 2. Duplicate sources merged
    const runStats = runRes.data.result;
    if (runStats.failures.length > 0) console.error('Test 1 Failures:', runStats.failures.map((e: any) => e.message || e));
    assert.strictEqual(runStats.collected, 2, 'Collected 2 items');
    assert.strictEqual(runStats.deduplicated, 1, 'Deduplicated to 1 canonical item');
    assert.strictEqual(runStats.validated, 1, '1 valid item');
    assert.strictEqual(runStats.persisted, 1, '1 persisted');

    // 1. Happy path Telegram
    assert.strictEqual(telegramProvider.messages.length, 1);
    assert.ok(telegramProvider.messages[0].message.includes('E2E Happy Path'));

    // 7. API Verification (List)
    const listRes = await makeRequest(port, 'GET', '/api/news');
    assert.strictEqual(listRes.status, 200);
    const apiItem = listRes.data.items.find((i: any) => i.item.title.includes(runId));
    assert.ok(apiItem, 'Item exists in API list');
    assert.strictEqual(apiItem.item.relatedSources.length, 2, 'API exposes related sources');

    // 7. API Verification (Detail)
    const detailRes = await makeRequest(port, 'GET', `/api/news/${apiItem.item.id}`);
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.data.item.id, apiItem.item.id);

    // 7. API Verification (Search)
    const searchRes = await makeRequest(port, 'GET', `/api/news/search?query=${runId}`);
    assert.strictEqual(searchRes.status, 200);
    assert.ok(searchRes.data.items.length > 0);

    // 8. Website rendering
    const htmlFeed = renderFeedItem(apiItem);
    assert.ok(htmlFeed.includes(runId));
    assert.ok(htmlFeed.includes('severity-high'));
    assert.ok(htmlFeed.includes('Mock Summary'));

    const htmlDetail = renderStoryDetail(apiItem);
    assert.ok(htmlDetail.includes(runId));
    assert.ok(htmlDetail.includes('Source A'));
    assert.ok(htmlDetail.includes('Source B'), 'Related source renders in frontend');
  });

  await t.test('3. Invalid evidence', async () => {
    const pipeline = (orchestrator as any).pipeline;
    pipeline.collectors = [
      new MockCollector('source-a', [{
        id: `invalid-${runId}`, title: `Invalid ${runId}`, source: 'Source A', url: 'not-a-url', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
      }])
    ];

    const runRes = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
    assert.strictEqual(runRes.data.result.collected, 1);
    assert.strictEqual(runRes.data.result.validated, 0);

    assert.strictEqual(telegramProvider.messages.length, 0);

    const listRes = await makeRequest(port, 'GET', '/api/news');
    const item = listRes.data.items.find((i: any) => i.item.title.includes(`Invalid ${runId}`));
    assert.ok(!item, 'Invalid item should not be in API');
  });

  await t.test('4. AI failure', async () => {
    aiProvider.shouldFail = true;
    const pipeline = (orchestrator as any).pipeline;
    pipeline.collectors = [
      new MockCollector('source-a', [{
        id: `ai-fail-${runId}`, title: `AI Fail ${runId}`, source: 'Source A', url: 'http://test/ai', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
      }])
    ];

    const runRes = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
    if (runRes.data.result.failures.length > 0) console.error('Test 4 Failures:', runRes.data.result.failures.map((e: any) => e.message || e));
    assert.strictEqual(runRes.data.result.analyzed, 0);
    assert.strictEqual(runRes.data.result.persisted, 1, 'Validated story persists even if AI fails');

    assert.strictEqual(telegramProvider.messages.length, 1, 'Graceful degradation: still notifies');
    assert.ok(telegramProvider.messages[0].message.includes('No AI analysis available'));

    const listRes = await makeRequest(port, 'GET', '/api/news');
    const item = listRes.data.items.find((i: any) => i.item.title.includes(`AI Fail ${runId}`));
    assert.ok(item, 'Item exists in API');
    assert.ok(!item.analysis, 'No AI analysis attached');
  });

  await t.test('5. Telegram failure', async () => {
    telegramProvider.shouldFail = true;
    const pipeline = (orchestrator as any).pipeline;
    pipeline.collectors = [
      new MockCollector('source-a', [{
        id: `tg-fail-${runId}`, title: `TG Fail ${runId}`, source: 'Source A', url: 'http://test/tg', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
      }])
    ];

    const runRes = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
    if (runRes.data.result.failures.length > 0) console.error('Test 5 Failures:', runRes.data.result.failures.map((e: any) => e.message || e));
    assert.strictEqual(runRes.data.result.persisted, 1);
    
    const listRes = await makeRequest(port, 'GET', '/api/news');
    const item = listRes.data.items.find((i: any) => i.item.title.includes(`TG Fail ${runId}`));
    assert.ok(item, 'Item persists and appears in API despite TG failure');
  });

  await t.test('6. Notification durability', async () => {
    const pipeline = (orchestrator as any).pipeline;
    pipeline.collectors = [
      new MockCollector('source-a', [{
        id: `durability-${runId}`, title: `Durability ${runId}`, source: 'Source A', url: 'http://test/durable', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
      }])
    ];

    const runRes = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
    if (runRes.data.result.failures.length > 0) console.error('Test 6 Failures:', runRes.data.result.failures.map((e: any) => e.message || e));
    assert.strictEqual(telegramProvider.messages.length, 1);

    // Simulate second process finding same item (by running pipeline again)
    telegramProvider.messages = []; // Clear
    await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
    
    assert.strictEqual(telegramProvider.messages.length, 0, 'Notification not resent due to durable state');
  });

  await t.test('9. Security', async () => {
    const resNoAuth = await makeRequest(port, 'POST', '/api/news/run');
    assert.strictEqual(resNoAuth.status, 401);

    const resWrongAuth = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': 'Bearer wrong' });
    assert.strictEqual(resWrongAuth.status, 401);

    // Validate no secrets leak in public endpoints
    const resGet = await makeRequest(port, 'GET', '/api/news');
    const responseBody = JSON.stringify(resGet.data);
    assert.ok(!responseBody.includes(dbUrl));
    assert.ok(!responseBody.includes(token));
  });

  await t.test('10. Restart durability', async () => {
    // Insert a fresh item
    const pipeline = (orchestrator as any).pipeline;
    pipeline.collectors = [
      new MockCollector('source-restart', [{
        id: `restart-${runId}`, title: `Restart ${runId}`, source: 'Source A', url: 'http://test/restart', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
      }]),
      new MockCollector('source-restart-2', [{
        id: `restart2-${runId}`, title: `Restart ${runId}`, source: 'Source B', url: 'http://test/restart', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
      }])
    ];
    await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });

    // Simulate process death and recreation
    await newsRepo.close();
    await stateRepo.close();

    const newNewsRepo = new PostgresNewsRepository(dbUrl);
    const newStateRepo = new PostgresNotificationStateRepository(dbUrl);
    await runMigrations(dbUrl);
    await newNewsRepo.initialize();
    await newStateRepo.initialize();

    const feedServiceNew = new FeedService(newNewsRepo);
    const listRes = await feedServiceNew.getLatest();
    
    const restored = listRes.items.find(i => i.item.title.includes(`Restart ${runId}`));
    assert.ok(restored, 'Item restored from DB after restart');
    assert.ok(restored.analysis, 'AI analysis restored');
    assert.strictEqual(restored.validation.valid, true, 'Validation state restored');
    assert.strictEqual((restored.item.relatedSources || []).length, 2, 'Related sources restored');

    const sent = await newStateRepo.hasBeenSent('telegram', restored.item.id);
    assert.strictEqual(sent, true, 'Notification state restored');

    await newNewsRepo.close();
    await newStateRepo.close();
  });
});
