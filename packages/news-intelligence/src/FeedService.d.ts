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
export declare class FeedService {
    private repository;
    constructor(repository: NewsRepository);
    getLatest(options?: FeedFilterOptions): Promise<FeedResponse>;
    getById(id: string): Promise<AnalyzedNewsItem | null>;
    search(query: string, options?: FeedFilterOptions): Promise<FeedResponse>;
    private applyFilters;
    private sortItems;
    private paginate;
}
//# sourceMappingURL=FeedService.d.ts.map