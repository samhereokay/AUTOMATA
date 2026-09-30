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
export declare class SourceRegistry {
    private sources;
    constructor();
    private seedSources;
    registerSource(source: NewsSource): void;
    getSourcesByCategory(category: SourceCategory, includeDisabled?: boolean): NewsSource[];
    getSourceById(id: string): NewsSource | undefined;
    disableSource(id: string): boolean;
    enableSource(id: string): boolean;
}
//# sourceMappingURL=SourceRegistry.d.ts.map