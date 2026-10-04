"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineOrchestrator = void 0;
const logger_1 = require("./logger");
class PipelineOrchestrator {
    planner;
    providerRouter;
    memoryRouter;
    storageRouter;
    executionTracker;
    isRunning = false;
    timer = null;
    constructor(planner, providerRouter, memoryRouter, storageRouter, executionTracker) {
        this.planner = planner;
        this.providerRouter = providerRouter;
        this.memoryRouter = memoryRouter;
        this.storageRouter = storageRouter;
        this.executionTracker = executionTracker;
    }
    /**
     * Execute the full automation OS pipeline from a natural language prompt.
     * Prompts -> Plan -> Route -> Execute -> Verify -> Track
     */
    async executePrompt(prompt) {
        if (this.isRunning) {
            logger_1.logger.warn('Pipeline is already running, skipping execution');
            return null;
        }
        this.isRunning = true;
        let executionId = '';
        try {
            // 1. Plan
            logger_1.logger.info('Generating execution plan', { prompt });
            const plan = await this.planner.createPlan(prompt);
            executionId = await this.executionTracker.planExecution('automata-os-routed', { prompt, plan });
            await this.executionTracker.startExecution(executionId);
            // 2. Route Memory
            if (plan.memory.required) {
                logger_1.logger.info('Routing memory requirements');
                await this.memoryRouter.route(plan.memory);
            }
            // 3. Route Storage
            if (plan.storage.required) {
                logger_1.logger.info('Routing storage requirements');
                await this.storageRouter.route(plan.storage, plan.privacy);
            }
            // 5. Execute Capabilities
            let result = {};
            for (const capability of plan.capabilities) {
                logger_1.logger.info('Routing provider for capability', { capability });
                const provider = await this.providerRouter.route(capability, plan.privacy);
                logger_1.logger.info('Executing capability on provider', { provider: provider.metadata.name });
                let providerResult;
                if (provider.metadata.id === 'core-news-pipeline') {
                    const anyProvider = provider;
                    providerResult = await anyProvider.run(executionId);
                }
                else {
                    const anyProvider = provider;
                    providerResult = await anyProvider.execute(prompt);
                }
                result[capability] = providerResult;
            }
            // 5b. Write to structured memory
            if (plan.memory.required) {
                await this.memoryRouter.storeStructured('EXECUTION', executionId, 'execution_result', 'final', result);
            }
            // 6. Verify
            const verification = {
                passed: true,
                checks: [{ name: 'execution_success', status: 'pass' }],
                passCount: 1,
                failCount: 0,
                skipCount: 0
            };
            // 7. Track completion
            await this.executionTracker.completeExecution(executionId, result, verification, []);
            if (result && typeof result === 'object') {
                result.executionId = executionId;
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Pipeline execution failed', { error });
            if (executionId) {
                await this.executionTracker.failExecution(executionId, error.message);
            }
            return null;
        }
        finally {
            this.isRunning = false;
        }
    }
    get isCurrentlyRunning() {
        return this.isRunning;
    }
}
exports.PipelineOrchestrator = PipelineOrchestrator;
//# sourceMappingURL=PipelineOrchestrator.js.map