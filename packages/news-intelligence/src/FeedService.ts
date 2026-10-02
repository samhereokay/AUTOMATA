import { NewsRepository } from './NewsRepository';
import { AnalyzedNewsItem } from './AIAnalyzer';

export interface FeedFilterOptions {
  category?: string;
  source?: string;
  severity?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface FeedResponse {
  items: AnalyzedNewsItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export class FeedService {
  constructor(private repository: NewsRepository) {}

  public async getLatest(options?: FeedFilterOptions): Promise<FeedResponse> {
    // In a real DB, these filters and sorts would be pushed down to the SQL/NoSQL query.
    // For this generic interface relying on the repository's simple list() method, 
    // we fetch and filter in-memory.
    const all = await this.repository.list();
    const filtered = this.applyFilters(all, options);
    const sorted = this.sortItems(filtered);
    return this.paginate(sorted, options);
  }

  public async getById(id: string): Promise<AnalyzedNewsItem | null> {
    return this.repository.getById(id);
  }

  public async search(query: string, options?: FeedFilterOptions): Promise<FeedResponse> {
    const all = await this.repository.list();
    
    const q = query.toLowerCase();
    const matched = all.filter(record => {
      const titleMatch = record.item.title.toLowerCase().includes(q);
      const summaryMatch = record.analysis?.summary?.toLowerCase().includes(q) || false;
      const keyPointsMatch = record.analysis?.keyPoints?.some(kp => kp.toLowerCase().includes(q)) || false;
      return titleMatch || summaryMatch || keyPointsMatch;
    });

    const filtered = this.applyFilters(matched, options);
    const sorted = this.sortItems(filtered);
    return this.paginate(sorted, options);
  }

  private applyFilters(items: AnalyzedNewsItem[], options?: FeedFilterOptions): AnalyzedNewsItem[] {
    if (!options) return items;
    return items.filter(record => {
      if (options.category && record.item.category !== options.category) return false;
      if (options.source && record.item.source !== options.source) return false;
      if (options.severity && record.analysis?.severity !== options.severity) return false;
      
      if (options.tags && options.tags.length > 0) {
        if (!record.analysis?.tags) return false;
        const hasAllTags = options.tags.every(tag => record.analysis.tags.includes(tag));
        if (!hasAllTags) return false;
      }
      return true;
    });
  }

  private sortItems(items: AnalyzedNewsItem[]): AnalyzedNewsItem[] {
    return items.sort((a, b) => {
      const dateA = a.item.publishedAt ? new Date(a.item.publishedAt).getTime() : 0;
      const dateB = b.item.publishedAt ? new Date(b.item.publishedAt).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      
      const colA = new Date(a.item.collectedAt).getTime();
      const colB = new Date(b.item.collectedAt).getTime();
      if (colA !== colB) return colB - colA;

      return a.item.id.localeCompare(b.item.id);
    });
  }

  private paginate(items: AnalyzedNewsItem[], options?: FeedFilterOptions): FeedResponse {
    const limit = options?.limit && options.limit > 0 ? options.limit : 10;
    const offset = Math.max(0, options?.offset || 0);
    const total = items.length;
    
    const paginatedItems = items.slice(offset, offset + limit);
    return {
      items: paginatedItems,
      pagination: {
        limit,
        offset,
        total
      }
    };
  }
}
