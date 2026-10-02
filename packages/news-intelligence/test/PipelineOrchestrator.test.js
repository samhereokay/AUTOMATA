"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const PipelineOrchestrator_1 = require("../src/PipelineOrchestrator");
class MockPipeline {
    executeCount = 0;
    delayMs = 0;
    shouldFail = false;
    async run() {
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
(0, node_test_1.default)('PipelineOrchestrator', async (t) => {
    await t.test('✔ Runs pipeline successfully', async () => {
        const mockPipeline = new MockPipeline();
        const orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(mockPipeline);
        const result = await orchestrator.run();
        node_assert_1.default.strictEqual(mockPipeline.executeCount, 1);
        node_assert_1.default.ok(result);
        node_assert_1.default.strictEqual(result.collected, 10);
    });
    await t.test('✔ Prevents overlapping runs', async () => {
        const mockPipeline = new MockPipeline();
        mockPipeline.delayMs = 50;
        const orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(mockPipeline);
        // Start first run
        const run1Promise = orchestrator.run();
        node_assert_1.default.strictEqual(orchestrator.isCurrentlyRunning, true);
        // Try to start second run immediately
        const result2 = await orchestrator.run();
        node_assert_1.default.strictEqual(result2, null, 'Second run should return null immediately');
        // Wait for first to finish
        const result1 = await run1Promise;
        node_assert_1.default.ok(result1);
        node_assert_1.default.strictEqual(mockPipeline.executeCount, 1);
        node_assert_1.default.strictEqual(orchestrator.isCurrentlyRunning, false);
    });
    await t.test('✔ Recovers state if pipeline throws', async () => {
        const mockPipeline = new MockPipeline();
        mockPipeline.shouldFail = true;
        const orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(mockPipeline);
        await node_assert_1.default.rejects(async () => await orchestrator.run(), /Pipeline error/);
        node_assert_1.default.strictEqual(orchestrator.isCurrentlyRunning, false);
        // Can run again
        mockPipeline.shouldFail = false;
        const result = await orchestrator.run();
        node_assert_1.default.ok(result);
        node_assert_1.default.strictEqual(mockPipeline.executeCount, 1);
    });
    await t.test('✔ Scheduler executes periodically', async () => {
        const mockPipeline = new MockPipeline();
        const orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(mockPipeline);
        orchestrator.startSchedule(50);
        // Initial run happens async
        await new Promise(r => setTimeout(r, 10));
        node_assert_1.default.strictEqual(mockPipeline.executeCount, 1);
        // Wait for another interval
        await new Promise(r => setTimeout(r, 80));
        node_assert_1.default.strictEqual(mockPipeline.executeCount, 2);
        orchestrator.stopSchedule();
    });
});
//# sourceMappingURL=PipelineOrchestrator.test.js.map