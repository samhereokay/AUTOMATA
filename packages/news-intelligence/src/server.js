"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CybersecCollector_1 = require("./CybersecCollector");
const Deduplicator_1 = require("./Deduplicator");
const EvidenceValidator_1 = require("./EvidenceValidator");
const AIAnalyzer_1 = require("./AIAnalyzer");
const LocalAIProvider_1 = require("./LocalAIProvider");
const PostgresNewsRepository_1 = require("./persistence/PostgresNewsRepository");
const PostgresNotificationStateRepository_1 = require("./persistence/PostgresNotificationStateRepository");
const HttpTrigger_1 = require("./HttpTrigger");
const DefaultTelegramProvider_1 = require("./DefaultTelegramProvider");
const FeedService_1 = require("./FeedService");
const TelegramService_1 = require("./TelegramService");
const NewsPipeline_1 = require("./NewsPipeline");
const PipelineOrchestrator_1 = require("./PipelineOrchestrator");
const SourceRegistry_1 = require("./SourceRegistry");
const ExecutionTracker_1 = require("./ExecutionTracker");
const ModuleRegistry_1 = require("./ModuleRegistry");
const DefaultPlanner_1 = require("./planner/DefaultPlanner");
const ProviderRouter_1 = require("./router/ProviderRouter");
const MemoryRouter_1 = require("./router/MemoryRouter");
const StorageRouter_1 = require("./router/StorageRouter");
const LocalEmbeddingProvider_1 = require("./memory/LocalEmbeddingProvider");
const StructuredMemoryRepository_1 = require("./memory/StructuredMemoryRepository");
const SemanticMemoryRepository_1 = require("./memory/SemanticMemoryRepository");
const LocalFileStorage_1 = require("./storage/LocalFileStorage");
const N8nExecutionProvider_1 = require("./providers/N8nExecutionProvider");
const config_1 = require("./config");
const migrate_1 = require("./persistence/migrate");
const logger_1 = require("./logger");
async function main() {
    const config = (0, config_1.loadConfig)();
    logger_1.logger.setLevel(config.logLevel);
    logger_1.logger.info('Starting Automation OS server', { component: 'server', config });
    // 0. Migrations
    logger_1.logger.info('Running database migrations', { component: 'server' });
    await (0, migrate_1.runMigrations)(config.databaseUrl);
    // 1. Storage
    logger_1.logger.info('Initializing storage repositories', { component: 'server' });
    const newsRepo = new PostgresNewsRepository_1.PostgresNewsRepository(config.databaseUrl);
    const stateRepo = new PostgresNotificationStateRepository_1.PostgresNotificationStateRepository(config.databaseUrl);
    await newsRepo.initialize();
    await stateRepo.initialize();
    // 2. Execution tracker
    logger_1.logger.info('Initializing execution tracker', { component: 'server' });
    const executionTracker = new ExecutionTracker_1.ExecutionTracker(config.databaseUrl);
    // 3. Module registry
    const moduleRegistry = new ModuleRegistry_1.ModuleRegistry();
    logger_1.logger.info('Module registry initialized', {
        component: 'server',
        activeModules: moduleRegistry.listActiveModules().map(m => m.id)
    });
    // 4. AI
    const aiProvider = new LocalAIProvider_1.LocalAIProvider({
        baseUrl: config.ollamaBaseUrl,
        model: config.ollamaModel,
        timeoutMs: 120000
    });
    const analyzer = new AIAnalyzer_1.AIAnalyzer(aiProvider);
    // 5. Telegram
    const telegramProvider = new DefaultTelegramProvider_1.DefaultTelegramProvider(config.telegramBotToken || '');
    const telegramService = new TelegramService_1.TelegramService(telegramProvider, stateRepo, config.telegramChatId || '');
    // 6. Core Pipeline
    const sourceRegistry = new SourceRegistry_1.SourceRegistry();
    const deduplicator = new Deduplicator_1.Deduplicator();
    const validator = new EvidenceValidator_1.EvidenceValidator();
    const collectors = [new CybersecCollector_1.CybersecCollector(sourceRegistry)];
    const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, newsRepo, telegramService);
    // 6b. Memory & Storage
    logger_1.logger.info('Initializing Memory & Storage Routers', { component: 'server' });
    const embeddingProvider = new LocalEmbeddingProvider_1.LocalEmbeddingProvider(config.ollamaBaseUrl);
    await embeddingProvider.init();
    const structuredMemory = new StructuredMemoryRepository_1.StructuredMemoryRepository(config.databaseUrl);
    const semanticMemory = new SemanticMemoryRepository_1.SemanticMemoryRepository(embeddingProvider);
    const memoryRouter = new MemoryRouter_1.MemoryRouter(semanticMemory, structuredMemory);
    const storageRouter = new StorageRouter_1.StorageRouter();
    const localFileStorage = new LocalFileStorage_1.LocalFileStorage('./data/storage');
    await localFileStorage.configure();
    storageRouter.registerProvider(localFileStorage);
    const n8nProvider = new N8nExecutionProvider_1.N8nExecutionProvider({
        id: 'n8n-provider',
        name: 'N8n Workflow Provider',
        capabilities: ['research'],
        executionMode: 'local',
        costModel: 'free',
        privacyModel: 'strict',
        availability: 'available',
        requiresCredentials: false
    }, {
        n8nBaseUrl: 'http://localhost:5678',
        webhookPath: '/webhook/automata-research'
    });
    const providerRouter = new ProviderRouter_1.ProviderRouter();
    providerRouter.registerProvider(pipeline);
    providerRouter.registerProvider(n8nProvider);
    const planner = new DefaultPlanner_1.DefaultPlanner(aiProvider);
    // 7. Orchestrator
    const orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(planner, providerRouter, memoryRouter, storageRouter, executionTracker);
    // 8. Scheduler
    if (config.pipelineIntervalMs > 0) {
        logger_1.logger.info(`Starting scheduler with interval ${config.pipelineIntervalMs}ms`, { component: 'server', intervalMs: config.pipelineIntervalMs });
        // In a real system we would schedule `orchestrator.executePrompt(...)` here.
        // Not scheduling NewsPipeline directly anymore since orchestrator takes prompts.
    }
    else {
        logger_1.logger.info('Pipeline scheduler disabled (PIPELINE_INTERVAL_MS=0)', { component: 'server' });
    }
    // 9. API / HTTP Trigger (for n8n & read api)
    if (config.apiAuthToken) {
        const feedService = new FeedService_1.FeedService(newsRepo);
        const trigger = new HttpTrigger_1.HttpTrigger(orchestrator, feedService, {
            port: config.port,
            authToken: config.apiAuthToken,
            corsOrigin: config.corsOrigin
        }, executionTracker, moduleRegistry);
        await trigger.start();
        logger_1.logger.info(`Automation OS API listening on port ${config.port}`, { component: 'server', port: config.port });
    }
    else {
        logger_1.logger.info('API_AUTH_TOKEN not set, skipping HTTP API trigger server.', { component: 'server' });
    }
    // Graceful shutdown
    const shutdown = async () => {
        logger_1.logger.info('Shutting down...', { component: 'server' });
        await newsRepo.close();
        await stateRepo.close();
        await executionTracker.close();
        await structuredMemory.close();
        logger_1.logger.info('Shutdown complete', { component: 'server' });
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
if (require.main === module) {
    main().catch(err => {
        logger_1.logger.error('Fatal error in server:', { component: 'server', error: err });
        process.exit(1);
    });
}
//# sourceMappingURL=server.js.map