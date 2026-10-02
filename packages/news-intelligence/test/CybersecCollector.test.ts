import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { SourceRegistry } from '../src/SourceRegistry';
import { CybersecCollector } from '../src/CybersecCollector';

// Create a local test server to serve mock RSS feeds
const server = http.createServer((req, res) => {
  if (req.url === '/good-cisa') {
    res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
    res.end(`<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>CISA Cybersecurity Alerts</title>
          <item>
            <title>Test Alert</title>
            <link>https://www.cisa.gov/test-alert</link>
            <guid>12345</guid>
            <pubDate>Wed, 02 Oct 2024 12:00:00 GMT</pubDate>
            <description>A test description with &lt;script&gt;alert(1)&lt;/script&gt;</description>
          </item>
          <item>
            <!-- Missing title, should be skipped safely -->
            <link>https://www.cisa.gov/missing-title</link>
          </item>
          <item>
            <title>Missing Optional Fields</title>
            <link>https://www.cisa.gov/missing-optional</link>
            <!-- No guid, pubDate, description -->
          </item>
        </channel>
      </rss>`);
  } else if (req.url === '/malformed') {
    res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
    res.end(`<?xml version="1.0" encoding="UTF-8"?><rss><channel><item>unclosed tags`);
  } else if (req.url === '/timeout') {
    // Just hang the connection (or wait very long)
    // We won't actually wait 10s in this test, we can just test 404 or connection closed
  } else if (req.url === '/error') {
    res.writeHead(500);
    res.end('Internal Server Error');
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(0, async () => {
  const port = (server.address() as any).port;
  
  test('CybersecCollector handles successful items and normalizes', async () => {
    const registry = new SourceRegistry();
    // Clear the seeded sources
    registry['sources'].clear();
    registry.registerSource({
      id: 'test-cisa',
      name: 'Test CISA',
      url: `http://localhost:${port}/good-cisa`,
      category: 'news.cybersecurity',
      type: 'rss',
      enabled: true
    });

    const collector = new CybersecCollector(registry);
    const results = await collector.collect();

    // Should skip the one without title/link, keeping 2 items
    assert.strictEqual(results.length, 2);

    const first = results[0];
    assert.strictEqual(first.title, 'Test Alert');
    assert.strictEqual(first.url, 'https://www.cisa.gov/test-alert');
    assert.strictEqual(first.id, '12345');
    assert.strictEqual(first.source, 'Test CISA');
    assert.strictEqual(first.category, 'cybersecurity');
    assert.strictEqual(typeof first.publishedAt, 'string');
    assert.strictEqual(typeof first.collectedAt, 'string');
    // Ensure external feed content didn't execute, and tags are safely stripped
    assert.ok(!first.metadata?.snippet?.includes('<script>'));
    assert.ok(first.metadata?.snippet?.includes('alert(1)'));

    const second = results[1];
    assert.strictEqual(second.title, 'Missing Optional Fields');
    assert.strictEqual(second.url, 'https://www.cisa.gov/missing-optional');
    // Fallback ID to URL
    assert.strictEqual(second.id, 'https://www.cisa.gov/missing-optional');
    assert.strictEqual(second.publishedAt, null);
  });

  test('CybersecCollector handles malformed feed without crashing', async () => {
    const registry = new SourceRegistry();
    registry['sources'].clear();
    registry.registerSource({
      id: 'malformed',
      name: 'Malformed Source',
      url: `http://localhost:${port}/malformed`,
      category: 'news.cybersecurity',
      type: 'rss',
      enabled: true
    });

    const collector = new CybersecCollector(registry);
    const results = await collector.collect();
    // It should handle the throw gracefully internally and return 0 results
    assert.strictEqual(results.length, 0);
  });

  test('CybersecCollector handles one failed source without preventing another', async () => {
    const registry = new SourceRegistry();
    registry['sources'].clear();
    registry.registerSource({
      id: 'error',
      name: 'Error Source',
      url: `http://localhost:${port}/error`,
      category: 'news.cybersecurity',
      type: 'rss',
      enabled: true
    });
    registry.registerSource({
      id: 'test-cisa',
      name: 'Test CISA',
      url: `http://localhost:${port}/good-cisa`,
      category: 'news.cybersecurity',
      type: 'rss',
      enabled: true
    });

    const collector = new CybersecCollector(registry);
    const results = await collector.collect();
    
    // Even though 'error' source failed, 'good-cisa' should still succeed
    assert.strictEqual(results.length, 2);
  });

  test.skip('Real CISA and Hacker News collection', async () => {
    const registry = new SourceRegistry(); // loaded with default CISA and HackerNews
    const collector = new CybersecCollector(registry);
    
    const results = await collector.collect();
    
    console.log(`\n--- REAL COLLECTION RESULTS ---`);
    console.log(`Successfully collected ${results.length} total items.`);
    
    const cisaItems = results.filter(r => r.source.includes('CISA'));
    const hnItems = results.filter(r => r.source.includes('Hacker News'));
    
    console.log(`CISA items: ${cisaItems.length}`);
    console.log(`Hacker News items: ${hnItems.length}`);

    if (results.length > 0) {
      console.log(`\nSample Normalized Item:`);
      console.log(JSON.stringify(results[0], null, 2));
    }
    
    // We expect both sources to be reachable in a real-world test
    assert.ok(cisaItems.length > 0, "CISA collection failed or returned 0 items");
    assert.ok(hnItems.length > 0, "Hacker News collection failed or returned 0 items");
  });

  test('Schema Validation rules', async () => {
    const { validateNewsItem } = await import('../src/types.js');

    // 1. Invalid URLs are rejected
    assert.throws(() => validateNewsItem({
      id: '1', title: 't', source: 's', url: 'not-a-url', publishedAt: null, collectedAt: new Date().toISOString(), category: 'cybersecurity'
    }), /Invalid URL/);

    // 2. Empty titles are rejected
    assert.throws(() => validateNewsItem({
      id: '1', title: '  ', source: 's', url: 'http://example.com', publishedAt: null, collectedAt: new Date().toISOString(), category: 'cybersecurity'
    }), /Invalid or empty title/);

    // 3. Invalid dates are rejected when supplied
    assert.throws(() => validateNewsItem({
      id: '1', title: 't', source: 's', url: 'http://example.com', publishedAt: 'not-a-date', collectedAt: new Date().toISOString(), category: 'cybersecurity'
    }), /Invalid publishedAt date/);

    // 4. publishedAt: null is allowed
    assert.doesNotThrow(() => validateNewsItem({
      id: '1', title: 't', source: 's', url: 'http://example.com', publishedAt: null, collectedAt: new Date().toISOString(), category: 'cybersecurity'
    }));

    // 5. Invalid category
    assert.throws(() => validateNewsItem({
      id: '1', title: 't', source: 's', url: 'http://example.com', publishedAt: null, collectedAt: new Date().toISOString(), category: 'news.cybersecurity' as any
    }), /Invalid category/);

    // 6. Source-specific metadata is permitted and preserved
    const valid = validateNewsItem({
      id: '1', title: 't', source: 's', url: 'http://example.com', publishedAt: null, collectedAt: new Date().toISOString(), category: 'cybersecurity', metadata: { customField: 'test' }
    });
    assert.strictEqual(valid.metadata?.customField, 'test');
  });

  // Finish up server after tests complete
  test('Close server', () => {
    server.close();
  });
});
