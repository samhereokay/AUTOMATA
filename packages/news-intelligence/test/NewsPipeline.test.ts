"use strict";
import test from 'node:test';
import assert from 'node:assert';
import { NewsPipeline } from '../src/NewsPipeline';
import { CybersecCollector } from '../src/CybersecCollector';
import { Deduplicator } from '../src/Deduplicator';
import { EvidenceValidator } from '../src/EvidenceValidator';
import { AIAnalyzer, AIProvider } from '../src/AIAnalyzer';
import { InMemoryNewsRepository } from '../src/persistence/InMemoryNewsRepository';
import { InMemoryNotificationStateRepository } from '../src/persistence/InMemoryNotificationStateRepository';
import { TelegramService, TelegramProvider } from '../src/TelegramService';
import { NewsItem } from '../src/types';

class MockCollector {
  constructor(private name: string, private items: NewsItem[], private shouldFail = false) {}
  async collect(): Promise<NewsItem[]> {
    if (this.shouldFail) throw new Error(`${this.name} failed`);
    return this.items;
  }
}

class MockAIProvider implements AIProvider {
  public shouldFail = false;
  async analyze(input: string): Promise<string> {
    if (this.shouldFail) throw new Error('AI Provider offline');
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

class MockTelegramProvider implements TelegramProvider {
  public shouldFail = false;
  public messages: any[] = [];
  isConfigured(): boolean { return true; }
  async sendMessage(chatId: string, message: string): Promise<void> {
    if (this.shouldFail) throw new Error('Telegram failed');
    this.messages.push({chatId, message});
  }
}

function createItem(id: string, overrides: any = {}): NewsItem {
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

test('NewsPipeline', async (t) => {
  let deduplicator: Deduplicator;
  let validator: EvidenceValidator;
  let aiProvider: MockAIProvider;
  let analyzer: AIAnalyzer;
  let repository: InMemoryNewsRepository;
  let stateRepo: InMemoryNotificationStateRepository;
  let telegramProvider: MockTelegramProvider;
  let telegramService: TelegramService;

  t.beforeEach(() => {
    deduplicator = new Deduplicator();
    validator = new EvidenceValidator();
    aiProvider = new MockAIProvider();
    analyzer = new AIAnalyzer(aiProvider);
    repository = new InMemoryNewsRepository();
    stateRepo = new InMemoryNotificationStateRepository();
    telegramProvider = new MockTelegramProvider();
    telegramService = new TelegramService(telegramProvider, stateRepo, '@channel');
  });

  await t.test('✔ Complete pipeline processes valid news', async () => {
    const collectors = [
      new MockCollector('C1', [createItem('1'), createItem('2')]),
      new MockCollector('C2', [createItem('3')])
    ];
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    
    const res = await pipeline.run();
    assert.strictEqual(res.collected, 3);
    assert.strictEqual(res.deduplicated, 3);
    assert.strictEqual(res.validated, 3);
    assert.strictEqual(res.analyzed, 3);
    assert.strictEqual(res.persisted, 3);
    assert.strictEqual(res.notified, 3);
    assert.strictEqual(res.failures.length, 0);

    const saved = await repository.list();
    assert.strictEqual(saved.length, 3);
  });

  await t.test('✔ Collector failure doesn\'t crash unrelated sources', async () => {
    const collectors = [
      new MockCollector('C1', [createItem('1')]),
      new MockCollector('C2', [], true), // Fails
      new MockCollector('C3', [createItem('3')])
    ];
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    
    const res = await pipeline.run();
    assert.strictEqual(res.collected, 2);
    assert.strictEqual(res.persisted, 2);
    assert.strictEqual(res.failures.length, 1);
    assert.ok(res.failures[0].message.includes('C2 failed'));
  });

  await t.test('✔ Duplicate stories are processed once', async () => {
    const collectors = [
      new MockCollector('C1', [createItem('1', { title: 'Exact Match', url: 'https://exact.com' })]),
      new MockCollector('C2', [createItem('2', { title: 'Exact Match', url: 'https://exact.com' })])
    ];
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    
    const res = await pipeline.run();
    assert.strictEqual(res.collected, 2);
    assert.strictEqual(res.deduplicated, 1);
    assert.strictEqual(res.persisted, 1);
    assert.strictEqual(res.failures.length, 0);
  });

  await t.test('✔ Invalid evidence isn\'t analyzed', async () => {
    const invalidItem = createItem('1', { url: 'not-a-url' });
    const validItem = createItem('2');
    const collectors = [new MockCollector('C1', [invalidItem, validItem])];
    
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    
    const res = await pipeline.run();
    assert.strictEqual(res.collected, 2);
    assert.strictEqual(res.deduplicated, 2);
    assert.strictEqual(res.validated, 1); // 1 valid
    assert.strictEqual(res.analyzed, 1);
    assert.strictEqual(res.persisted, 1);
    assert.strictEqual(res.failures.length, 1);
    assert.ok(res.failures[0].message.includes('Validation failed'));
  });

  await t.test('✔ AI failure doesn\'t fabricate analysis and preserves validated news', async () => {
    aiProvider.shouldFail = true;
    const collectors = [new MockCollector('C1', [createItem('1')])];
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    
    const res = await pipeline.run();
    assert.strictEqual(res.collected, 1);
    assert.strictEqual(res.validated, 1);
    assert.strictEqual(res.analyzed, 0); // AI failed
    assert.strictEqual(res.persisted, 1); // But still persisted
    assert.strictEqual(res.notified, 1); // And notified
    assert.strictEqual(res.failures.length, 1);
    assert.ok(res.failures[0].message.includes('Analysis failed'));

    const saved = await repository.getById('1');
    assert.ok(saved);
    assert.strictEqual(saved.analysis, undefined); // No fabricated analysis
  });

  await t.test('✔ Persistence failure doesn\'t report success', async () => {
    const brokenRepo = new InMemoryNewsRepository();
    brokenRepo.save = async () => { throw new Error('DB Down'); };
    
    const collectors = [new MockCollector('C1', [createItem('1')])];
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, brokenRepo, telegramService);
    
    const res = await pipeline.run();
    assert.strictEqual(res.analyzed, 1);
    assert.strictEqual(res.persisted, 0);
    assert.strictEqual(res.notified, 0); // Should not notify if persistence failed
    assert.strictEqual(res.failures.length, 1);
    assert.ok(res.failures[0].message.includes('Persistence failed'));
  });

  await t.test('✔ Telegram failure doesn\'t lose persisted news', async () => {
    telegramProvider.shouldFail = true;
    const collectors = [new MockCollector('C1', [createItem('1')])];
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    
    const res = await pipeline.run();
    assert.strictEqual(res.persisted, 1);
    assert.strictEqual(res.notified, 0);
    assert.strictEqual(res.failures.length, 1);
    assert.ok(res.failures[0].message.includes('Telegram notification failed'));

    // Should still be in DB
    const saved = await repository.list();
    assert.strictEqual(saved.length, 1);
  });

  await t.test('✔ Pipeline preserves evidence status', async () => {
    const unverified = createItem('1', { publishedAt: null });
    const collectors = [new MockCollector('C1', [unverified])];
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    
    await pipeline.run();
    const saved = await repository.getById('1');
    assert.strictEqual(saved?.validation.status, 'unverified');
  });

  await t.test('✔ Pipeline does not mutate source data', async () => {
    const item = createItem('1');
    // Freeze source data
    Object.freeze(item);
    
    const collectors = [new MockCollector('C1', [item])];
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    
    // If anything mutates `item` directly, this will throw in strict mode
    await pipeline.run();
    assert.strictEqual(item.title, 'Title 1');
  });

  await t.test('✔ Pipeline returns structured execution results', async () => {
    const collectors = [new MockCollector('C1', [createItem('1')])];
    const pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
    
    const res = await pipeline.run();
    assert.deepStrictEqual(Object.keys(res).sort(), [
      'analyzed', 'collected', 'deduplicated', 'executionId', 'failures', 'notified', 'persisted', 'telegramConfigured', 'validated'
    ]);
  });
});
