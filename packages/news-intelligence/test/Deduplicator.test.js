"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const Deduplicator_1 = require("../src/Deduplicator");
function createMockItem(id, title, source, url) {
    return {
        id,
        title,
        source,
        url,
        publishedAt: new Date().toISOString(),
        collectedAt: new Date().toISOString(),
        category: 'cybersecurity',
    };
}
(0, node_test_1.default)('Deduplicator rules', async (t) => {
    const dedup = new Deduplicator_1.Deduplicator();
    await t.test('1. Exact ID match deduplication', () => {
        const items = [
            createMockItem('123', 'A unique title', 'Source A', 'https://example.com/a'),
            createMockItem('123', 'Different title', 'Source B', 'https://example.com/b'),
        ];
        const results = dedup.deduplicate(items);
        node_assert_1.default.strictEqual(results.length, 1);
        node_assert_1.default.deepStrictEqual(results[0].relatedSources, ['Source A', 'Source B']);
    });
    await t.test('2. Normalized URL match (ignores tracking params and trailing slash)', () => {
        const items = [
            createMockItem('1', 'Article A', 'Source A', 'https://example.com/story/'),
            createMockItem('2', 'Completely different title', 'Source B', 'https://example.com/story?utm_source=rss&ref=tw'),
        ];
        const results = dedup.deduplicate(items);
        node_assert_1.default.strictEqual(results.length, 1);
        node_assert_1.default.deepStrictEqual(results[0].relatedSources, ['Source A', 'Source B']);
    });
    await t.test('3. Strong normalized title match', () => {
        const items = [
            createMockItem('1', 'Critical vulnerability found in X!', 'Source A', 'https://a.com'),
            createMockItem('2', 'critical vulnerability found in x', 'Source B', 'https://b.com'),
        ];
        const results = dedup.deduplicate(items);
        node_assert_1.default.strictEqual(results.length, 1);
        node_assert_1.default.deepStrictEqual(results[0].relatedSources, ['Source A', 'Source B']);
    });
    await t.test('4. Non-matching items are kept separate', () => {
        const items = [
            createMockItem('1', 'Title A', 'Source A', 'https://a.com'),
            createMockItem('2', 'Title B', 'Source B', 'https://b.com'),
        ];
        const results = dedup.deduplicate(items);
        node_assert_1.default.strictEqual(results.length, 2);
        // Should not populate relatedSources if there are no duplicates
        node_assert_1.default.strictEqual(results[0].relatedSources, undefined);
        node_assert_1.default.strictEqual(results[1].relatedSources, undefined);
    });
    await t.test('5. Merging does not lose the original source', () => {
        const items = [
            createMockItem('1', 'Same Title', 'Source A', 'https://a.com'),
            createMockItem('2', 'Same Title', 'Source B', 'https://b.com'),
            createMockItem('3', 'Same Title', 'Source C', 'https://c.com'),
        ];
        const results = dedup.deduplicate(items);
        node_assert_1.default.strictEqual(results.length, 1);
        node_assert_1.default.deepStrictEqual(results[0].relatedSources, ['Source A', 'Source B', 'Source C']);
    });
});
//# sourceMappingURL=Deduplicator.test.js.map