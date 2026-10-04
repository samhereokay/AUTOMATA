import { MemoryRequirement } from '../planner/Planner';
import { StructuredMemoryRepository } from '../memory/StructuredMemoryRepository';
import { SemanticMemoryRepository } from '../memory/SemanticMemoryRepository';
import { MemoryScope } from '../memory/MemoryService';
export declare class MemoryRouter {
    private semanticMemory;
    private structuredMemory;
    constructor(semanticMemory: SemanticMemoryRepository, structuredMemory: StructuredMemoryRepository);
    route(requirement: MemoryRequirement): Promise<void>;
    storeStructured(scope: MemoryScope, scopeId: string, type: string, key: string, value: Record<string, unknown>): Promise<void>;
    retrieveStructured(scope: MemoryScope, scopeId: string, type: string, key: string): Promise<Record<string, unknown> | null>;
    updateStructured(scope: MemoryScope, scopeId: string, type: string, key: string, value: Record<string, unknown>): Promise<void>;
    deleteStructured(scope: MemoryScope, scopeId: string, type: string, key: string): Promise<void>;
    searchStructured(scope: MemoryScope, scopeId: string, type: string, key: string): Promise<Record<string, unknown> | null>;
}
//# sourceMappingURL=MemoryRouter.d.ts.map