"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourceRegistry = void 0;
class SourceRegistry {
    sources = new Map();
    constructor() {
        this.seedSources();
    }
    seedSources() {
        // Initial seeded sources. These can later be moved to a DB or config file.
        const initialSources = [
            {
                id: 'cybersec-cisa',
                name: 'CISA Cybersecurity Alerts',
                url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
                category: 'news.cybersecurity',
                type: 'rss',
                enabled: true
            },
            {
                id: 'cybersec-thehacker',
                name: 'The Hacker News',
                url: 'https://feeds.feedburner.com/TheHackersNews',
                category: 'news.cybersecurity',
                type: 'rss',
                enabled: true
            },
            {
                id: 'forex-dailyfx',
                name: 'DailyFX Forex News',
                url: 'https://www.dailyfx.com/feeds/forex_market_news',
                category: 'news.forex',
                type: 'rss',
                enabled: true
            },
            {
                id: 'markets-wsj',
                name: 'Wall Street Journal Markets',
                url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
                category: 'news.markets',
                type: 'rss',
                enabled: true
            },
            {
                id: 'ai-techcrunch',
                name: 'TechCrunch AI',
                url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
                category: 'news.ai',
                type: 'rss',
                enabled: true
            }
        ];
        initialSources.forEach(s => this.registerSource(s));
    }
    registerSource(source) {
        this.sources.set(source.id, source);
    }
    getSourcesByCategory(category, includeDisabled = false) {
        const all = Array.from(this.sources.values());
        return all.filter(s => s.category === category && (includeDisabled || s.enabled));
    }
    getSourceById(id) {
        return this.sources.get(id);
    }
    disableSource(id) {
        const source = this.sources.get(id);
        if (source) {
            source.enabled = false;
            return true;
        }
        return false;
    }
    enableSource(id) {
        const source = this.sources.get(id);
        if (source) {
            source.enabled = true;
            return true;
        }
        return false;
    }
}
exports.SourceRegistry = SourceRegistry;
//# sourceMappingURL=SourceRegistry.js.map