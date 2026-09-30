"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const AIAnalyzer_1 = require("../src/AIAnalyzer");
function createValidItem() {
    return {
        id: 'test-id-123',
        title: 'New Vulnerability in Exchange Server',
        url: 'https://example.com/article',
        source: 'Test Source',
        publishedAt: new Date('2024-10-01T12:00:00Z').toISOString(),
        collectedAt: new Date().toISOString(),
        category: 'cybersecurity',
        metadata: {
            snippet: 'Microsoft warns of a critical RCE in Exchange Server.'
        }
    };
}
class MockProvider {
    shouldFail = false;
    returnMalformed = false;
    async analyze(input) {
        if (this.shouldFail) {
            throw new Error('Network error');
        }
        if (this.returnMalformed) {
            return '{ "summary": "Bad JSON, missing quotes }';
        }
        // Simulate valid JSON response
        return JSON.stringify({
            summary: "Microsoft Exchange Server has a critical RCE vulnerability.",
            keyPoints: ["Critical RCE discovered", "Microsoft warns users"],
            category: "cybersecurity",
            severity: "critical",
            entities: ["Microsoft"],
            technologies: ["Exchange Server"],
            impact: "Allows remote code execution",
            tags: ["vulnerability", "rce"]
        });
    }
}
(0, node_test_1.default)('AIAnalyzer', async (t) => {
    const mockProvider = new MockProvider();
    const analyzer = new AIAnalyzer_1.AIAnalyzer(mockProvider);
    await t.test('✔ Valid NewsItem can be analyzed', async () => {
        const item = createValidItem();
        const result = await analyzer.analyzeItem(item);
        node_assert_1.default.strictEqual(result.analysis.summary, "Microsoft Exchange Server has a critical RCE vulnerability.");
        node_assert_1.default.deepStrictEqual(result.analysis.entities, ["Microsoft"]);
        node_assert_1.default.strictEqual(result.analysis.severity, "critical");
        node_assert_1.default.strictEqual(result.validation.status, 'verified');
    });
    await t.test('✔ AI output follows the defined schema', async () => {
        const item = createValidItem();
        const result = await analyzer.analyzeItem(item);
        node_assert_1.default.ok(typeof result.analysis.summary === 'string');
        node_assert_1.default.ok(Array.isArray(result.analysis.keyPoints));
        node_assert_1.default.ok(Array.isArray(result.analysis.entities));
        node_assert_1.default.ok(Array.isArray(result.analysis.technologies));
        node_assert_1.default.ok(Array.isArray(result.analysis.tags));
    });
    await t.test('✔ Original NewsItem is not mutated and Evidence status cannot be upgraded', async () => {
        const item = createValidItem();
        item.publishedAt = null; // Makes it unverified
        const result = await analyzer.analyzeItem(item);
        // Status should remain unverified
        node_assert_1.default.strictEqual(result.validation.status, 'unverified');
        // Original item properties remain
        node_assert_1.default.strictEqual(result.item.url, 'https://example.com/article');
        node_assert_1.default.strictEqual(result.item.publishedAt, null);
        // Test mutability (should throw in strict mode)
        node_assert_1.default.throws(() => {
            result.item.title = 'Hacked';
        });
        node_assert_1.default.throws(() => {
            result.validation.status = 'verified';
        });
    });
    await t.test('✔ Source, URL, publishedAt cannot be replaced by AI output', async () => {
        // The architecture guarantees this because analysis output is in `result.analysis`
        // and the original item is in `result.item`
        const item = createValidItem();
        const result = await analyzer.analyzeItem(item);
        node_assert_1.default.strictEqual(result.item.source, 'Test Source');
        node_assert_1.default.strictEqual(result.item.url, 'https://example.com/article');
        node_assert_1.default.strictEqual(result.item.publishedAt, item.publishedAt);
    });
    await t.test('✔ Invalid NewsItem is rejected before analysis', async () => {
        const item = createValidItem();
        item.url = 'invalid-url';
        await node_assert_1.default.rejects(async () => await analyzer.analyzeItem(item), /Cannot analyze invalid item: Invalid URL format: invalid-url/);
    });
    await t.test('✔ Provider failure is handled deterministically', async () => {
        mockProvider.shouldFail = true;
        const item = createValidItem();
        await node_assert_1.default.rejects(async () => await analyzer.analyzeItem(item), /Provider failure: Network error/);
        mockProvider.shouldFail = false;
    });
    await t.test('✔ Malformed AI output is rejected and no fabricated fallback analysis is generated', async () => {
        mockProvider.returnMalformed = true;
        const item = createValidItem();
        await node_assert_1.default.rejects(async () => await analyzer.analyzeItem(item), /Malformed AI output: not valid JSON/);
        mockProvider.returnMalformed = false;
    });
    await t.test('✔ Malformed AI output (missing summary) is rejected', async () => {
        class BadProvider {
            async analyze() { return JSON.stringify({ keyPoints: [], entities: [], technologies: [], tags: [] }); }
        }
        const badAnalyzer = new AIAnalyzer_1.AIAnalyzer(new BadProvider());
        const item = createValidItem();
        await node_assert_1.default.rejects(async () => await badAnalyzer.analyzeItem(item), /Malformed AI output: missing or invalid summary/);
    });
});
//# sourceMappingURL=AIAnalyzer.test.js.map