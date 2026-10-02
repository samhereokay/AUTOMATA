export type NewsCategory = 'cybersecurity' | 'forex' | 'markets' | 'general' | 'ai';
export interface NewsItem {
    id: string;
    title: string;
    source: string;
    url: string;
    publishedAt: string | null;
    collectedAt: string;
    category: NewsCategory;
    metadata?: {
        author?: string;
        snippet?: string;
        sourceId?: string;
        [key: string]: unknown;
    };
    status?: "confirmed" | "reported" | "unconfirmed" | "conflicting" | "unknown";
    summary?: string;
    relevance?: number;
    impact?: string;
    confidence?: number;
    relatedSources?: string[];
    tags?: string[];
    hash?: string;
}
export declare function validateNewsItem(item: Partial<NewsItem>): NewsItem;
//# sourceMappingURL=types.d.ts.map