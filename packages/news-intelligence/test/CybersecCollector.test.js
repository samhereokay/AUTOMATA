"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const http_1 = __importDefault(require("http"));
const SourceRegistry_1 = require("../src/SourceRegistry");
const CybersecCollector_1 = require("../src/CybersecCollector");
// Create a local test server to serve mock RSS feeds
const server = http_1.default.createServer((req, res) => {
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
    }
    else if (req.url === '/malformed') {
        res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
        res.end(`<?xml version="1.0" encoding="UTF-8"?><rss><channel><item>unclosed tags`);
    }
    else if (req.url === '/timeout') {
        // Just hang the connection (or wait very long)
        // We won't actually wait 10s in this test, we can just test 404 or connection closed
    }
    else if (req.url === '/error') {
        res.writeHead(500);
        res.end('Internal Server Error');
    }
    else {
        res.writeHead(404);
        res.end();
    }
});
server.listen(0, async () => {
    const port = server.address().port;
    (0, node_test_1.default)('CybersecCollector handles successful items and normalizes', async () => {
        const registry = new SourceRegistry_1.SourceRegistry();
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
        const collector = new CybersecCollector_1.CybersecCollector(registry);
        const results = await collector.collect();
        // Should skip the one without title/link, keeping 2 items
        node_assert_1.default.strictEqual(results.length, 2);
        const first = results[0];
        node_assert_1.default.strictEqual(first.title, 'Test Alert');
        node_assert_1.default.strictEqual(first.url, 'https://www.cisa.gov/test-alert');
        node_assert_1.default.strictEqual(first.id, '12345');
        node_assert_1.default.strictEqual(first.source, 'Test CISA');
        node_assert_1.default.strictEqual(first.category, 'cybersecurity');
        node_assert_1.default.strictEqual(typeof first.publishedAt, 'string');
        node_assert_1.default.strictEqual(typeof first.collectedAt, 'string');
        // Ensure external feed content didn't execute, and tags are safely stripped
        node_assert_1.default.ok(!first.metadata?.snippet?.includes('<script>'));
        node_assert_1.default.ok(first.metadata?.snippet?.includes('alert(1)'));
        const second = results[1];
        node_assert_1.default.strictEqual(second.title, 'Missing Optional Fields');
        node_assert_1.default.strictEqual(second.url, 'https://www.cisa.gov/missing-optional');
        // Fallback ID to URL
        node_assert_1.default.strictEqual(second.id, 'https://www.cisa.gov/missing-optional');
        node_assert_1.default.strictEqual(second.publishedAt, null);
    });
    (0, node_test_1.default)('CybersecCollector handles malformed feed without crashing', async () => {
        const registry = new SourceRegistry_1.SourceRegistry();
        registry['sources'].clear();
        registry.registerSource({
            id: 'malformed',
            name: 'Malformed Source',
            url: `http://localhost:${port}/malformed`,
            category: 'news.cybersecurity',
            type: 'rss',
            enabled: true
        });
        const collector = new CybersecCollector_1.CybersecCollector(registry);
        const results = await collector.collect();
        // It should handle the throw gracefully internally and return 0 results
        node_assert_1.default.strictEqual(results.length, 0);
    });
    (0, node_test_1.default)('CybersecCollector handles one failed source without preventing another', async () => {
        const registry = new SourceRegistry_1.SourceRegistry();
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
        const collector = new CybersecCollector_1.CybersecCollector(registry);
        const results = await collector.collect();
        // Even though 'error' source failed, 'good-cisa' should still succeed
        node_assert_1.default.strictEqual(results.length, 2);
    });
    node_test_1.default.skip('Real CISA and Hacker News collection', async () => {
        const registry = new SourceRegistry_1.SourceRegistry(); // loaded with default CISA and HackerNews
        const collector = new CybersecCollector_1.CybersecCollector(registry);
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
        node_assert_1.default.ok(cisaItems.length > 0, "CISA collection failed or returned 0 items");
        node_assert_1.default.ok(hnItems.length > 0, "Hacker News collection failed or returned 0 items");
    });
    (0, node_test_1.default)('Schema Validation rules', async () => {
        const { validateNewsItem } = await import('../src/types.js');
        // 1. Invalid URLs are rejected
        node_assert_1.default.throws(() => validateNewsItem({
            id: '1', title: 't', source: 's', url: 'not-a-url', publishedAt: null, collectedAt: new Date().toISOString(), category: 'cybersecurity'
        }), /Invalid URL/);
        // 2. Empty titles are rejected
        node_assert_1.default.throws(() => validateNewsItem({
            id: '1', title: '  ', source: 's', url: 'http://example.com', publishedAt: null, collectedAt: new Date().toISOString(), category: 'cybersecurity'
        }), /Invalid or empty title/);
        // 3. Invalid dates are rejected when supplied
        node_assert_1.default.throws(() => validateNewsItem({
            id: '1', title: 't', source: 's', url: 'http://example.com', publishedAt: 'not-a-date', collectedAt: new Date().toISOString(), category: 'cybersecurity'
        }), /Invalid publishedAt date/);
        // 4. publishedAt: null is allowed
        node_assert_1.default.doesNotThrow(() => validateNewsItem({
            id: '1', title: 't', source: 's', url: 'http://example.com', publishedAt: null, collectedAt: new Date().toISOString(), category: 'cybersecurity'
        }));
        // 5. Invalid category
        node_assert_1.default.throws(() => validateNewsItem({
            id: '1', title: 't', source: 's', url: 'http://example.com', publishedAt: null, collectedAt: new Date().toISOString(), category: 'news.cybersecurity'
        }), /Invalid category/);
        // 6. Source-specific metadata is permitted and preserved
        const valid = validateNewsItem({
            id: '1', title: 't', source: 's', url: 'http://example.com', publishedAt: null, collectedAt: new Date().toISOString(), category: 'cybersecurity', metadata: { customField: 'test' }
        });
        node_assert_1.default.strictEqual(valid.metadata?.customField, 'test');
    });
    // Finish up server after tests complete
    (0, node_test_1.default)('Close server', () => {
        server.close();
    });
});
//# sourceMappingURL=CybersecCollector.test.js.map