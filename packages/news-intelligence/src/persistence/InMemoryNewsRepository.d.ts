import { AnalyzedNewsItem } from '../AIAnalyzer';
import { NewsRepository, NewsRepositoryOptions } from '../NewsRepository';
export declare class InMemoryNewsRepository implements NewsRepository {
    private records;
    save(item: AnalyzedNewsItem): Promise<void>;
    getById(id: string): Promise<AnalyzedNewsItem | null>;
    findByUrl(url: string): Promise<AnalyzedNewsItem | null>;
    findByTitle(title: string): Promise<AnalyzedNewsItem | null>;
    list(options?: NewsRepositoryOptions): Promise<AnalyzedNewsItem[]>;
    delete(id: string): Promise<void>;
    private clone;
    private normalizeUrl;
    private normalizeTitle;
}
//# sourceMappingURL=InMemoryNewsRepository.d.ts.map