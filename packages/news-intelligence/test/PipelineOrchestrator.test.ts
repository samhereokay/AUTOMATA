"use strict";
import test from 'node:test';
import assert from 'node:assert';
import { PipelineOrchestrator } from '../src/PipelineOrchestrator';
import { NewsPipeline, PipelineResult } from '../src/NewsPipeline';

class MockPipeline {
  public executeCount = 0;
  public delayMs = 0;
  public shouldFail = false;

  async run(): Promise<PipelineResult> {
    if (this.delayMs > 0) {
      await new Promise(r => setTimeout(r, this.delayMs));
    }
    if (this.shouldFail) {
      throw new Error('Pipeline error');
    }
    this.executeCount++;
    return {
      collected: 10,
      deduplicated: 5,
      validated: 5,
      analyzed: 4,
      persisted: 4,
      notified: 4,
      failures: []
    };
  }
}

test('PipelineOrchestrator', async (t) => {

  await t.test('✔ Runs pipeline successfully', async () => {
    const mockPipeline = new MockPipeline();
    const orchestrator = new PipelineOrchestrator(mockPipeline as unknown as NewsPipeline);

    const result = await orchestrator.run();
    assert.strictEqual(mockPipeline.executeCount, 1);
    assert.ok(result);
    assert.strictEqual(result.collected, 10);
  });

  await t.test('✔ Prevents overlapping runs', async () => {
    const mockPipeline = new MockPipeline();
    mockPipeline.delayMs = 50;
    const orchestrator = new PipelineOrchestrator(mockPipeline as unknown as NewsPipeline);

    // Start first run
    const run1Promise = orchestrator.run();
    assert.strictEqual(orchestrator.isCurrentlyRunning, true);

    // Try to start second run immediately
    const result2 = await orchestrator.run();
    assert.strictEqual(result2, null, 'Second run should return null immediately');

    // Wait for first to finish
    const result1 = await run1Promise;
    assert.ok(result1);
    assert.strictEqual(mockPipeline.executeCount, 1);
    assert.strictEqual(orchestrator.isCurrentlyRunning, false);
  });

  await t.test('✔ Recovers state if pipeline throws', async () => {
    const mockPipeline = new MockPipeline();
    mockPipeline.shouldFail = true;
    const orchestrator = new PipelineOrchestrator(mockPipeline as unknown as NewsPipeline);

    await assert.rejects(
      async () => await orchestrator.run(),
      /Pipeline error/
    );

    assert.strictEqual(orchestrator.isCurrentlyRunning, false);
    
    // Can run again
    mockPipeline.shouldFail = false;
    const result = await orchestrator.run();
    assert.ok(result);
    assert.strictEqual(mockPipeline.executeCount, 1);
  });

  await t.test('✔ Scheduler executes periodically', async () => {
    const mockPipeline = new MockPipeline();
    const orchestrator = new PipelineOrchestrator(mockPipeline as unknown as NewsPipeline);

    orchestrator.startSchedule(50);
    // Initial run happens async
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(mockPipeline.executeCount, 1);
    
    // Wait for another interval
    await new Promise(r => setTimeout(r, 80));
    assert.strictEqual(mockPipeline.executeCount, 2);

    orchestrator.stopSchedule();
  });
});
