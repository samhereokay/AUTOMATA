"use strict";
import test from 'node:test';
import assert from 'node:assert';
import { InMemoryNewsRepository } from '../src/persistence/InMemoryNewsRepository';
import { FeedService } from '../src/FeedService';
import { AnalyzedNewsItem } from '../src/AIAnalyzer';

function createMockAnalyzedItem(id: string, overrides: any = {}): AnalyzedNewsItem {
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

test('FeedService', async (t) => {
  const repo = new InMemoryNewsRepository();
  
  // Seed the repo
  await repo.save(createMockAnalyzedItem('1', { publishedAt: '2024-10-01T12:00:00Z', title: 'A new malware discovered', tags: ['malware', 'critical'] }));
  await repo.save(createMockAnalyzedItem('2', { publishedAt: '2024-10-02T12:00:00Z', category: 'ai', source: 'Source B', severity: 'low', summary: 'AI model released' }));
  await repo.save(createMockAnalyzedItem('3', { publishedAt: '2024-10-03T12:00:00Z', title: 'Data breach at Corp', severity: 'high', tags: ['breach'] }));

  const feed = new FeedService(repo);

  await t.test('✔ Latest items returned', async () => {
    const res = await feed.getLatest();
    assert.strictEqual(res.items.length, 3);
    assert.strictEqual(res.pagination.total, 3);
    // Should be ordered by publishedAt desc, so 3, 2, 1
    assert.strictEqual(res.items[0].item.id, '3');
    assert.strictEqual(res.items[1].item.id, '2');
    assert.strictEqual(res.items[2].item.id, '1');
  });

  await t.test('✔ getById returns correct item', async () => {
    const item = await feed.getById('2');
    assert.ok(item);
    assert.strictEqual(item.item.id, '2');
  });

  await t.test('✔ Missing ID returns null', async () => {
    const item = await feed.getById('999');
    assert.strictEqual(item, null);
  });

  await t.test('✔ Search works', async () => {
    const res = await feed.search('malware');
    assert.strictEqual(res.items.length, 1);
    assert.strictEqual(res.items[0].item.id, '1');

    const res2 = await feed.search('ai model');
    assert.strictEqual(res2.items.length, 1);
    assert.strictEqual(res2.items[0].item.id, '2');
  });

  await t.test('✔ Category filtering works', async () => {
    const res = await feed.getLatest({ category: 'ai' });
    assert.strictEqual(res.items.length, 1);
    assert.strictEqual(res.items[0].item.id, '2');
  });

  await t.test('✔ Source filtering works', async () => {
    const res = await feed.getLatest({ source: 'Source B' });
    assert.strictEqual(res.items.length, 1);
    assert.strictEqual(res.items[0].item.id, '2');
  });

  await t.test('✔ Severity filtering works', async () => {
    const res = await feed.getLatest({ severity: 'high' });
    assert.strictEqual(res.items.length, 1);
    assert.strictEqual(res.items[0].item.id, '3');
  });

  await t.test('✔ Pagination works', async () => {
    const res = await feed.getLatest({ limit: 2, offset: 1 });
    assert.strictEqual(res.items.length, 2);
    // Should be items [2] and [1] in sorting order
    assert.strictEqual(res.items[0].item.id, '2');
    assert.strictEqual(res.items[1].item.id, '1');
    assert.strictEqual(res.pagination.limit, 2);
    assert.strictEqual(res.pagination.offset, 1);
  });

  await t.test('✔ Results are ordered deterministically', async () => {
    // Already verified in "Latest items returned" and "Pagination works" (descending publishedAt)
    const res = await feed.getLatest();
    assert.strictEqual(res.items[0].item.id, '3');
    assert.strictEqual(res.items[1].item.id, '2');
    assert.strictEqual(res.items[2].item.id, '1');
  });

  await t.test('✔ Feed cannot mutate repository records', async () => {
    const res = await feed.getLatest();
    const item = res.items[0];
    assert.throws(() => {
      (item.item as any).title = 'Hacked via feed';
    });
    
    // Typecast to any to get access to repo to check if there is a method delete
    assert.strictEqual((feed as any).delete, undefined);
    assert.strictEqual((feed as any).save, undefined);
  });

  await t.test('✔ Original evidence remains unchanged', async () => {
    const item = await feed.getById('1');
    assert.strictEqual(item?.item.publishedAt, '2024-10-01T12:00:00Z');
  });

  await t.test('✔ Empty repository returns valid empty feed', async () => {
    const emptyRepo = new InMemoryNewsRepository();
    const emptyFeed = new FeedService(emptyRepo);
    const res = await emptyFeed.getLatest();
    assert.deepStrictEqual(res.items, []);
    assert.strictEqual(res.pagination.total, 0);
  });
});
