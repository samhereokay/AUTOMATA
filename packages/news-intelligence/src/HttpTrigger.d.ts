import { PipelineOrchestrator } from './PipelineOrchestrator';
import { FeedService } from './FeedService';
import { ExecutionTracker } from './ExecutionTracker';
import { ModuleRegistry } from './ModuleRegistry';
export interface HttpTriggerOptions {
    port: number;
    authToken: string;
    corsOrigin?: string;
}
export declare class HttpTrigger {
    private orchestrator;
    private feedService;
    private options;
    private executionTracker?;
    private moduleRegistry?;
    private server;
    constructor(orchestrator: PipelineOrchestrator, feedService: FeedService, options: HttpTriggerOptions, executionTracker?: ExecutionTracker, moduleRegistry?: ModuleRegistry);
    start(): Promise<void>;
    private authenticate;
    private handlePostRun;
    private handlePostExecution;
    private buildVerification;
    private handleGetModules;
    private handleGetModuleById;
    private handleListExecutions;
    private handleGetExecutionById;
    private handleGetExecutionVerification;
    private parseFilterOptions;
    private handleGetNews;
    private handleSearchNews;
    private handleGetNewsById;
    stop(): Promise<void>;
}
//# sourceMappingURL=HttpTrigger.d.ts.map