import { AnalyzedNewsItem } from './AIAnalyzer';

export interface NewsRepositoryOptions {
  limit?: number;
  offset?: number;
}

export interface NewsRepository {
  /**
   * Saves an item to the repository.
   * - Must be idempotent (same ID or normalized URL updates the existing record)
   * - Must preserve/merge existing evidence (e.g. relatedSources)
   * - Must not overwrite original evidence with AI data
   */
  save(item: AnalyzedNewsItem): Promise<void>;

  getById(id: string): Promise<AnalyzedNewsItem | null>;

  findByUrl(url: string): Promise<AnalyzedNewsItem | null>;

  findByTitle(title: string): Promise<AnalyzedNewsItem | null>;

  list(options?: NewsRepositoryOptions): Promise<AnalyzedNewsItem[]>;

  delete(id: string): Promise<void>;
}
