"use strict";
import test from 'node:test';
import assert from 'node:assert';
import { TelegramService, TelegramProvider } from '../src/TelegramService';
import { InMemoryNotificationStateRepository } from '../src/persistence/InMemoryNotificationStateRepository';
import { AnalyzedNewsItem } from '../src/AIAnalyzer';

class MockTelegramProvider implements TelegramProvider {
  public messages: {chatId: string, message: string}[] = [];
  public shouldFail = false;
  public configured = true;

  isConfigured(): boolean {
    return this.configured;
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    if (this.shouldFail) throw new Error('Telegram API failure');
    this.messages.push({ chatId, message });
  }
}

function createMockAnalyzedItem(id: string, overrides: any = {}): AnalyzedNewsItem {
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

test('TelegramService', async (t) => {
  let provider: MockTelegramProvider;
  let stateRepo: InMemoryNotificationStateRepository;
  let service: TelegramService;

  t.beforeEach(() => {
    provider = new MockTelegramProvider();
    stateRepo = new InMemoryNotificationStateRepository();
    service = new TelegramService(provider, stateRepo, '@testchannel');
  });

  await t.test('✔ Valid item produces Telegram message', async () => {
    const item = createMockAnalyzedItem('1');
    const sent = await service.notify(item);
    
    assert.strictEqual(sent, true);
    assert.strictEqual(provider.messages.length, 1);
  });

  await t.test('✔ Message contains title, summary, source', async () => {
    const item = createMockAnalyzedItem('2', {
      title: 'Critical RCE',
      summary: 'A new RCE was found.',
      source: 'Hacker News'
    });
    await service.notify(item);
    const msg = provider.messages[0].message;
    
    assert.ok(msg.includes('Critical RCE'));
    assert.ok(msg.includes('A new RCE was found.'));
    assert.ok(msg.includes('Source:\nHacker News'));
  });

  await t.test('✔ Unverified item handles missing publishedAt', async () => {
    const item = createMockAnalyzedItem('4', {
      validationStatus: 'unverified',
      publishedAt: null
    });
    await service.notify(item);
    const msg = provider.messages[0].message;
    
    assert.ok(msg.includes('Published:\nUnknown'));
  });

  await t.test('✔ Provider receives correct chat ID', async () => {
    const item = createMockAnalyzedItem('5');
    await service.notify(item);
    assert.strictEqual(provider.messages[0].chatId, '@testchannel');

    // Override
    await service.notify(createMockAnalyzedItem('6'), 'exec123', '@customchannel');
    assert.strictEqual(provider.messages[1].chatId, '@customchannel');
  });

  await t.test('✔ Provider failure propagates deterministically', async () => {
    provider.shouldFail = true;
    const item = createMockAnalyzedItem('7');
    
    await assert.rejects(
      async () => await service.notify(item),
      /Telegram API failure/
    );

    // Verify it wasn't marked as sent
    const sent = await stateRepo.hasBeenSent('telegram', '7');
    assert.strictEqual(sent, false);
  });

  await t.test('✔ Formatter does not mutate NewsItem', async () => {
    const item = createMockAnalyzedItem('8');
    service.formatMessage(item);
    
    assert.throws(() => {
      (item.item as any).title = 'Hacked';
    });
  });

  await t.test('✔ Same canonical story can be suppressed from duplicate notification', async () => {
    const item = createMockAnalyzedItem('9');
    
    // First notify
    const sent1 = await service.notify(item);
    assert.strictEqual(sent1, true);
    assert.strictEqual(provider.messages.length, 1);
    
    // Duplicate notify (same canonical ID)
    const duplicateItem = createMockAnalyzedItem('9', { source: 'Another Source' });
    const sent2 = await service.notify(duplicateItem);
    
    assert.strictEqual(sent2, false);
    assert.strictEqual(provider.messages.length, 1); // No new message sent
  });

  await t.test('✔ isConfigured delegates to provider', async () => {
    provider.configured = true;
    assert.strictEqual(service.isConfigured(), true);

    provider.configured = false;
    assert.strictEqual(service.isConfigured(), false);
  });
});
