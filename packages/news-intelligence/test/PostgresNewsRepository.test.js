"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const PostgresNewsRepository_1 = require("../src/persistence/PostgresNewsRepository");
const migrate_1 = require("../src/persistence/migrate");
// The test suite must refuse to run if TEST_DATABASE_URL points at the normal automata database.
const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) {
    console.log('Skipping Postgres tests: TEST_DATABASE_URL not set');
    process.exit(0);
}
if (dbUrl.includes('automata') && !dbUrl.includes('automata_test')) {
    console.error('Safety abort: TEST_DATABASE_URL appears to point to production/application DB!');
    process.exit(1);
}
function createAnalyzedItem(id, overrides = {}) {
    const item = {
        id,
        title: overrides.title || `Title ${id}`,
        url: overrides.url || `https://example.com/${id}`,
        source: overrides.source || 'Source A',
        publishedAt: overrides.publishedAt !== undefined ? overrides.publishedAt : '2024-10-01T12:00:00.000Z',
        collectedAt: '2024-10-02T12:00:00.000Z',
        category: 'cybersecurity',
        metadata: overrides.metadata || { someKey: 'val' },
        relatedSources: overrides.relatedSources || ['Source A']
    };
    return {
        item: Object.freeze(item),
        validation: Object.freeze({
            valid: overrides.valid !== undefined ? overrides.valid : true,
            status: overrides.status || 'verified',
            errors: overrides.errors || [],
            warnings: overrides.warnings || []
        }),
        analysis: overrides.analysis !== undefined ? overrides.analysis : Object.freeze({
            summary: `Summary ${id}`,
            keyPoints: ['A', 'B'],
            entities: ['E1'],
            technologies: ['T1'],
            tags: ['tag1'],
            severity: 'high'
        })
    };
}
(0, node_test_1.default)('PostgresNewsRepository', async (t) => {
    const repo = new PostgresNewsRepository_1.PostgresNewsRepository(dbUrl);
    t.before(async () => {
        await (0, migrate_1.runMigrations)(dbUrl);
        await repo.initialize();
    });
    t.after(async () => {
        await repo.close();
    });
    t.beforeEach(async () => {
        // Truncate tables between tests to ensure isolation
        const { Pool } = (await import('pg')).default;
        const pool = new Pool({ connectionString: dbUrl });
        await pool.query('TRUNCATE TABLE news_items CASCADE');
        await pool.end();
    });
    await t.test('✔ Save item and ✔ Retrieve by ID', async () => {
        const item = createAnalyzedItem('1');
        await repo.save(item);
        const retrieved = await repo.getById('1');
        node_assert_1.default.ok(retrieved);
        node_assert_1.default.strictEqual(retrieved.item.id, '1');
        node_assert_1.default.strictEqual(retrieved.item.title, 'Title 1');
        node_assert_1.default.strictEqual(retrieved.item.publishedAt, '2024-10-01T12:00:00.000Z');
    });
    await t.test('✔ Find by URL', async () => {
        const item = createAnalyzedItem('url1', { url: 'https://example.com/find-me?utm_source=twitter' });
        await repo.save(item);
        // Should ignore tracking params
        const retrieved = await repo.findByUrl('https://example.com/find-me?ref=rss');
        node_assert_1.default.ok(retrieved);
        node_assert_1.default.strictEqual(retrieved.item.id, 'url1');
    });
    await t.test('✔ Find by title', async () => {
        const item = createAnalyzedItem('t1', { title: 'Hello World 2024!' });
        await repo.save(item);
        const retrieved = await repo.findByTitle('hello world 2024');
        node_assert_1.default.ok(retrieved);
        node_assert_1.default.strictEqual(retrieved.item.id, 't1');
    });
    await t.test('✔ Duplicate save remains idempotent and ✔ Related sources survive database round-trip', async () => {
        const item1 = createAnalyzedItem('dup1', { relatedSources: ['Source A'] });
        await repo.save(item1);
        const item2 = createAnalyzedItem('dup1', { relatedSources: ['Source B'] });
        await repo.save(item2); // Same ID
        const retrieved = await repo.getById('dup1');
        node_assert_1.default.ok(retrieved);
        // Original source should be preserved (item2 should overwrite some scalar fields if it's considered newer, but sources merge)
        // Wait, the prompt says "transactional merging" and preserves sources.
        node_assert_1.default.strictEqual(retrieved.item.relatedSources?.length, 2);
        node_assert_1.default.ok(retrieved.item.relatedSources?.includes('Source A'));
        node_assert_1.default.ok(retrieved.item.relatedSources?.includes('Source B'));
    });
    await t.test('✔ Validation survives round-trip', async () => {
        const item = createAnalyzedItem('v1', { valid: false, status: 'invalid', errors: ['Bad title'] });
        await repo.save(item);
        const retrieved = await repo.getById('v1');
        node_assert_1.default.ok(retrieved);
        node_assert_1.default.strictEqual(retrieved.validation.valid, false);
        node_assert_1.default.strictEqual(retrieved.validation.status, 'invalid');
        node_assert_1.default.deepStrictEqual(retrieved.validation.errors, ['Bad title']);
    });
    await t.test('✔ AI analysis survives round-trip', async () => {
        const item = createAnalyzedItem('a1');
        await repo.save(item);
        const retrieved = await repo.getById('a1');
        node_assert_1.default.ok(retrieved);
        node_assert_1.default.ok(retrieved.analysis);
        node_assert_1.default.strictEqual(retrieved.analysis?.summary, 'Summary a1');
        node_assert_1.default.deepStrictEqual(retrieved.analysis?.keyPoints, ['A', 'B']);
        node_assert_1.default.strictEqual(retrieved.analysis?.severity, 'high');
    });
    await t.test('✔ Delete works', async () => {
        const item = createAnalyzedItem('d1');
        await repo.save(item);
        await repo.delete('d1');
        const retrieved = await repo.getById('d1');
        node_assert_1.default.strictEqual(retrieved, null);
    });
    await t.test('✔ Pagination works', async () => {
        await repo.save(createAnalyzedItem('p1'));
        await repo.save(createAnalyzedItem('p2'));
        await repo.save(createAnalyzedItem('p3'));
        const page1 = await repo.list({ limit: 2, offset: 0 });
        node_assert_1.default.strictEqual(page1.length, 2);
        const page2 = await repo.list({ limit: 2, offset: 2 });
        node_assert_1.default.strictEqual(page2.length, 1);
    });
    await t.test('✔ Restart/reconnect preserves data', async () => {
        const item = createAnalyzedItem('r1');
        await repo.save(item);
        // Simulate restart by opening a fresh repo connection
        const newRepo = new PostgresNewsRepository_1.PostgresNewsRepository(dbUrl);
        await (0, migrate_1.runMigrations)(dbUrl);
        await newRepo.initialize();
        const retrieved = await newRepo.getById('r1');
        node_assert_1.default.ok(retrieved);
        node_assert_1.default.strictEqual(retrieved.item.id, 'r1');
        await newRepo.close();
    });
    await t.test('✔ Repository doesn\'t mutate caller objects', async () => {
        const item = createAnalyzedItem('m1');
        // If the repo mutates this frozen object, it will throw a TypeError in strict mode
        await repo.save(item);
        node_assert_1.default.strictEqual(item.item.id, 'm1');
        const retrieved = await repo.getById('m1');
        if (retrieved) {
            node_assert_1.default.throws(() => { retrieved.item.id = 'm2'; });
        }
    });
});
//# sourceMappingURL=PostgresNewsRepository.test.js.map