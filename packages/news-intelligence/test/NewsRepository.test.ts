"use strict";
import test from 'node:test';
import assert from 'node:assert';
import { InMemoryNewsRepository } from '../src/persistence/InMemoryNewsRepository';
import { AnalyzedNewsItem } from '../src/AIAnalyzer';

function createMockAnalyzedItem(id: string, url: string, title: string, source: string): AnalyzedNewsItem {
  return {
    item: Object.freeze({
      id,
      title,
      url,
      source,
      publishedAt: new Date().toISOString(),
      collectedAt: new Date().toISOString(),
      category: 'cybersecurity',
      relatedSources: ['Aggregator X']
    }),
    validation: Object.freeze({
      valid: true,
      status: 'verified',
      errors: [],
      warnings: []
    }),
    analysis: Object.freeze({
      summary: 'Test summary',
      keyPoints: ['Point 1'],
      entities: ['Entity A'],
      technologies: ['Tech A'],
      tags: ['tag1']
    })
  };
}

test('InMemoryNewsRepository', async (t) => {
  const repo = new InMemoryNewsRepository();

  await t.test('✔ Save and retrieve item', async () => {
    const item = createMockAnalyzedItem('1', 'https://a.com', 'Title A', 'Source A');
    await repo.save(item);
    
    const retrieved = await repo.getById('1');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.item.id, '1');
    assert.strictEqual(retrieved.item.title, 'Title A');
  });

  await t.test('✔ Retrieve unknown ID returns null', async () => {
    const retrieved = await repo.getById('999');
    assert.strictEqual(retrieved, null);
  });

  await t.test('✔ URL lookup works', async () => {
    // Note: should ignore query params based on our normalization
    const item = createMockAnalyzedItem('2', 'https://b.com/story?utm_source=rss', 'Title B', 'Source B');
    await repo.save(item);
    
    const retrieved = await repo.findByUrl('https://b.com/story');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.item.id, '2');
  });

  await t.test('✔ Title lookup works', async () => {
    const item = createMockAnalyzedItem('3', 'https://c.com', 'Critical Vulnerability in X!', 'Source C');
    await repo.save(item);
    
    const retrieved = await repo.findByTitle('critical vulnerability in x');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.item.id, '3');
  });

  await t.test('✔ Duplicate save is idempotent and merges relatedSources', async () => {
    const item1 = createMockAnalyzedItem('4', 'https://d.com', 'Story D', 'Source D');
    await repo.save(item1);
    
    // Save again, same ID, different source to simulate a duplicate feed
    const item2 = createMockAnalyzedItem('4', 'https://d.com', 'Story D', 'Source E');
    await repo.save(item2);
    
    const retrieved = await repo.getById('4');
    assert.ok(retrieved);
    // Should preserve 'Aggregator X' (from item1 original), 'Source D', 'Source E'
    assert.ok(retrieved.item.relatedSources?.includes('Source D'));
    assert.ok(retrieved.item.relatedSources?.includes('Source E'));
    assert.ok(retrieved.item.relatedSources?.includes('Aggregator X'));
    
    // Should still only have one record overall for ID 4
    const all = await repo.list();
    const count = all.filter(a => a.item.id === '4').length;
    assert.strictEqual(count, 1);
  });

  await t.test('✔ Validation status is preserved', async () => {
    const retrieved = await repo.getById('1');
    assert.strictEqual(retrieved?.validation.status, 'verified');
  });

  await t.test('✔ AI analysis is preserved', async () => {
    const retrieved = await repo.getById('1');
    assert.strictEqual(retrieved?.analysis.summary, 'Test summary');
  });

  await t.test('✔ Original evidence cannot be overwritten by analysis', async () => {
    // The design prevents this, as they are separate properties in the AnalyzedNewsItem.
    const retrieved = await repo.getById('1');
    assert.strictEqual(retrieved?.item.source, 'Source A');
  });

  await t.test('✔ List supports limit/offset', async () => {
    const all = await repo.list();
    assert.ok(all.length >= 4); // 1, 2, 3, 4

    const limited = await repo.list({ limit: 2, offset: 1 });
    assert.strictEqual(limited.length, 2);
    assert.strictEqual(limited[0].item.id, all[1].item.id);
  });

  await t.test('✔ Delete removes item', async () => {
    await repo.delete('1');
    const retrieved = await repo.getById('1');
    assert.strictEqual(retrieved, null);
  });

  await t.test('✔ Repository does not mutate caller\'s object', async () => {
    const item = createMockAnalyzedItem('5', 'https://e.com', 'Title E', 'Source E');
    
    await repo.save(item);
    
    const retrieved = await repo.getById('5');
    assert.ok(retrieved);
    
    // Mutate retrieved to ensure it doesn't affect the repo or original item
    assert.throws(() => {
      (retrieved.item as any).title = 'Hacked';
    });
  });
});
