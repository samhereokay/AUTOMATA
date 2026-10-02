import { NewsPipeline, PipelineResult } from './NewsPipeline';
export declare class PipelineOrchestrator {
    private pipeline;
    private isRunning;
    private timer;
    constructor(pipeline: NewsPipeline);
    /**
     * Execute the pipeline. Returns null if already running (prevents overlap).
     */
    run(): Promise<PipelineResult | null>;
    /**
     * Start a recurring schedule for the pipeline.
     * @param intervalMs The interval in milliseconds
     */
    startSchedule(intervalMs: number): void;
    stopSchedule(): void;
    get isCurrentlyRunning(): boolean;
}
//# sourceMappingURL=PipelineOrchestrator.d.ts.map