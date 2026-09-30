import Parser from 'rss-parser';
import { SourceRegistry, NewsSource } from './SourceRegistry';
import { NewsItem, validateNewsItem } from './types';

// Use a shared parser instance with safety limits
const parser = new Parser({
  timeout: 10000, // 10s timeout
  customFields: {
    item: ['guid', 'id']
  }
});

export class CybersecCollector {
  constructor(private registry: SourceRegistry) {}

  public async collect(): Promise<NewsItem[]> {
    const sources = this.registry.getSourcesByCategory('news.cybersecurity', false);
    const results: NewsItem[] = [];

    // Collect in parallel, mapping to avoid one failure breaking all
    const promises = sources
      .filter(s => s.type === 'rss')
      .map(source => this.fetchSourceSafe(source));
    
    const settled = await Promise.allSettled(promises);
    
    for (const res of settled) {
      if (res.status === 'fulfilled') {
        results.push(...res.value);
      } else {
        console.error(`[CybersecCollector] Source collection failed: ${res.reason}`);
      }
    }

    return results;
  }

  private async fetchSourceSafe(source: NewsSource): Promise<NewsItem[]> {
    try {
      const feed = await parser.parseURL(source.url);
      const items: NewsItem[] = [];

      for (const item of feed.items) {
        if (!item.title || !item.link) continue; // Skip malformed items

        // Safely extract identifying GUID or fallback to URL
        const id = item.guid || item.id || item.link;

        const itemData: Partial<NewsItem> = {
          id,
          title: item.title,
          source: source.name,
          url: item.link,
          publishedAt: item.isoDate ? new Date(item.isoDate).toISOString() : null,
          collectedAt: new Date().toISOString(),
          category: 'cybersecurity',
          metadata: {
            author: item.creator || (item as any).author,
            snippet: item.contentSnippet ? item.contentSnippet.substring(0, 500) : undefined
          }
        };

        try {
          items.push(validateNewsItem(itemData));
        } catch (validationErr) {
          console.warn(`[CybersecCollector] Skipping invalid item from ${source.name}: ${(validationErr as Error).message}`);
        }
      }
      return items;
    } catch (e) {
      throw new Error(`Failed to fetch source ${source.name} (${source.url}): ${(e as Error).message}`);
    }
  }
}
