"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const TelegramService_1 = require("../src/TelegramService");
const InMemoryNotificationStateRepository_1 = require("../src/persistence/InMemoryNotificationStateRepository");
class MockTelegramProvider {
    messages = [];
    shouldFail = false;
    configured = true;
    isConfigured() {
        return this.configured;
    }
    async sendMessage(chatId, message) {
        if (this.shouldFail)
            throw new Error('Telegram API failure');
        this.messages.push({ chatId, message });
    }
}
function createMockAnalyzedItem(id, overrides = {}) {
    return {
        item: Object.freeze({
            id,
            title: overrides.title || `Title ${id}`,
            url: `https://example.com/${id}`,
            source: overrides.source || 'Source A',
            publishedAt: overrides.publishedAt !== undefined ? overrides.publishedAt : '2024-10-01T12:00:00Z',
            collectedAt: new Date().toISOString(),
            category: 'cybersecurity',
            relatedSources: overrides.relatedSources || undefined
        }),
        validation: Object.freeze({
            valid: true,
            status: overrides.validationStatus || 'verified',
            errors: [],
            warnings: []
        }),
        analysis: Object.freeze({
            summary: overrides.summary || 'Test summary',
            keyPoints: overrides.keyPoints || ['Point 1', 'Point 2'],
            entities: [],
            technologies: [],
            tags: ['tag1'],
            severity: overrides.severity || 'high'
        })
    };
}
(0, node_test_1.default)('TelegramService', async (t) => {
    let provider;
    let stateRepo;
    let service;
    t.beforeEach(() => {
        provider = new MockTelegramProvider();
        stateRepo = new InMemoryNotificationStateRepository_1.InMemoryNotificationStateRepository();
        service = new TelegramService_1.TelegramService(provider, stateRepo, '@testchannel');
    });
    await t.test('✔ Valid item produces Telegram message', async () => {
        const item = createMockAnalyzedItem('1');
        const sent = await service.notify(item);
        node_assert_1.default.strictEqual(sent, true);
        node_assert_1.default.strictEqual(provider.messages.length, 1);
    });
    await t.test('✔ Message contains title, summary, source', async () => {
        const item = createMockAnalyzedItem('2', {
            title: 'Critical RCE',
            summary: 'A new RCE was found.',
            source: 'Hacker News'
        });
        await service.notify(item);
        const msg = provider.messages[0].message;
        node_assert_1.default.ok(msg.includes('Critical RCE'));
        node_assert_1.default.ok(msg.includes('A new RCE was found.'));
        node_assert_1.default.ok(msg.includes('Source:\nHacker News'));
    });
    await t.test('✔ Unverified item handles missing publishedAt', async () => {
        const item = createMockAnalyzedItem('4', {
            validationStatus: 'unverified',
            publishedAt: null
        });
        await service.notify(item);
        const msg = provider.messages[0].message;
        node_assert_1.default.ok(msg.includes('Published:\nUnknown'));
    });
    await t.test('✔ Provider receives correct chat ID', async () => {
        const item = createMockAnalyzedItem('5');
        await service.notify(item);
        node_assert_1.default.strictEqual(provider.messages[0].chatId, '@testchannel');
        // Override
        await service.notify(createMockAnalyzedItem('6'), 'exec123', '@customchannel');
        node_assert_1.default.strictEqual(provider.messages[1].chatId, '@customchannel');
    });
    await t.test('✔ Provider failure propagates deterministically', async () => {
        provider.shouldFail = true;
        const item = createMockAnalyzedItem('7');
        await node_assert_1.default.rejects(async () => await service.notify(item), /Telegram API failure/);
        // Verify it wasn't marked as sent
        const sent = await stateRepo.hasBeenSent('telegram', '7');
        node_assert_1.default.strictEqual(sent, false);
    });
    await t.test('✔ Formatter does not mutate NewsItem', async () => {
        const item = createMockAnalyzedItem('8');
        service.formatMessage(item);
        node_assert_1.default.throws(() => {
            item.item.title = 'Hacked';
        });
    });
    await t.test('✔ Same canonical story can be suppressed from duplicate notification', async () => {
        const item = createMockAnalyzedItem('9');
        // First notify
        const sent1 = await service.notify(item);
        node_assert_1.default.strictEqual(sent1, true);
        node_assert_1.default.strictEqual(provider.messages.length, 1);
        // Duplicate notify (same canonical ID)
        const duplicateItem = createMockAnalyzedItem('9', { source: 'Another Source' });
        const sent2 = await service.notify(duplicateItem);
        node_assert_1.default.strictEqual(sent2, false);
        node_assert_1.default.strictEqual(provider.messages.length, 1); // No new message sent
    });
    await t.test('✔ isConfigured delegates to provider', async () => {
        provider.configured = true;
        node_assert_1.default.strictEqual(service.isConfigured(), true);
        provider.configured = false;
        node_assert_1.default.strictEqual(service.isConfigured(), false);
    });
});
//# sourceMappingURL=TelegramService.test.js.map