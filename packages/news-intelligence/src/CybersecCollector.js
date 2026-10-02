"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CybersecCollector = void 0;
const rss_parser_1 = __importDefault(require("rss-parser"));
const types_1 = require("./types");
// Use a shared parser instance with safety limits
const parser = new rss_parser_1.default({
    timeout: 10000, // 10s timeout
    customFields: {
        item: ['guid', 'id']
    }
});
class CybersecCollector {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    async collect() {
        const sources = this.registry.getSourcesByCategory('news.cybersecurity', false);
        const results = [];
        // Collect in parallel, mapping to avoid one failure breaking all
        const promises = sources
            .filter(s => s.type === 'rss')
            .map(source => this.fetchSourceSafe(source));
        const settled = await Promise.allSettled(promises);
        for (const res of settled) {
            if (res.status === 'fulfilled') {
                results.push(...res.value);
            }
            else {
                console.error(`[CybersecCollector] Source collection failed: ${res.reason}`);
            }
        }
        return results;
    }
    async fetchSourceSafe(source) {
        try {
            const feed = await parser.parseURL(source.url);
            const items = [];
            for (const item of feed.items) {
                if (!item.title || !item.link)
                    continue; // Skip malformed items
                // Safely extract identifying GUID or fallback to URL
                const id = item.guid || item.id || item.link;
                const itemData = {
                    id,
                    title: item.title,
                    source: source.name,
                    url: item.link,
                    publishedAt: item.isoDate ? new Date(item.isoDate).toISOString() : null,
                    collectedAt: new Date().toISOString(),
                    category: 'cybersecurity',
                    metadata: {
                        author: item.creator || item.author,
                        snippet: item.contentSnippet ? item.contentSnippet.substring(0, 500) : undefined
                    }
                };
                try {
                    items.push((0, types_1.validateNewsItem)(itemData));
                }
                catch (validationErr) {
                    console.warn(`[CybersecCollector] Skipping invalid item from ${source.name}: ${validationErr.message}`);
                }
            }
            return items;
        }
        catch (e) {
            throw new Error(`Failed to fetch source ${source.name} (${source.url}): ${e.message}`);
        }
    }
}
exports.CybersecCollector = CybersecCollector;
//# sourceMappingURL=CybersecCollector.js.map