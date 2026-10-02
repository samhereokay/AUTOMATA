import { NewsRepository, NewsRepositoryOptions } from '../NewsRepository';
import { AnalyzedNewsItem } from '../AIAnalyzer';
export declare class PostgresNewsRepository implements NewsRepository {
    private pool;
    private isClosed;
    constructor(connectionString: string);
    /**
     * Initializes the database schema.
     */
    initialize(): Promise<void>;
    close(): Promise<void>;
    save(item: AnalyzedNewsItem): Promise<void>;
    getById(id: string): Promise<AnalyzedNewsItem | null>;
    findByUrl(url: string): Promise<AnalyzedNewsItem | null>;
    findByTitle(title: string): Promise<AnalyzedNewsItem | null>;
    list(options?: NewsRepositoryOptions): Promise<AnalyzedNewsItem[]>;
    delete(id: string): Promise<void>;
    private getByIdInternal;
    private normalizeUrl;
    private normalizeTitle;
}
//# sourceMappingURL=PostgresNewsRepository.d.ts.map