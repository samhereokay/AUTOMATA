"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const NewsPipeline_1 = require("../src/NewsPipeline");
const Deduplicator_1 = require("../src/Deduplicator");
const EvidenceValidator_1 = require("../src/EvidenceValidator");
const AIAnalyzer_1 = require("../src/AIAnalyzer");
const InMemoryNewsRepository_1 = require("../src/persistence/InMemoryNewsRepository");
const InMemoryNotificationStateRepository_1 = require("../src/persistence/InMemoryNotificationStateRepository");
const TelegramService_1 = require("../src/TelegramService");
const FeedService_1 = require("../src/FeedService");
class MockCollector {
    name;
    items;
    constructor(name, items) {
        this.name = name;
        this.items = items;
    }
    async collect() {
        return this.items;
    }
}
class MockAIProvider {
    shouldFail = false;
    async analyze(input) {
        if (this.shouldFail)
            throw new Error('AI Provider offline');
        // Check if input contains 'Y' to differentiate analysis
        const isY = input.includes('Story Y');
        return JSON.stringify({
            summary: isY ? "Summary for Y" : "Summary for X",
            keyPoints: ["Keypoint 1", "Keypoint 2"],
            entities: ["Entity"],
            technologies: ["Tech"],
            tags: ["tag1", "tag2"],
            severity: "high"
        });
    }
}
class MockTelegramProvider {
    shouldFail = false;
    messages = [];
    async sendMessage(chatId, message) {
        if (this.shouldFail)
            throw new Error('Telegram failed');
        this.messages.push({ chatId, message });
    }
    isConfigured() {
        return true;
    }
}
function createItem(id, overrides = {}) {
    return {
        id,
        title: overrides.title || `Title ${id}`,
        url: overrides.url || `https://example.com/${id}`,
        source: overrides.source || 'Source A',
        publishedAt: overrides.publishedAt !== undefined ? overrides.publishedAt : '2024-10-01T12:00:00Z',
        collectedAt: new Date().toISOString(),
        category: 'cybersecurity',
        metadata: overrides.metadata || {}
    };
}
(0, node_test_1.default)('NewsIntelligence E2E', async (t) => {
    let deduplicator;
    let validator;
    let aiProvider;
    let analyzer;
    let repository;
    let stateRepo;
    let telegramProvider;
    let telegramService;
    let feedService;
    let collectors;
    let pipeline;
    t.beforeEach(() => {
        deduplicator = new Deduplicator_1.Deduplicator();
        validator = new EvidenceValidator_1.EvidenceValidator();
        aiProvider = new MockAIProvider();
        analyzer = new AIAnalyzer_1.AIAnalyzer(aiProvider);
        repository = new InMemoryNewsRepository_1.InMemoryNewsRepository();
        stateRepo = new InMemoryNotificationStateRepository_1.InMemoryNotificationStateRepository();
        telegramProvider = new MockTelegramProvider();
        telegramService = new TelegramService_1.TelegramService(telegramProvider, stateRepo, '@channel');
        feedService = new FeedService_1.FeedService(repository);
        // Setup Scenario:
        // Source A -> Story X
        // Source B -> Story X
        // Source C -> Story Y
        // Source D -> malformed item (missing url)
        const itemA = createItem('A1', { title: 'Story X', url: 'https://x.com/story', source: 'Source A' });
        const itemB = createItem('B1', { title: 'Story X!', url: 'https://x.com/story?ref=rss', source: 'Source B' });
        const itemC = createItem('C1', { title: 'Story Y', url: 'https://y.com/story', source: 'Source C' });
        const itemD = createItem('D1', { title: 'Story Z', url: 'invalid-url', source: 'Source D' }); // Validation will fail
        // Freeze inputs to ensure no mutation
        Object.freeze(itemA);
        Object.freeze(itemB);
        Object.freeze(itemC);
        Object.freeze(itemD);
        collectors = [
            new MockCollector('Collector1', [itemA, itemB]),
            new MockCollector('Collector2', [itemC, itemD])
        ];
        pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    });
    await t.test('✔ E2E Normal Scenario (Multiple sources merge, Invalid rejected, AI/Validation/Feed/Telegram succeed)', async () => {
        const res = await pipeline.run();
        // Verification of pipeline execution result
        node_assert_1.default.strictEqual(res.collected, 4, 'Should collect 4 items');
        node_assert_1.default.strictEqual(res.deduplicated, 3, 'Should deduplicate to 3 canonical stories (X, Y, Z)');
        node_assert_1.default.strictEqual(res.validated, 2, 'Should validate 2 stories (X, Y). Z is invalid');
        node_assert_1.default.strictEqual(res.analyzed, 2, 'Should analyze 2 stories');
        node_assert_1.default.strictEqual(res.persisted, 2, 'Should persist 2 stories');
        node_assert_1.default.strictEqual(res.notified, 2, 'Should notify 2 stories');
        // Z failure should be in failures
        node_assert_1.default.strictEqual(res.failures.length, 1);
        node_assert_1.default.ok(res.failures[0].message.includes('Validation failed'));
        // Feed Verification
        const feed = await feedService.getLatest();
        node_assert_1.default.strictEqual(feed.items.length, 2);
        // Story X verification
        const storyX = feed.items.find(i => i.item.url.includes('x.com'));
        node_assert_1.default.ok(storyX);
        node_assert_1.default.strictEqual(storyX.validation.status, 'verified');
        node_assert_1.default.strictEqual(storyX.analysis?.summary, 'Summary for X');
        node_assert_1.default.ok(storyX.item.relatedSources?.includes('Source A'));
        node_assert_1.default.ok(storyX.item.relatedSources?.includes('Source B'));
        // Story Y verification
        const storyY = feed.items.find(i => i.item.url.includes('y.com'));
        node_assert_1.default.ok(storyY);
        node_assert_1.default.strictEqual(storyY.analysis?.summary, 'Summary for Y');
        // Telegram Verification
        node_assert_1.default.strictEqual(telegramProvider.messages.length, 2);
        const msgX = telegramProvider.messages.find(m => m.message.includes('Story X'));
        node_assert_1.default.ok(msgX);
        node_assert_1.default.ok(msgX.message.includes('Summary for X'));
    });
    await t.test('✔ AI failure doesn\'t lose validated stories', async () => {
        aiProvider.shouldFail = true;
        const res = await pipeline.run();
        node_assert_1.default.strictEqual(res.validated, 2);
        node_assert_1.default.strictEqual(res.analyzed, 0, 'AI should fail');
        node_assert_1.default.strictEqual(res.persisted, 2, 'Validated stories still persisted');
        const feed = await feedService.getLatest();
        node_assert_1.default.strictEqual(feed.items.length, 2);
        node_assert_1.default.strictEqual(feed.items[0].validation.status, 'verified'); // Evidence status survives
        node_assert_1.default.strictEqual(feed.items[0].analysis, undefined); // No fabricated analysis
    });
    await t.test('✔ Telegram failure doesn\'t lose persisted stories', async () => {
        telegramProvider.shouldFail = true;
        const res = await pipeline.run();
        node_assert_1.default.strictEqual(res.persisted, 2);
        node_assert_1.default.strictEqual(res.notified, 0, 'Telegram failed');
        const feed = await feedService.getLatest();
        node_assert_1.default.strictEqual(feed.items.length, 2, 'Still in repo/feed');
    });
    await t.test('✔ Re-running identical input is idempotent', async () => {
        // Run once
        await pipeline.run();
        // Run exactly the same input again
        const res2 = await pipeline.run();
        node_assert_1.default.strictEqual(res2.collected, 4);
        node_assert_1.default.strictEqual(res2.deduplicated, 3);
        node_assert_1.default.strictEqual(res2.validated, 2);
        node_assert_1.default.strictEqual(res2.analyzed, 2); // It will analyze them again (no DB cache at this layer)
        node_assert_1.default.strictEqual(res2.persisted, 2); // Will save them to repo
        node_assert_1.default.strictEqual(res2.notified, 0, 'Should not notify again for the same canonical stories');
        const feed = await feedService.getLatest();
        node_assert_1.default.strictEqual(feed.items.length, 2, 'Should still only be 2 canonical stories in the DB');
        node_assert_1.default.strictEqual(telegramProvider.messages.length, 2, 'Should still only have 2 messages total');
    });
});
//# sourceMappingURL=NewsIntelligence.e2e.test.js.map