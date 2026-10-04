"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const PipelineOrchestrator_1 = require("../src/PipelineOrchestrator");
(0, node_test_1.default)('PipelineOrchestrator', async (t) => {
    const mockProvider = {
        metadata: { id: 'core-news-pipeline', name: 'Mock' },
        run: async () => ({ collected: 1 })
    };
    const mockPlanner = {
        createPlan: async () => ({
            intent: 'test',
            capabilities: ['test'],
            memory: { required: false },
            storage: { required: false },
            privacy: { cloud_allowed: false },
            verificationRequirements: []
        })
    };
    const mockProviderRouter = {
        route: async () => mockProvider
    };
    const mockMemoryRouter = {
        route: async () => { }
    };
    const mockStorageRouter = {
        route: async () => ({})
    };
    const mockExecutionTracker = {
        planExecution: async () => 'exec_123',
        startExecution: async () => { },
        completeExecution: async () => { },
        failExecution: async () => { }
    };
    await t.test('✔ Runs pipeline successfully', async () => {
        const orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(mockPlanner, mockProviderRouter, mockMemoryRouter, mockStorageRouter, mockExecutionTracker);
        node_assert_1.default.strictEqual(orchestrator.isCurrentlyRunning, false);
        const promise = orchestrator.executePrompt('test');
        node_assert_1.default.strictEqual(orchestrator.isCurrentlyRunning, true);
        const res = await promise;
        node_assert_1.default.strictEqual(orchestrator.isCurrentlyRunning, false);
        node_assert_1.default.ok(res);
    });
    await t.test('✔ Prevents overlapping runs', async () => {
        let resolveRun = () => { };
        const slowProviderRouter = {
            route: async () => {
                return {
                    metadata: { id: 'core-news-pipeline', name: 'Slow' },
                    run: async () => new Promise(res => { resolveRun = res; })
                };
            }
        };
        const orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(mockPlanner, slowProviderRouter, mockMemoryRouter, mockStorageRouter, mockExecutionTracker);
        const p1 = orchestrator.executePrompt('test');
        // Ensure the event loop runs and p1 reaches the slow provider
        await new Promise(r => setTimeout(r, 10));
        // Attempt second run while first is blocked
        const res2 = await orchestrator.executePrompt('test');
        node_assert_1.default.strictEqual(res2, null);
        resolveRun({ collected: 1 });
        await p1;
    });
});
//# sourceMappingURL=PipelineOrchestrator.test.js.map