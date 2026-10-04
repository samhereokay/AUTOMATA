import { Planner } from './planner/Planner';
import { ProviderRouter } from './router/ProviderRouter';
import { MemoryRouter } from './router/MemoryRouter';
import { StorageRouter } from './router/StorageRouter';
import { ExecutionTracker } from './ExecutionTracker';
export declare class PipelineOrchestrator {
    private planner;
    private providerRouter;
    private memoryRouter;
    private storageRouter;
    private executionTracker;
    private isRunning;
    private timer;
    constructor(planner: Planner, providerRouter: ProviderRouter, memoryRouter: MemoryRouter, storageRouter: StorageRouter, executionTracker: ExecutionTracker);
    /**
     * Execute the full automation OS pipeline from a natural language prompt.
     * Prompts -> Plan -> Route -> Execute -> Verify -> Track
     */
    executePrompt(prompt: string): Promise<Record<string, unknown> | null>;
    get isCurrentlyRunning(): boolean;
}
//# sourceMappingURL=PipelineOrchestrator.d.ts.map