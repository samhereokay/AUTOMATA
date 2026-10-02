"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const PostgresNotificationStateRepository_1 = require("../src/persistence/PostgresNotificationStateRepository");
const PostgresNewsRepository_1 = require("../src/persistence/PostgresNewsRepository");
const migrate_1 = require("../src/persistence/migrate");
const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) {
    console.log('Skipping Postgres tests: TEST_DATABASE_URL not set');
    process.exit(0);
}
if (dbUrl.includes('automata') && !dbUrl.includes('automata_test')) {
    console.error('Safety abort: TEST_DATABASE_URL appears to point to production/application DB!');
    process.exit(1);
}
(0, node_test_1.default)('PostgresNotificationStateRepository', async (t) => {
    const stateRepo = new PostgresNotificationStateRepository_1.PostgresNotificationStateRepository(dbUrl);
    const newsRepo = new PostgresNewsRepository_1.PostgresNewsRepository(dbUrl);
    t.before(async () => {
        await (0, migrate_1.runMigrations)(dbUrl);
        await newsRepo.initialize();
        await stateRepo.initialize();
    });
    t.after(async () => {
        await newsRepo.close();
        await stateRepo.close();
    });
    t.beforeEach(async () => {
        const { Pool } = (await import('pg')).default;
        const pool = new Pool({ connectionString: dbUrl });
        await pool.query('TRUNCATE TABLE notification_deliveries CASCADE');
        await pool.query('TRUNCATE TABLE news_items CASCADE');
        await pool.end();
    });
    await t.test('✔ New story has no delivery record', async () => {
        const sent = await stateRepo.hasBeenSent('telegram', 'news-1');
        node_assert_1.default.strictEqual(sent, false);
    });
    await t.test('✔ markSent creates delivery record and ✔ hasBeenSent returns true afterward', async () => {
        await stateRepo.markSent('telegram', 'news-2');
        const sent = await stateRepo.hasBeenSent('telegram', 'news-2');
        node_assert_1.default.strictEqual(sent, true);
    });
    await t.test('✔ Same story/channel is idempotent', async () => {
        await stateRepo.markSent('telegram', 'news-3');
        await stateRepo.markSent('telegram', 'news-3'); // Should not throw
        const sent = await stateRepo.hasBeenSent('telegram', 'news-3');
        node_assert_1.default.strictEqual(sent, true);
    });
    await t.test('✔ Different story can be sent', async () => {
        await stateRepo.markSent('telegram', 'news-4');
        const sent4 = await stateRepo.hasBeenSent('telegram', 'news-4');
        node_assert_1.default.strictEqual(sent4, true);
        const sent5 = await stateRepo.hasBeenSent('telegram', 'news-5');
        node_assert_1.default.strictEqual(sent5, false);
    });
    await t.test('✔ Same story on different channel is independent', async () => {
        await stateRepo.markSent('telegram', 'news-6');
        const sentDiscord = await stateRepo.hasBeenSent('discord', 'news-6');
        node_assert_1.default.strictEqual(sentDiscord, false);
    });
    await t.test('✔ Delivery state survives repository recreation (service restart)', async () => {
        await stateRepo.markSent('telegram', 'news-7');
        const freshRepo = new PostgresNotificationStateRepository_1.PostgresNotificationStateRepository(dbUrl);
        // don't run initialize(), just check if state is there
        const sent = await freshRepo.hasBeenSent('telegram', 'news-7');
        node_assert_1.default.strictEqual(sent, true);
        await freshRepo.close();
    });
    await t.test('✔ Concurrent attempts don\'t create duplicate state records', async () => {
        const promises = [
            stateRepo.markSent('telegram', 'news-8'),
            stateRepo.markSent('telegram', 'news-8'),
            stateRepo.markSent('telegram', 'news-8')
        ];
        await Promise.all(promises); // Should not throw unique constraint violations due to ON CONFLICT DO NOTHING
        const sent = await stateRepo.hasBeenSent('telegram', 'news-8');
        node_assert_1.default.strictEqual(sent, true);
        const { Pool } = (await import('pg')).default;
        const pool = new Pool({ connectionString: dbUrl });
        const res = await pool.query('SELECT count(*) FROM notification_deliveries WHERE channel = $1 AND news_item_id = $2', ['telegram', 'news-8']);
        node_assert_1.default.strictEqual(parseInt(res.rows[0].count), 1);
        await pool.end();
    });
});
//# sourceMappingURL=PostgresNotificationStateRepository.test.js.map