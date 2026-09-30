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
import { FeedService } from '../src/FeedService';
import { NewsItem } from '../src/types';

class MockCollector {
  constructor(private name: string, private items: NewsItem[]) {}
  async collect(): Promise<NewsItem[]> {
    return this.items;
  }
}

class MockAIProvider implements AIProvider {
  public shouldFail = false;
  async analyze(input: string): Promise<string> {
    if (this.shouldFail) throw new Error('AI Provider offline');
    
    // Check if input contains 'Y' to differentiate analysis
    const isY = input.includes('Story Y');
    return JSON.stringify({
      summary: isY ? "Summary for Y" : "Summary for X",
      keyPoints: ["Keypoint 1", "Keypoint 2"],
      entities: ["Entity"],
      technologies: ["Tech"],
      tags: ["tag1", "tag2"],
      severity: "high"
    });
  }
}

class MockTelegramProvider implements TelegramProvider {
  public shouldFail = false;
  public messages: any[] = [];
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
    publishedAt: overrides.publishedAt !== undefined ? overrides.publishedAt : '2024-10-01T12:00:00Z',
    collectedAt: new Date().toISOString(),
    category: 'cybersecurity',
    metadata: overrides.metadata || {}
  };
}

test('NewsIntelligence E2E', async (t) => {
  let deduplicator: Deduplicator;
  let validator: EvidenceValidator;
  let aiProvider: MockAIProvider;
  let analyzer: AIAnalyzer;
  let repository: InMemoryNewsRepository;
  let stateRepo: InMemoryNotificationStateRepository;
  let telegramProvider: MockTelegramProvider;
  let telegramService: TelegramService;
  let feedService: FeedService;
  let collectors: any[];
  let pipeline: NewsPipeline;

  t.beforeEach(() => {
    deduplicator = new Deduplicator();
    validator = new EvidenceValidator();
    aiProvider = new MockAIProvider();
    analyzer = new AIAnalyzer(aiProvider);
    repository = new InMemoryNewsRepository();
    stateRepo = new InMemoryNotificationStateRepository();
    telegramProvider = new MockTelegramProvider();
    telegramService = new TelegramService(telegramProvider, stateRepo, '@channel');
    feedService = new FeedService(repository);

    // Setup Scenario:
    // Source A -> Story X
    // Source B -> Story X
    // Source C -> Story Y
    // Source D -> malformed item (missing url)
    const itemA = createItem('A1', { title: 'Story X', url: 'https://x.com/story', source: 'Source A' });
    const itemB = createItem('B1', { title: 'Story X!', url: 'https://x.com/story?ref=rss', source: 'Source B' });
    const itemC = createItem('C1', { title: 'Story Y', url: 'https://y.com/story', source: 'Source C' });
    const itemD = createItem('D1', { title: 'Story Z', url: 'invalid-url', source: 'Source D' }); // Validation will fail

    // Freeze inputs to ensure no mutation
    Object.freeze(itemA);
    Object.freeze(itemB);
    Object.freeze(itemC);
    Object.freeze(itemD);

    collectors = [
      new MockCollector('Collector1', [itemA, itemB]),
      new MockCollector('Collector2', [itemC, itemD])
    ];

    pipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, repository, telegramService);
  });

  await t.test('✔ E2E Normal Scenario (Multiple sources merge, Invalid rejected, AI/Validation/Feed/Telegram succeed)', async () => {
    const res = await pipeline.run();

    // Verification of pipeline execution result
    assert.strictEqual(res.collected, 4, 'Should collect 4 items');
    assert.strictEqual(res.deduplicated, 3, 'Should deduplicate to 3 canonical stories (X, Y, Z)');
    assert.strictEqual(res.validated, 2, 'Should validate 2 stories (X, Y). Z is invalid');
    assert.strictEqual(res.analyzed, 2, 'Should analyze 2 stories');
    assert.strictEqual(res.persisted, 2, 'Should persist 2 stories');
    assert.strictEqual(res.notified, 2, 'Should notify 2 stories');
    
    // Z failure should be in failures
    assert.strictEqual(res.failures.length, 1);
    assert.ok(res.failures[0].message.includes('Validation failed'));

    // Feed Verification
    const feed = await feedService.getLatest();
    assert.strictEqual(feed.items.length, 2);

    // Story X verification
    const storyX = feed.items.find(i => i.item.url.includes('x.com'));
    assert.ok(storyX);
    assert.strictEqual(storyX.validation.status, 'verified');
    assert.strictEqual(storyX.analysis?.summary, 'Summary for X');
    assert.ok(storyX.item.relatedSources?.includes('Source A'));
    assert.ok(storyX.item.relatedSources?.includes('Source B'));

    // Story Y verification
    const storyY = feed.items.find(i => i.item.url.includes('y.com'));
    assert.ok(storyY);
    assert.strictEqual(storyY.analysis?.summary, 'Summary for Y');

    // Telegram Verification
    assert.strictEqual(telegramProvider.messages.length, 2);
    const msgX = telegramProvider.messages.find(m => m.message.includes('Story X'));
    assert.ok(msgX);
    assert.ok(msgX.message.includes('Related Sources: Source A, Source B'));
    assert.ok(msgX.message.includes('Summary for X'));
  });

  await t.test('✔ AI failure doesn\'t lose validated stories', async () => {
    aiProvider.shouldFail = true;
    const res = await pipeline.run();

    assert.strictEqual(res.validated, 2);
    assert.strictEqual(res.analyzed, 0, 'AI should fail');
    assert.strictEqual(res.persisted, 2, 'Validated stories still persisted');
    
    const feed = await feedService.getLatest();
    assert.strictEqual(feed.items.length, 2);
    assert.strictEqual(feed.items[0].validation.status, 'verified'); // Evidence status survives
    assert.strictEqual(feed.items[0].analysis, undefined); // No fabricated analysis
  });

  await t.test('✔ Telegram failure doesn\'t lose persisted stories', async () => {
    telegramProvider.shouldFail = true;
    const res = await pipeline.run();

    assert.strictEqual(res.persisted, 2);
    assert.strictEqual(res.notified, 0, 'Telegram failed');
    
    const feed = await feedService.getLatest();
    assert.strictEqual(feed.items.length, 2, 'Still in repo/feed');
  });

  await t.test('✔ Re-running identical input is idempotent', async () => {
    // Run once
    await pipeline.run();
    
    // Run exactly the same input again
    const res2 = await pipeline.run();

    assert.strictEqual(res2.collected, 4);
    assert.strictEqual(res2.deduplicated, 3);
    assert.strictEqual(res2.validated, 2);
    assert.strictEqual(res2.analyzed, 2); // It will analyze them again (no DB cache at this layer)
    assert.strictEqual(res2.persisted, 2); // Will save them to repo
    assert.strictEqual(res2.notified, 0, 'Should not notify again for the same canonical stories');

    const feed = await feedService.getLatest();
    assert.strictEqual(feed.items.length, 2, 'Should still only be 2 canonical stories in the DB');
    assert.strictEqual(telegramProvider.messages.length, 2, 'Should still only have 2 messages total');
  });
});
