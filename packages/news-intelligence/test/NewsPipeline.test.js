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
class MockCollector {
    name;
    items;
    shouldFail;
    constructor(name, items, shouldFail = false) {
        this.name = name;
        this.items = items;
        this.shouldFail = shouldFail;
    }
    async collect() {
        if (this.shouldFail)
            throw new Error(`${this.name} failed`);
        return this.items;
    }
}
class MockAIProvider {
    shouldFail = false;
    async analyze(input) {
        if (this.shouldFail)
            throw new Error('AI Provider offline');
        return JSON.stringify({
            summary: "Test summary",
            keyPoints: ["Point 1"],
            entities: [],
            technologies: [],
            tags: [],
            severity: "medium"
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
}
function createItem(id, overrides = {}) {
    return {
        id,
        title: overrides.title || `Title ${id}`,
        url: overrides.url || `https://example.com/${id}`,
        source: overrides.source || 'Source A',
        publishedAt: overrides.publishedAt !== undefined ? overrides.publishedAt : new Date().toISOString(),
        collectedAt: new Date().toISOString(),
        category: 'cybersecurity',
        metadata: overrides.metadata || {}
    };
}
(0, node_test_1.default)('NewsPipeline', async (t) => {
    let deduplicator;
    let validator;
    let aiProvider;
    let analyzer;
    let repository;
    let stateRepo;
    let telegramProvider;
    let telegramService;
    t.beforeEach(() => {
        deduplicator = new Deduplicator_1.Deduplicator();
        validator = new EvidenceValidator_1.EvidenceValidator();
        aiProvider = new MockAIProvider();
        analyzer = new AIAnalyzer_1.AIAnalyzer(aiProvider);
        repository = new InMemoryNewsRepository_1.InMemoryNewsRepository();
        stateRepo = new InMemoryNotificationStateRepository_1.InMemoryNotificationStateRepository();
        telegramProvider = new MockTelegramProvider();
        telegramService = new TelegramService_1.TelegramService(telegramProvider, stateRepo, '@channel');
    });
    await t.test('✔ Complete pipeline processes valid news', async () => {
        const collectors = [
            new MockCollector('C1', [createItem('1'), createItem('2')]),
            new MockCollector('C2', [createItem('3')])
        ];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
        const res = await pipeline.run();
        node_assert_1.default.strictEqual(res.collected, 3);
        node_assert_1.default.strictEqual(res.deduplicated, 3);
        node_assert_1.default.strictEqual(res.validated, 3);
        node_assert_1.default.strictEqual(res.analyzed, 3);
        node_assert_1.default.strictEqual(res.persisted, 3);
        node_assert_1.default.strictEqual(res.notified, 3);
        node_assert_1.default.strictEqual(res.failures.length, 0);
        const saved = await repository.list();
        node_assert_1.default.strictEqual(saved.length, 3);
    });
    await t.test('✔ Collector failure doesn\'t crash unrelated sources', async () => {
        const collectors = [
            new MockCollector('C1', [createItem('1')]),
            new MockCollector('C2', [], true), // Fails
            new MockCollector('C3', [createItem('3')])
        ];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
        const res = await pipeline.run();
        node_assert_1.default.strictEqual(res.collected, 2);
        node_assert_1.default.strictEqual(res.persisted, 2);
        node_assert_1.default.strictEqual(res.failures.length, 1);
        node_assert_1.default.ok(res.failures[0].message.includes('C2 failed'));
    });
    await t.test('✔ Duplicate stories are processed once', async () => {
        const collectors = [
            new MockCollector('C1', [createItem('1', { title: 'Exact Match', url: 'https://exact.com' })]),
            new MockCollector('C2', [createItem('2', { title: 'Exact Match', url: 'https://exact.com' })])
        ];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
        const res = await pipeline.run();
        node_assert_1.default.strictEqual(res.collected, 2);
        node_assert_1.default.strictEqual(res.deduplicated, 1);
        node_assert_1.default.strictEqual(res.persisted, 1);
        node_assert_1.default.strictEqual(res.failures.length, 0);
    });
    await t.test('✔ Invalid evidence isn\'t analyzed', async () => {
        const invalidItem = createItem('1', { url: 'not-a-url' });
        const validItem = createItem('2');
        const collectors = [new MockCollector('C1', [invalidItem, validItem])];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
        const res = await pipeline.run();
        node_assert_1.default.strictEqual(res.collected, 2);
        node_assert_1.default.strictEqual(res.deduplicated, 2);
        node_assert_1.default.strictEqual(res.validated, 1); // 1 valid
        node_assert_1.default.strictEqual(res.analyzed, 1);
        node_assert_1.default.strictEqual(res.persisted, 1);
        node_assert_1.default.strictEqual(res.failures.length, 1);
        node_assert_1.default.ok(res.failures[0].message.includes('Validation failed'));
    });
    await t.test('✔ AI failure doesn\'t fabricate analysis and preserves validated news', async () => {
        aiProvider.shouldFail = true;
        const collectors = [new MockCollector('C1', [createItem('1')])];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
        const res = await pipeline.run();
        node_assert_1.default.strictEqual(res.collected, 1);
        node_assert_1.default.strictEqual(res.validated, 1);
        node_assert_1.default.strictEqual(res.analyzed, 0); // AI failed
        node_assert_1.default.strictEqual(res.persisted, 1); // But still persisted
        node_assert_1.default.strictEqual(res.notified, 1); // And notified
        node_assert_1.default.strictEqual(res.failures.length, 1);
        node_assert_1.default.ok(res.failures[0].message.includes('Analysis failed'));
        const saved = await repository.getById('1');
        node_assert_1.default.ok(saved);
        node_assert_1.default.strictEqual(saved.analysis, undefined); // No fabricated analysis
    });
    await t.test('✔ Persistence failure doesn\'t report success', async () => {
        const brokenRepo = new InMemoryNewsRepository_1.InMemoryNewsRepository();
        brokenRepo.save = async () => { throw new Error('DB Down'); };
        const collectors = [new MockCollector('C1', [createItem('1')])];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, brokenRepo, telegramService);
        const res = await pipeline.run();
        node_assert_1.default.strictEqual(res.analyzed, 1);
        node_assert_1.default.strictEqual(res.persisted, 0);
        node_assert_1.default.strictEqual(res.notified, 0); // Should not notify if persistence failed
        node_assert_1.default.strictEqual(res.failures.length, 1);
        node_assert_1.default.ok(res.failures[0].message.includes('Persistence failed'));
    });
    await t.test('✔ Telegram failure doesn\'t lose persisted news', async () => {
        telegramProvider.shouldFail = true;
        const collectors = [new MockCollector('C1', [createItem('1')])];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
        const res = await pipeline.run();
        node_assert_1.default.strictEqual(res.persisted, 1);
        node_assert_1.default.strictEqual(res.notified, 0);
        node_assert_1.default.strictEqual(res.failures.length, 1);
        node_assert_1.default.ok(res.failures[0].message.includes('Telegram notification failed'));
        // Should still be in DB
        const saved = await repository.list();
        node_assert_1.default.strictEqual(saved.length, 1);
    });
    await t.test('✔ Pipeline preserves evidence status', async () => {
        const unverified = createItem('1', { publishedAt: null });
        const collectors = [new MockCollector('C1', [unverified])];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
        await pipeline.run();
        const saved = await repository.getById('1');
        node_assert_1.default.strictEqual(saved?.validation.status, 'unverified');
    });
    await t.test('✔ Pipeline does not mutate source data', async () => {
        const item = createItem('1');
        // Freeze source data
        Object.freeze(item);
        const collectors = [new MockCollector('C1', [item])];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
        // If anything mutates `item` directly, this will throw in strict mode
        await pipeline.run();
        node_assert_1.default.strictEqual(item.title, 'Title 1');
    });
    await t.test('✔ Pipeline returns structured execution results', async () => {
        const collectors = [new MockCollector('C1', [createItem('1')])];
        const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
        const res = await pipeline.run();
        node_assert_1.default.deepStrictEqual(Object.keys(res).sort(), [
            'analyzed', 'collected', 'deduplicated', 'failures', 'notified', 'persisted', 'validated'
        ]);
    });
});
//# sourceMappingURL=NewsPipeline.test.js.map