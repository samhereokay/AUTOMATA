import { NewsPipeline, PipelineResult } from './NewsPipeline';

export class PipelineOrchestrator {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(private pipeline: NewsPipeline) {}

  /**
   * Execute the pipeline. Returns null if already running (prevents overlap).
   */
  public async run(): Promise<PipelineResult | null> {
    if (this.isRunning) {
      return null;
    }

    this.isRunning = true;
    try {
      return await this.pipeline.run();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start a recurring schedule for the pipeline.
   * @param intervalMs The interval in milliseconds
   */
  public startSchedule(intervalMs: number): void {
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

  public stopSchedule(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public get isCurrentlyRunning(): boolean {
    return this.isRunning;
  }
}
