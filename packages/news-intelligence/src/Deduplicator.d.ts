import { NewsItem } from './types';
export declare class Deduplicator {
    /**
     * Deduplicates an array of NewsItems.
     * Preserves evidence of duplicate sources by populating the `relatedSources` array.
     */
    deduplicate(items: NewsItem[]): NewsItem[];
    /**
     * Determines if two items represent the same underlying story.
     * Uses deterministic signals: ID, Normalized URL, and Normalized Title.
     */
    private isMatch;
    /**
     * Merges evidence from a duplicate item into the existing item.
     * Never silently deletes evidence of multiple sources.
     */
    private mergeDuplicate;
    private normalizeUrl;
    private normalizeTitle;
}
//# sourceMappingURL=Deduplicator.d.ts.map