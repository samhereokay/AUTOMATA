import { PipelineOrchestrator } from './PipelineOrchestrator';
import { FeedService } from './FeedService';
export interface HttpTriggerOptions {
    port: number;
    authToken: string;
    corsOrigin?: string;
}
export declare class HttpTrigger {
    private orchestrator;
    private feedService;
    private options;
    private server;
    constructor(orchestrator: PipelineOrchestrator, feedService: FeedService, options: HttpTriggerOptions);
    start(): Promise<void>;
    private handlePostRun;
    private parseFilterOptions;
    private handleGetNews;
    private handleSearchNews;
    private handleGetNewsById;
    stop(): Promise<void>;
}
//# sourceMappingURL=HttpTrigger.d.ts.map