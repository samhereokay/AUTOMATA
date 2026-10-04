export type MemoryScope = 'GLOBAL_USER' | 'PROJECT' | 'EXECUTION';
export interface StructuredMemory {
    id: string;
    scope: MemoryScope;
    scopeId?: string;
    type: string;
    key: string;
    value: any;
    createdAt: Date;
    updatedAt: Date;
}
export interface SemanticMemory {
    id: string;
    scope: MemoryScope;
    scopeId?: string;
    content: string;
    embedding?: number[];
    metadata: Record<string, any>;
    createdAt: Date;
}
export interface MemoryService {
    /**
     * Save a structured memory to PostgreSQL.
     */
    saveStructured(memory: Omit<StructuredMemory, 'id' | 'createdAt' | 'updatedAt'>): Promise<StructuredMemory>;
    /**
     * Get structured memory by scope and key.
     */
    getStructured(scope: MemoryScope, scopeId: string | undefined, key: string): Promise<StructuredMemory | null>;
    /**
     * Delete a structured memory.
     */
    deleteStructured(id: string): Promise<boolean>;
    /**
     * Save semantic memory. The service should route it to the EmbeddingProvider, then Qdrant.
     */
    saveSemantic(memory: Omit<SemanticMemory, 'id' | 'createdAt' | 'embedding'>): Promise<SemanticMemory>;
    /**
     * Search semantic memory by similarity.
     */
    searchSemantic(query: string, scope: MemoryScope, scopeId?: string, limit?: number): Promise<SemanticMemory[]>;
    /**
     * Delete a semantic memory.
     */
    deleteSemantic(id: string): Promise<boolean>;
}
//# sourceMappingURL=MemoryService.d.ts.map