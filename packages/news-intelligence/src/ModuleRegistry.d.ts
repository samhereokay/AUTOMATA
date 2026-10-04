/**
 * ModuleRegistry — central registry of all Automation OS modules.
 * Extends the workflow-registry pattern to include runtime status and API metadata.
 */
export type ModuleStatus = 'active' | 'coming-soon' | 'disabled';
export interface ModuleDefinition {
    id: string;
    name: string;
    version: string;
    status: ModuleStatus;
    description: string;
    capabilities: string[];
    permissions: string[];
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
    schedule?: string;
}
export declare class ModuleRegistry {
    private modules;
    constructor();
    private seed;
    getModule(id: string): ModuleDefinition | undefined;
    registerModule(moduleDef: any): void;
    listModules(): ModuleDefinition[];
    listActiveModules(): ModuleDefinition[];
}
//# sourceMappingURL=ModuleRegistry.d.ts.map