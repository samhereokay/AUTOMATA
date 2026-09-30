"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const EvidenceValidator_1 = require("../src/EvidenceValidator");
function createValidItem() {
    return {
        id: 'test-id-123',
        title: 'Valid Title',
        url: 'https://example.com/article',
        source: 'Test Source',
        publishedAt: new Date('2024-10-01T12:00:00Z').toISOString(),
        collectedAt: new Date().toISOString(),
        category: 'cybersecurity',
        relatedSources: ['Other Source']
    };
}
(0, node_test_1.default)('EvidenceValidator', async (t) => {
    const validator = new EvidenceValidator_1.EvidenceValidator();
    await t.test('✔ Valid evidence passes', () => {
        const item = createValidItem();
        const result = validator.validate(item);
        node_assert_1.default.strictEqual(result.valid, true);
        node_assert_1.default.strictEqual(result.status, 'verified');
        node_assert_1.default.strictEqual(result.errors.length, 0);
    });
    await t.test('✔ Missing title fails', () => {
        const item = createValidItem();
        item.title = '   ';
        const result = validator.validate(item);
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.strictEqual(result.status, 'invalid');
        node_assert_1.default.ok(result.errors.some(e => e.includes('Missing or empty title')));
    });
    await t.test('✔ Missing URL fails', () => {
        const item = createValidItem();
        item.url = '';
        const result = validator.validate(item);
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.strictEqual(result.status, 'invalid');
        node_assert_1.default.ok(result.errors.some(e => e.includes('Missing or empty url')));
    });
    await t.test('✔ Invalid URL fails', () => {
        const item = createValidItem();
        item.url = 'not-a-valid-url';
        const result = validator.validate(item);
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.strictEqual(result.status, 'invalid');
        node_assert_1.default.ok(result.errors.some(e => e.includes('Invalid URL format')));
    });
    await t.test('✔ Non-http URL fails', () => {
        const item = createValidItem();
        item.url = 'ftp://example.com';
        const result = validator.validate(item);
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.strictEqual(result.status, 'invalid');
        node_assert_1.default.ok(result.errors.some(e => e.includes('Non-http(s) URL protocol')));
    });
    await t.test('✔ Invalid publishedAt fails', () => {
        const item = createValidItem();
        item.publishedAt = 'impossible-date-format';
        const result = validator.validate(item);
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.strictEqual(result.status, 'invalid');
        node_assert_1.default.ok(result.errors.some(e => e.includes('Invalid publishedAt timestamp')));
    });
    await t.test('✔ Valid ISO timestamp passes', () => {
        const item = createValidItem();
        item.publishedAt = '2025-01-01T00:00:00Z';
        const result = validator.validate(item);
        node_assert_1.default.strictEqual(result.valid, true);
        node_assert_1.default.strictEqual(result.status, 'verified');
    });
    await t.test('✔ Missing source fails', () => {
        const item = createValidItem();
        item.source = '';
        const result = validator.validate(item);
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.strictEqual(result.status, 'invalid');
        node_assert_1.default.ok(result.errors.some(e => e.includes('Missing or empty source')));
    });
    await t.test('✔ Unverified evidence is not falsely marked verified', () => {
        const item = createValidItem();
        item.publishedAt = null; // Lacks publication date
        const result = validator.validate(item);
        node_assert_1.default.strictEqual(result.valid, true);
        node_assert_1.default.strictEqual(result.status, 'unverified');
        node_assert_1.default.strictEqual(result.errors.length, 0);
        node_assert_1.default.ok(result.warnings.some(w => w.includes('Missing publishedAt evidence')));
    });
    await t.test('✔ Original provenance is preserved', () => {
        const item = createValidItem();
        const origUrl = item.url;
        const origSource = item.source;
        validator.validate(item);
        node_assert_1.default.strictEqual(item.url, origUrl);
        node_assert_1.default.strictEqual(item.source, origSource);
    });
    await t.test('✔ Validation does not mutate the NewsItem', () => {
        const item = Object.freeze(createValidItem()); // Freezing forces strict immutability
        // If it mutates, it will throw an error in strict mode
        node_assert_1.default.doesNotThrow(() => validator.validate(item));
    });
    await t.test('✔ Multiple related sources remain intact', () => {
        const item = createValidItem();
        const result = validator.validate(item);
        node_assert_1.default.deepStrictEqual(item.relatedSources, ['Other Source']);
        node_assert_1.default.strictEqual(result.valid, true);
    });
});
//# sourceMappingURL=EvidenceValidator.test.js.map