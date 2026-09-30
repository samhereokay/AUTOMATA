export type SourceCategory = 'news.cybersecurity' | 'news.forex' | 'news.markets' | 'news.general' | 'news.ai';
export type SourceType = 'rss' | 'api' | 'scrape';

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  category: SourceCategory;
  type: SourceType;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export class SourceRegistry {
  private sources: Map<string, NewsSource> = new Map();

  constructor() {
    this.seedSources();
  }

  private seedSources() {
    // Initial seeded sources. These can later be moved to a DB or config file.
    const initialSources: NewsSource[] = [
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

  public registerSource(source: NewsSource): void {
    this.sources.set(source.id, source);
  }

  public getSourcesByCategory(category: SourceCategory, includeDisabled = false): NewsSource[] {
    const all = Array.from(this.sources.values());
    return all.filter(s => s.category === category && (includeDisabled || s.enabled));
  }

  public getSourceById(id: string): NewsSource | undefined {
    return this.sources.get(id);
  }

  public disableSource(id: string): boolean {
    const source = this.sources.get(id);
    if (source) {
      source.enabled = false;
      return true;
    }
    return false;
  }

  public enableSource(id: string): boolean {
    const source = this.sources.get(id);
    if (source) {
      source.enabled = true;
      return true;
    }
    return false;
  }
}
