import test from 'node:test';
import assert from 'node:assert';
import { Deduplicator } from '../src/Deduplicator';
import { NewsItem } from '../src/types';

function createMockItem(id: string, title: string, source: string, url: string): NewsItem {
  return {
    id,
    title,
    source,
    url,
    publishedAt: new Date().toISOString(),
    collectedAt: new Date().toISOString(),
    category: 'cybersecurity',
  };
}

test('Deduplicator rules', async (t) => {
  const dedup = new Deduplicator();

  await t.test('1. Exact ID match deduplication', () => {
    const items = [
      createMockItem('123', 'A unique title', 'Source A', 'https://example.com/a'),
      createMockItem('123', 'Different title', 'Source B', 'https://example.com/b'),
    ];
    const results = dedup.deduplicate(items);
    assert.strictEqual(results.length, 1);
    assert.deepStrictEqual(results[0].relatedSources, ['Source A', 'Source B']);
  });

  await t.test('2. Normalized URL match (ignores tracking params and trailing slash)', () => {
    const items = [
      createMockItem('1', 'Article A', 'Source A', 'https://example.com/story/'),
      createMockItem('2', 'Completely different title', 'Source B', 'https://example.com/story?utm_source=rss&ref=tw'),
    ];
    const results = dedup.deduplicate(items);
    assert.strictEqual(results.length, 1);
    assert.deepStrictEqual(results[0].relatedSources, ['Source A', 'Source B']);
  });

  await t.test('3. Strong normalized title match', () => {
    const items = [
      createMockItem('1', 'Critical vulnerability found in X!', 'Source A', 'https://a.com'),
      createMockItem('2', 'critical vulnerability found in x', 'Source B', 'https://b.com'),
    ];
    const results = dedup.deduplicate(items);
    assert.strictEqual(results.length, 1);
    assert.deepStrictEqual(results[0].relatedSources, ['Source A', 'Source B']);
  });

  await t.test('4. Non-matching items are kept separate', () => {
    const items = [
      createMockItem('1', 'Title A', 'Source A', 'https://a.com'),
      createMockItem('2', 'Title B', 'Source B', 'https://b.com'),
    ];
    const results = dedup.deduplicate(items);
    assert.strictEqual(results.length, 2);
    // Should not populate relatedSources if there are no duplicates
    assert.strictEqual(results[0].relatedSources, undefined);
    assert.strictEqual(results[1].relatedSources, undefined);
  });

  await t.test('5. Merging does not lose the original source', () => {
    const items = [
      createMockItem('1', 'Same Title', 'Source A', 'https://a.com'),
      createMockItem('2', 'Same Title', 'Source B', 'https://b.com'),
      createMockItem('3', 'Same Title', 'Source C', 'https://c.com'),
    ];
    const results = dedup.deduplicate(items);
    assert.strictEqual(results.length, 1);
    assert.deepStrictEqual(results[0].relatedSources, ['Source A', 'Source B', 'Source C']);
  });
});
