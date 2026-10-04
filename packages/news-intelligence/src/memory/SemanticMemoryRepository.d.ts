import { EmbeddingProvider } from './EmbeddingProvider';
export interface SemanticMemoryItem {
    id: string;
    scope: string;
    scopeId: string;
    type: string;
    text: string;
    metadata: Record<string, unknown>;
}
export declare class SemanticMemoryRepository {
    private embeddingProvider;
    private qdrantUrl;
    private collectionName;
    private initialized;
    constructor(embeddingProvider: EmbeddingProvider, qdrantUrl?: string);
    private ensureCollection;
    store(item: SemanticMemoryItem): Promise<void>;
    search(query: string, scope: string, scopeId: string, limit?: number): Promise<SemanticMemoryItem[]>;
}
//# sourceMappingURL=SemanticMemoryRepository.d.ts.map