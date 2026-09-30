"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const InMemoryNewsRepository_1 = require("../src/persistence/InMemoryNewsRepository");
const FeedService_1 = require("../src/FeedService");
function createMockAnalyzedItem(id, overrides = {}) {
    return {
        item: Object.freeze({
            id,
            title: overrides.title || `Title ${id}`,
            url: `https://example.com/${id}`,
            source: overrides.source || 'Source A',
            publishedAt: overrides.publishedAt || new Date().toISOString(),
            collectedAt: new Date().toISOString(),
            category: overrides.category || 'cybersecurity',
        }),
        validation: Object.freeze({
            valid: true,
            status: 'verified',
            errors: [],
            warnings: []
        }),
        analysis: Object.freeze({
            summary: overrides.summary || 'Test summary',
            keyPoints: overrides.keyPoints || ['Point 1'],
            entities: [],
            technologies: [],
            tags: overrides.tags || ['tag1'],
            severity: overrides.severity || 'medium'
        })
    };
}
(0, node_test_1.default)('FeedService', async (t) => {
    const repo = new InMemoryNewsRepository_1.InMemoryNewsRepository();
    // Seed the repo
    await repo.save(createMockAnalyzedItem('1', { publishedAt: '2024-10-01T12:00:00Z', title: 'A new malware discovered', tags: ['malware', 'critical'] }));
    await repo.save(createMockAnalyzedItem('2', { publishedAt: '2024-10-02T12:00:00Z', category: 'ai', source: 'Source B', severity: 'low', summary: 'AI model released' }));
    await repo.save(createMockAnalyzedItem('3', { publishedAt: '2024-10-03T12:00:00Z', title: 'Data breach at Corp', severity: 'high', tags: ['breach'] }));
    const feed = new FeedService_1.FeedService(repo);
    await t.test('✔ Latest items returned', async () => {
        const res = await feed.getLatest();
        node_assert_1.default.strictEqual(res.items.length, 3);
        node_assert_1.default.strictEqual(res.pagination.total, 3);
        // Should be ordered by publishedAt desc, so 3, 2, 1
        node_assert_1.default.strictEqual(res.items[0].item.id, '3');
        node_assert_1.default.strictEqual(res.items[1].item.id, '2');
        node_assert_1.default.strictEqual(res.items[2].item.id, '1');
    });
    await t.test('✔ getById returns correct item', async () => {
        const item = await feed.getById('2');
        node_assert_1.default.ok(item);
        node_assert_1.default.strictEqual(item.item.id, '2');
    });
    await t.test('✔ Missing ID returns null', async () => {
        const item = await feed.getById('999');
        node_assert_1.default.strictEqual(item, null);
    });
    await t.test('✔ Search works', async () => {
        const res = await feed.search('malware');
        node_assert_1.default.strictEqual(res.items.length, 1);
        node_assert_1.default.strictEqual(res.items[0].item.id, '1');
        const res2 = await feed.search('ai model');
        node_assert_1.default.strictEqual(res2.items.length, 1);
        node_assert_1.default.strictEqual(res2.items[0].item.id, '2');
    });
    await t.test('✔ Category filtering works', async () => {
        const res = await feed.getLatest({ category: 'ai' });
        node_assert_1.default.strictEqual(res.items.length, 1);
        node_assert_1.default.strictEqual(res.items[0].item.id, '2');
    });
    await t.test('✔ Source filtering works', async () => {
        const res = await feed.getLatest({ source: 'Source B' });
        node_assert_1.default.strictEqual(res.items.length, 1);
        node_assert_1.default.strictEqual(res.items[0].item.id, '2');
    });
    await t.test('✔ Severity filtering works', async () => {
        const res = await feed.getLatest({ severity: 'high' });
        node_assert_1.default.strictEqual(res.items.length, 1);
        node_assert_1.default.strictEqual(res.items[0].item.id, '3');
    });
    await t.test('✔ Pagination works', async () => {
        const res = await feed.getLatest({ limit: 2, offset: 1 });
        node_assert_1.default.strictEqual(res.items.length, 2);
        // Should be items [2] and [1] in sorting order
        node_assert_1.default.strictEqual(res.items[0].item.id, '2');
        node_assert_1.default.strictEqual(res.items[1].item.id, '1');
        node_assert_1.default.strictEqual(res.pagination.limit, 2);
        node_assert_1.default.strictEqual(res.pagination.offset, 1);
    });
    await t.test('✔ Results are ordered deterministically', async () => {
        // Already verified in "Latest items returned" and "Pagination works" (descending publishedAt)
        const res = await feed.getLatest();
        node_assert_1.default.strictEqual(res.items[0].item.id, '3');
        node_assert_1.default.strictEqual(res.items[1].item.id, '2');
        node_assert_1.default.strictEqual(res.items[2].item.id, '1');
    });
    await t.test('✔ Feed cannot mutate repository records', async () => {
        const res = await feed.getLatest();
        const item = res.items[0];
        node_assert_1.default.throws(() => {
            item.item.title = 'Hacked via feed';
        });
        // Typecast to any to get access to repo to check if there is a method delete
        node_assert_1.default.strictEqual(feed.delete, undefined);
        node_assert_1.default.strictEqual(feed.save, undefined);
    });
    await t.test('✔ Original evidence remains unchanged', async () => {
        const item = await feed.getById('1');
        node_assert_1.default.strictEqual(item?.item.publishedAt, '2024-10-01T12:00:00Z');
    });
    await t.test('✔ Empty repository returns valid empty feed', async () => {
        const emptyRepo = new InMemoryNewsRepository_1.InMemoryNewsRepository();
        const emptyFeed = new FeedService_1.FeedService(emptyRepo);
        const res = await emptyFeed.getLatest();
        node_assert_1.default.deepStrictEqual(res.items, []);
        node_assert_1.default.strictEqual(res.pagination.total, 0);
    });
});
//# sourceMappingURL=FeedService.test.js.map