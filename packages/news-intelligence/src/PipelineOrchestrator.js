"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineOrchestrator = void 0;
class PipelineOrchestrator {
    pipeline;
    isRunning = false;
    timer = null;
    constructor(pipeline) {
        this.pipeline = pipeline;
    }
    /**
     * Execute the pipeline. Returns null if already running (prevents overlap).
     */
    async run() {
        if (this.isRunning) {
            return null;
        }
        this.isRunning = true;
        try {
            return await this.pipeline.run();
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Start a recurring schedule for the pipeline.
     * @param intervalMs The interval in milliseconds
     */
    startSchedule(intervalMs) {
        if (this.timer) {
            clearInterval(this.timer);
        }
        // Initial run immediately, but asynchronously
        setTimeout(() => {
            this.run().catch(console.error);
        }, 0);
        this.timer = setInterval(() => {
            this.run().catch(console.error);
        }, intervalMs);
    }
    stopSchedule() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    get isCurrentlyRunning() {
        return this.isRunning;
    }
}
exports.PipelineOrchestrator = PipelineOrchestrator;
//# sourceMappingURL=PipelineOrchestrator.js.map