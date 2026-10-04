export declare class StructuredMemoryRepository {
    private pool;
    constructor(connectionString: string);
    close(): Promise<void>;
    set(scope: string, scopeId: string, type: string, key: string, value: Record<string, unknown>): Promise<void>;
    get(scope: string, scopeId: string, type: string, key: string): Promise<Record<string, unknown> | null>;
    delete(scope: string, scopeId: string, type: string, key: string): Promise<void>;
}
//# sourceMappingURL=StructuredMemoryRepository.d.ts.map