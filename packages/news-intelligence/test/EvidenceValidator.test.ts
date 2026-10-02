import test from 'node:test';
import assert from 'node:assert';
import { EvidenceValidator } from '../src/EvidenceValidator';
import { NewsItem } from '../src/types';

function createValidItem(): NewsItem {
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

test('EvidenceValidator', async (t) => {
  const validator = new EvidenceValidator();

  await t.test('✔ Valid evidence passes', () => {
    const item = createValidItem();
    const result = validator.validate(item);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.status, 'verified');
    assert.strictEqual(result.errors.length, 0);
  });

  await t.test('✔ Missing title fails', () => {
    const item = createValidItem();
    item.title = '   ';
    const result = validator.validate(item);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.status, 'invalid');
    assert.ok(result.errors.some(e => e.includes('Missing or empty title')));
  });

  await t.test('✔ Missing URL fails', () => {
    const item = createValidItem();
    item.url = '';
    const result = validator.validate(item);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.status, 'invalid');
    assert.ok(result.errors.some(e => e.includes('Missing or empty url')));
  });

  await t.test('✔ Invalid URL fails', () => {
    const item = createValidItem();
    item.url = 'not-a-valid-url';
    const result = validator.validate(item);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.status, 'invalid');
    assert.ok(result.errors.some(e => e.includes('Invalid URL format')));
  });

  await t.test('✔ Non-http URL fails', () => {
    const item = createValidItem();
    item.url = 'ftp://example.com';
    const result = validator.validate(item);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.status, 'invalid');
    assert.ok(result.errors.some(e => e.includes('Non-http(s) URL protocol')));
  });

  await t.test('✔ Invalid publishedAt fails', () => {
    const item = createValidItem();
    item.publishedAt = 'impossible-date-format';
    const result = validator.validate(item);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.status, 'invalid');
    assert.ok(result.errors.some(e => e.includes('Invalid publishedAt timestamp')));
  });

  await t.test('✔ Valid ISO timestamp passes', () => {
    const item = createValidItem();
    item.publishedAt = '2025-01-01T00:00:00Z';
    const result = validator.validate(item);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.status, 'verified');
  });

  await t.test('✔ Missing source fails', () => {
    const item = createValidItem();
    item.source = '';
    const result = validator.validate(item);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.status, 'invalid');
    assert.ok(result.errors.some(e => e.includes('Missing or empty source')));
  });

  await t.test('✔ Unverified evidence is not falsely marked verified', () => {
    const item = createValidItem();
    item.publishedAt = null; // Lacks publication date
    const result = validator.validate(item);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.status, 'unverified');
    assert.strictEqual(result.errors.length, 0);
    assert.ok(result.warnings.some(w => w.includes('Missing publishedAt evidence')));
  });

  await t.test('✔ Original provenance is preserved', () => {
    const item = createValidItem();
    const origUrl = item.url;
    const origSource = item.source;
    validator.validate(item);
    assert.strictEqual(item.url, origUrl);
    assert.strictEqual(item.source, origSource);
  });

  await t.test('✔ Validation does not mutate the NewsItem', () => {
    const item = Object.freeze(createValidItem()); // Freezing forces strict immutability
    // If it mutates, it will throw an error in strict mode
    assert.doesNotThrow(() => validator.validate(item));
  });

  await t.test('✔ Multiple related sources remain intact', () => {
    const item = createValidItem();
    const result = validator.validate(item);
    assert.deepStrictEqual(item.relatedSources, ['Other Source']);
    assert.strictEqual(result.valid, true);
  });
});
