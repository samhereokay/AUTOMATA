import test from 'node:test';
import assert from 'node:assert';
import { buildApiUrl, renderFeedItem, renderStoryDetail, formatSeverity } from '../app.js';

test('Frontend rendering logic (app.js)', async (t) => {
  
  await t.test('✔ buildApiUrl constructs correct endpoints and query strings', () => {
    const base = 'http://api.test';
    
    // Default
    let url = buildApiUrl(base, { search: '', category: '', severity: '' }, 1);
    assert.strictEqual(url, 'http://api.test/api/news?page=1&limit=10');
    
    // With category and severity
    url = buildApiUrl(base, { search: '', category: 'cybersecurity', severity: 'high' }, 2);
    assert.ok(url.includes('/api/news?'));
    assert.ok(url.includes('category=cybersecurity'));
    assert.ok(url.includes('severity=high'));
    assert.ok(url.includes('page=2'));
    assert.ok(url.includes('limit=10'));

    // With search
    url = buildApiUrl(base, { search: 'ransomware', category: '', severity: '' }, 1);
    assert.ok(url.includes('/api/news/search?'));
    assert.ok(url.includes('query=ransomware'));
    assert.ok(!url.includes('category='));
  });

  await t.test('✔ formatSeverity handles edge cases', () => {
    assert.strictEqual(formatSeverity(''), '');
    assert.strictEqual(formatSeverity(null), '');
    assert.ok(formatSeverity('CRITICAL').includes('Critical'));
    assert.ok(formatSeverity('CRITICAL').includes('severity-critical'));
  });

  const mockItem = {
    item: {
      id: 'test-123',
      title: 'Hackers target <script>alert("XSS")</script>',
      source: 'CISA',
      url: 'https://cisa.gov/test',
      publishedAt: '2026-09-29T12:00:00Z'
    },
    validation: { valid: true },
    analysis: {
      severity: 'high',
      summary: 'A test summary with "quotes" and &.',
      tags: ['test', 'xss'],
      keyPoints: ['Point 1'],
      entities: ['Entity A'],
      technologies: ['Tech B']
    }
  };

  await t.test('✔ renderFeedItem escapes HTML and renders correctly', () => {
    const html = renderFeedItem(mockItem);
    
    // Check XSS escaping
    assert.ok(!html.includes('<script>'), 'Failed to escape <script>');
    assert.ok(html.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'), 'Failed to properly escape Title');
    
    // Check fields
    assert.ok(html.includes('CISA'));
    assert.ok(html.includes('A test summary'));
    assert.ok(html.includes('severity-high'));
    assert.ok(html.includes('onclick="window.app.viewStory(\'test-123\'); return false;"'));
    assert.ok(html.includes('<span class="tag">test</span>'));
  });

  await t.test('✔ renderStoryDetail escapes HTML and renders correctly', () => {
    const html = renderStoryDetail(mockItem);
    
    // Check XSS escaping
    assert.ok(!html.includes('<script>'), 'Failed to escape <script>');
    
    // Check fields
    assert.ok(html.includes('https://cisa.gov/test'));
    assert.ok(html.includes('Point 1'));
    assert.ok(html.includes('Entity A'));
    assert.ok(html.includes('Tech B'));
    assert.ok(html.includes('Verified'));
    assert.ok(html.includes('severity-high'));
  });
});
