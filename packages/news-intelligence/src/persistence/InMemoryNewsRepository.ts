import { AnalyzedNewsItem } from '../AIAnalyzer';
import { NewsRepository, NewsRepositoryOptions } from '../NewsRepository';

export class InMemoryNewsRepository implements NewsRepository {
  private records: Map<string, AnalyzedNewsItem> = new Map();

  public async save(item: AnalyzedNewsItem): Promise<void> {
    // Determine if it already exists by ID, normalized URL, or normalized Title
    const existingById = await this.getById(item.item.id);
    const existingByUrl = await this.findByUrl(item.item.url);
    const existingByTitle = await this.findByTitle(item.item.title);

    const existing = existingById || existingByUrl || existingByTitle;

    if (existing) {
      // It exists. We must merge, NOT completely overwrite, to preserve provenance.
      // E.g. union the relatedSources.
      
      const mergedRelatedSources = new Set<string>();
      if (existing.item.relatedSources) {
        existing.item.relatedSources.forEach(s => mergedRelatedSources.add(s));
      }
      if (item.item.relatedSources) {
        item.item.relatedSources.forEach(s => mergedRelatedSources.add(s));
      }
      mergedRelatedSources.add(existing.item.source);
      if (item.item.source !== existing.item.source) {
        mergedRelatedSources.add(item.item.source);
      }

      const mergedSourcesArray = Array.from(mergedRelatedSources);

      // We preserve the original core evidence (URL, title, publishedAt, source)
      // but we update the attached analysis/validation if the incoming item has them,
      // and we update relatedSources.
      // Note: Since AnalyzedNewsItem has deeply frozen properties, we must clone deeply to merge.

      const mergedItem: AnalyzedNewsItem = {
        item: Object.freeze({
          ...existing.item,
          relatedSources: mergedSourcesArray.length > 0 ? mergedSourcesArray : undefined
        }),
        validation: Object.freeze({
          ...item.validation // Newer validation takes precedence
        }),
        analysis: item.analysis ? Object.freeze({
          ...item.analysis // Newer analysis takes precedence
        }) : undefined
      };

      // Ensure we delete any old keys if ID changed (though it shouldn't logically change if they are the same story)
      if (existing.item.id !== mergedItem.item.id) {
        this.records.delete(existing.item.id);
      }
      
      this.records.set(mergedItem.item.id, mergedItem);

    } else {
      // New record
      // Deep clone to ensure the repository doesn't mutate the caller's object and vice versa
      const cloned: AnalyzedNewsItem = {
        item: Object.freeze({ ...item.item, relatedSources: item.item.relatedSources ? [...item.item.relatedSources] : undefined }),
        validation: Object.freeze({ ...item.validation }),
        analysis: item.analysis ? Object.freeze({ ...item.analysis, keyPoints: [...item.analysis.keyPoints], entities: [...item.analysis.entities], technologies: [...item.analysis.technologies], tags: [...item.analysis.tags] }) : undefined
      };
      this.records.set(cloned.item.id, cloned);
    }
  }

  public async getById(id: string): Promise<AnalyzedNewsItem | null> {
    const record = this.records.get(id);
    return record ? this.clone(record) : null;
  }

  public async findByUrl(url: string): Promise<AnalyzedNewsItem | null> {
    const normalizedTarget = this.normalizeUrl(url);
    for (const record of this.records.values()) {
      if (this.normalizeUrl(record.item.url) === normalizedTarget) {
        return this.clone(record);
      }
    }
    return null;
  }

  public async findByTitle(title: string): Promise<AnalyzedNewsItem | null> {
    const normalizedTarget = this.normalizeTitle(title);
    for (const record of this.records.values()) {
      if (this.normalizeTitle(record.item.title) === normalizedTarget) {
        return this.clone(record);
      }
    }
    return null;
  }

  public async list(options?: NewsRepositoryOptions): Promise<AnalyzedNewsItem[]> {
    const all = Array.from(this.records.values());
    const offset = options?.offset || 0;
    const limit = options?.limit || all.length;
    
    return all.slice(offset, offset + limit).map(r => this.clone(r));
  }

  public async delete(id: string): Promise<void> {
    this.records.delete(id);
  }

  // --- Helper Methods ---

  private clone(record: AnalyzedNewsItem): AnalyzedNewsItem {
    return {
      item: Object.freeze({ ...record.item, relatedSources: record.item.relatedSources ? [...record.item.relatedSources] : undefined }),
      validation: Object.freeze({ ...record.validation }),
      analysis: record.analysis ? Object.freeze({ ...record.analysis, keyPoints: [...record.analysis.keyPoints], entities: [...record.analysis.entities], technologies: [...record.analysis.technologies], tags: [...record.analysis.tags] }) : undefined
    };
  }

  private normalizeUrl(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      const paramsToDelete: string[] = [];
      u.searchParams.forEach((_, key) => {
        if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
          paramsToDelete.push(key);
        }
      });
      paramsToDelete.forEach(k => u.searchParams.delete(k));
      
      let normalized = u.origin + u.pathname + u.search;
      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }
      return normalized.toLowerCase();
    } catch {
      return urlStr.toLowerCase();
    }
  }

  private normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
