"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const http_1 = __importDefault(require("http"));
const NewsPipeline_1 = require("../src/NewsPipeline");
const Deduplicator_1 = require("../src/Deduplicator");
const EvidenceValidator_1 = require("../src/EvidenceValidator");
const AIAnalyzer_1 = require("../src/AIAnalyzer");
const PostgresNewsRepository_1 = require("../src/persistence/PostgresNewsRepository");
const PostgresNotificationStateRepository_1 = require("../src/persistence/PostgresNotificationStateRepository");
const TelegramService_1 = require("../src/TelegramService");
const PipelineOrchestrator_1 = require("../src/PipelineOrchestrator");
const HttpTrigger_1 = require("../src/HttpTrigger");
const FeedService_1 = require("../src/FeedService");
const app_js_1 = require("../../../apps/website/app.js");
const migrate_1 = require("../src/persistence/migrate");
// Mocks
class MockCollector {
    id;
    items;
    constructor(id, items) {
        this.id = id;
        this.items = items;
    }
    async collect() { return this.items; }
}
class MockAIProvider {
    shouldFail = false;
    async analyze(content) {
        if (this.shouldFail)
            throw new Error('Ollama connection refused');
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
    messages = [];
    shouldFail = false;
    async sendMessage(chatId, message) {
        if (this.shouldFail)
            throw new Error('Telegram API Error');
        this.messages.push({ chatId, message });
    }
}
function makeRequest(port, method, path, headers = {}) {
    return new Promise((resolve) => {
        const req = http_1.default.request({ hostname: '127.0.0.1', port, path, method, headers, agent: false }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode || 500, data: JSON.parse(body || '{}') }));
        });
        req.on('error', (err) => resolve({ status: 500, data: { error: err.message } }));
        req.end();
    });
}
(0, node_test_1.default)('Production E2E Verification', async (t) => {
    const dbUrl = process.env.TEST_DATABASE_URL;
    if (!dbUrl) {
        throw new Error('TEST_DATABASE_URL is required for Production E2E tests');
    }
    // Generate unique test IDs for isolation
    const runId = Date.now().toString();
    let newsRepo;
    let stateRepo;
    let aiProvider;
    let telegramProvider;
    let trigger;
    let orchestrator;
    let feedService;
    const port = 34568;
    const token = 'e2e-secret-token';
    t.beforeEach(async () => {
        await (0, migrate_1.runMigrations)(dbUrl);
        newsRepo = new PostgresNewsRepository_1.PostgresNewsRepository(dbUrl);
        stateRepo = new PostgresNotificationStateRepository_1.PostgresNotificationStateRepository(dbUrl);
        await newsRepo.initialize();
        await stateRepo.initialize();
        aiProvider = new MockAIProvider();
        telegramProvider = new MockTelegramProvider();
        const telegramService = new TelegramService_1.TelegramService(telegramProvider, stateRepo, 'mock-chat-id');
        // We'll set the collector list per test
        const pipeline = new NewsPipeline_1.NewsPipeline([], new Deduplicator_1.Deduplicator(), new EvidenceValidator_1.EvidenceValidator(), new AIAnalyzer_1.AIAnalyzer(aiProvider), newsRepo, telegramService);
        orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(pipeline);
        feedService = new FeedService_1.FeedService(newsRepo);
        trigger = new HttpTrigger_1.HttpTrigger(orchestrator, feedService, { port, authToken: token });
        await trigger.start();
    });
    t.afterEach(async () => {
        await trigger.stop();
        await newsRepo.close();
        await stateRepo.close();
    });
    await t.test('1. Happy path, 2. Duplicate sources, 7. API, 8. Website rendering', async () => {
        // Inject mock collector directly to pipeline
        const pipeline = orchestrator.pipeline;
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
        node_assert_1.default.strictEqual(runRes.status, 200);
        node_assert_1.default.strictEqual(runRes.data.success, true);
        // 2. Duplicate sources merged
        const runStats = runRes.data.result;
        if (runStats.failures.length > 0)
            console.error('Test 1 Failures:', runStats.failures.map((e) => e.message || e));
        node_assert_1.default.strictEqual(runStats.collected, 2, 'Collected 2 items');
        node_assert_1.default.strictEqual(runStats.deduplicated, 1, 'Deduplicated to 1 canonical item');
        node_assert_1.default.strictEqual(runStats.validated, 1, '1 valid item');
        node_assert_1.default.strictEqual(runStats.persisted, 1, '1 persisted');
        // 1. Happy path Telegram
        node_assert_1.default.strictEqual(telegramProvider.messages.length, 1);
        node_assert_1.default.ok(telegramProvider.messages[0].message.includes('E2E Happy Path'));
        // 7. API Verification (List)
        const listRes = await makeRequest(port, 'GET', '/api/news');
        node_assert_1.default.strictEqual(listRes.status, 200);
        const apiItem = listRes.data.items.find((i) => i.item.title.includes(runId));
        node_assert_1.default.ok(apiItem, 'Item exists in API list');
        node_assert_1.default.strictEqual(apiItem.item.relatedSources.length, 2, 'API exposes related sources');
        // 7. API Verification (Detail)
        const detailRes = await makeRequest(port, 'GET', `/api/news/${apiItem.item.id}`);
        node_assert_1.default.strictEqual(detailRes.status, 200);
        node_assert_1.default.strictEqual(detailRes.data.item.id, apiItem.item.id);
        // 7. API Verification (Search)
        const searchRes = await makeRequest(port, 'GET', `/api/news/search?query=${runId}`);
        node_assert_1.default.strictEqual(searchRes.status, 200);
        node_assert_1.default.ok(searchRes.data.items.length > 0);
        // 8. Website rendering
        const htmlFeed = (0, app_js_1.renderFeedItem)(apiItem);
        node_assert_1.default.ok(htmlFeed.includes(runId));
        node_assert_1.default.ok(htmlFeed.includes('severity-high'));
        node_assert_1.default.ok(htmlFeed.includes('Mock Summary'));
        const htmlDetail = (0, app_js_1.renderStoryDetail)(apiItem);
        node_assert_1.default.ok(htmlDetail.includes(runId));
        node_assert_1.default.ok(htmlDetail.includes('Source A'));
        node_assert_1.default.ok(htmlDetail.includes('Source B'), 'Related source renders in frontend');
    });
    await t.test('3. Invalid evidence', async () => {
        const pipeline = orchestrator.pipeline;
        pipeline.collectors = [
            new MockCollector('source-a', [{
                    id: `invalid-${runId}`, title: `Invalid ${runId}`, source: 'Source A', url: 'not-a-url', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
                }])
        ];
        const runRes = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
        node_assert_1.default.strictEqual(runRes.data.result.collected, 1);
        node_assert_1.default.strictEqual(runRes.data.result.validated, 0);
        node_assert_1.default.strictEqual(telegramProvider.messages.length, 0);
        const listRes = await makeRequest(port, 'GET', '/api/news');
        const item = listRes.data.items.find((i) => i.item.title.includes(`Invalid ${runId}`));
        node_assert_1.default.ok(!item, 'Invalid item should not be in API');
    });
    await t.test('4. AI failure', async () => {
        aiProvider.shouldFail = true;
        const pipeline = orchestrator.pipeline;
        pipeline.collectors = [
            new MockCollector('source-a', [{
                    id: `ai-fail-${runId}`, title: `AI Fail ${runId}`, source: 'Source A', url: 'http://test/ai', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
                }])
        ];
        const runRes = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
        if (runRes.data.result.failures.length > 0)
            console.error('Test 4 Failures:', runRes.data.result.failures.map((e) => e.message || e));
        node_assert_1.default.strictEqual(runRes.data.result.analyzed, 0);
        node_assert_1.default.strictEqual(runRes.data.result.persisted, 1, 'Validated story persists even if AI fails');
        node_assert_1.default.strictEqual(telegramProvider.messages.length, 1, 'Graceful degradation: still notifies');
        node_assert_1.default.ok(telegramProvider.messages[0].message.includes('No AI analysis available'));
        const listRes = await makeRequest(port, 'GET', '/api/news');
        const item = listRes.data.items.find((i) => i.item.title.includes(`AI Fail ${runId}`));
        node_assert_1.default.ok(item, 'Item exists in API');
        node_assert_1.default.ok(!item.analysis, 'No AI analysis attached');
    });
    await t.test('5. Telegram failure', async () => {
        telegramProvider.shouldFail = true;
        const pipeline = orchestrator.pipeline;
        pipeline.collectors = [
            new MockCollector('source-a', [{
                    id: `tg-fail-${runId}`, title: `TG Fail ${runId}`, source: 'Source A', url: 'http://test/tg', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
                }])
        ];
        const runRes = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
        if (runRes.data.result.failures.length > 0)
            console.error('Test 5 Failures:', runRes.data.result.failures.map((e) => e.message || e));
        node_assert_1.default.strictEqual(runRes.data.result.persisted, 1);
        const listRes = await makeRequest(port, 'GET', '/api/news');
        const item = listRes.data.items.find((i) => i.item.title.includes(`TG Fail ${runId}`));
        node_assert_1.default.ok(item, 'Item persists and appears in API despite TG failure');
    });
    await t.test('6. Notification durability', async () => {
        const pipeline = orchestrator.pipeline;
        pipeline.collectors = [
            new MockCollector('source-a', [{
                    id: `durability-${runId}`, title: `Durability ${runId}`, source: 'Source A', url: 'http://test/durable', publishedAt: new Date().toISOString(), collectedAt: new Date().toISOString(), category: 'cybersecurity'
                }])
        ];
        const runRes = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
        if (runRes.data.result.failures.length > 0)
            console.error('Test 6 Failures:', runRes.data.result.failures.map((e) => e.message || e));
        node_assert_1.default.strictEqual(telegramProvider.messages.length, 1);
        // Simulate second process finding same item (by running pipeline again)
        telegramProvider.messages = []; // Clear
        await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': `Bearer ${token}` });
        node_assert_1.default.strictEqual(telegramProvider.messages.length, 0, 'Notification not resent due to durable state');
    });
    await t.test('9. Security', async () => {
        const resNoAuth = await makeRequest(port, 'POST', '/api/news/run');
        node_assert_1.default.strictEqual(resNoAuth.status, 401);
        const resWrongAuth = await makeRequest(port, 'POST', '/api/news/run', { 'Authorization': 'Bearer wrong' });
        node_assert_1.default.strictEqual(resWrongAuth.status, 401);
        // Validate no secrets leak in public endpoints
        const resGet = await makeRequest(port, 'GET', '/api/news');
        const responseBody = JSON.stringify(resGet.data);
        node_assert_1.default.ok(!responseBody.includes(dbUrl));
        node_assert_1.default.ok(!responseBody.includes(token));
    });
    await t.test('10. Restart durability', async () => {
        // Insert a fresh item
        const pipeline = orchestrator.pipeline;
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
        const newNewsRepo = new PostgresNewsRepository_1.PostgresNewsRepository(dbUrl);
        const newStateRepo = new PostgresNotificationStateRepository_1.PostgresNotificationStateRepository(dbUrl);
        await (0, migrate_1.runMigrations)(dbUrl);
        await newNewsRepo.initialize();
        await newStateRepo.initialize();
        const feedServiceNew = new FeedService_1.FeedService(newNewsRepo);
        const listRes = await feedServiceNew.getLatest();
        const restored = listRes.items.find(i => i.item.title.includes(`Restart ${runId}`));
        node_assert_1.default.ok(restored, 'Item restored from DB after restart');
        node_assert_1.default.ok(restored.analysis, 'AI analysis restored');
        node_assert_1.default.strictEqual(restored.validation.valid, true, 'Validation state restored');
        node_assert_1.default.strictEqual((restored.item.relatedSources || []).length, 2, 'Related sources restored');
        const sent = await newStateRepo.hasBeenSent('telegram', restored.item.id);
        node_assert_1.default.strictEqual(sent, true, 'Notification state restored');
        await newNewsRepo.close();
        await newStateRepo.close();
    });
});
//# sourceMappingURL=ProductionE2E.test.js.map