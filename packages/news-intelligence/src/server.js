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
const DefaultTelegramProvider_1 = require("./DefaultTelegramProvider"); // We need this
const FeedService_1 = require("./FeedService");
const TelegramService_1 = require("./TelegramService");
const NewsPipeline_1 = require("./NewsPipeline");
const PipelineOrchestrator_1 = require("./PipelineOrchestrator");
const SourceRegistry_1 = require("./SourceRegistry");
const config_1 = require("./config");
const migrate_1 = require("./persistence/migrate");
const logger_1 = require("./logger");
async function main() {
    const config = (0, config_1.loadConfig)();
    logger_1.logger.setLevel(config.logLevel);
    logger_1.logger.info('Starting News Intelligence server', { component: 'server', config });
    // 0. Migrations
    logger_1.logger.info('Running database migrations', { component: 'server' });
    await (0, migrate_1.runMigrations)(config.databaseUrl);
    // 1. Storage
    logger_1.logger.info('Initializing storage repositories', { component: 'server' });
    const newsRepo = new PostgresNewsRepository_1.PostgresNewsRepository(config.databaseUrl);
    const stateRepo = new PostgresNotificationStateRepository_1.PostgresNotificationStateRepository(config.databaseUrl);
    await newsRepo.initialize();
    await stateRepo.initialize();
    // 2. AI
    const aiProvider = new LocalAIProvider_1.LocalAIProvider({
        baseUrl: config.ollamaBaseUrl,
        model: config.ollamaModel,
        timeoutMs: 120000
    });
    const analyzer = new AIAnalyzer_1.AIAnalyzer(aiProvider);
    // 3. Telegram
    // We provide a real fetch-based implementation of TelegramProvider
    const telegramProvider = new DefaultTelegramProvider_1.DefaultTelegramProvider(config.telegramBotToken || '');
    const telegramService = new TelegramService_1.TelegramService(telegramProvider, stateRepo, config.telegramChatId || '');
    // 4. Core Pipeline
    const sourceRegistry = new SourceRegistry_1.SourceRegistry();
    const deduplicator = new Deduplicator_1.Deduplicator();
    const validator = new EvidenceValidator_1.EvidenceValidator();
    const collectors = [new CybersecCollector_1.CybersecCollector(sourceRegistry)];
    const pipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, newsRepo, telegramService);
    // 5. Orchestrator
    const orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(pipeline);
    // 6. Scheduler
    if (config.pipelineIntervalMs > 0) {
        logger_1.logger.info(`Starting scheduler with interval ${config.pipelineIntervalMs}ms`, { component: 'server', intervalMs: config.pipelineIntervalMs });
        orchestrator.startSchedule(config.pipelineIntervalMs);
    }
    else {
        logger_1.logger.info('Pipeline scheduler disabled (PIPELINE_INTERVAL_MS=0)', { component: 'server' });
    }
    // 7. API / HTTP Trigger (for n8n & read api)
    if (config.apiAuthToken) {
        const feedService = new FeedService_1.FeedService(newsRepo);
        const trigger = new HttpTrigger_1.HttpTrigger(orchestrator, feedService, {
            port: config.port,
            authToken: config.apiAuthToken,
            corsOrigin: config.corsOrigin
        });
        await trigger.start();
        logger_1.logger.info(`HTTP Trigger API listening on port ${config.port}`, { component: 'server', port: config.port });
    }
    else {
        logger_1.logger.info('API_AUTH_TOKEN not set, skipping HTTP API trigger server.', { component: 'server' });
    }
    // Graceful shutdown
    const shutdown = async () => {
        logger_1.logger.info('Shutting down...', { component: 'server' });
        orchestrator.stopSchedule();
        await newsRepo.close();
        await stateRepo.close();
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