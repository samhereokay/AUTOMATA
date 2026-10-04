import { CybersecCollector } from './CybersecCollector';
import { Deduplicator } from './Deduplicator';
import { EvidenceValidator } from './EvidenceValidator';
import { AIAnalyzer } from './AIAnalyzer';
import { LocalAIProvider } from './LocalAIProvider';
import { PostgresNewsRepository } from './persistence/PostgresNewsRepository';
import { PostgresNotificationStateRepository } from './persistence/PostgresNotificationStateRepository';
import { HttpTrigger } from './HttpTrigger';
import { DefaultTelegramProvider } from './DefaultTelegramProvider';
import { FeedService } from './FeedService';
import { TelegramService } from './TelegramService';
import { NewsPipeline } from './NewsPipeline';
import { PipelineOrchestrator } from './PipelineOrchestrator';
import { SourceRegistry } from './SourceRegistry';
import { ExecutionTracker } from './ExecutionTracker';
import { ModuleRegistry } from './ModuleRegistry';
import { DefaultPlanner } from './planner/DefaultPlanner';
import { ProviderRouter } from './router/ProviderRouter';
import { MemoryRouter } from './router/MemoryRouter';
import { StorageRouter } from './router/StorageRouter';
import { LocalEmbeddingProvider } from './memory/LocalEmbeddingProvider';
import { StructuredMemoryRepository } from './memory/StructuredMemoryRepository';
import { SemanticMemoryRepository } from './memory/SemanticMemoryRepository';
import { LocalFileStorage } from './storage/LocalFileStorage';
import { N8nExecutionProvider } from './providers/N8nExecutionProvider';
import { loadConfig } from './config';
import { runMigrations } from './persistence/migrate';
import { logger } from './logger';

async function main() {
  const config = loadConfig();

  logger.setLevel(config.logLevel);
  logger.info('Starting Automation OS server', { component: 'server', config });

  // 0. Migrations
  logger.info('Running database migrations', { component: 'server' });
  await runMigrations(config.databaseUrl);

  // 1. Storage
  logger.info('Initializing storage repositories', { component: 'server' });
  const newsRepo = new PostgresNewsRepository(config.databaseUrl);
  const stateRepo = new PostgresNotificationStateRepository(config.databaseUrl);
  await newsRepo.initialize();
  await stateRepo.initialize();

  // 2. Execution tracker
  logger.info('Initializing execution tracker', { component: 'server' });
  const executionTracker = new ExecutionTracker(config.databaseUrl);

  // 3. Module registry
  const moduleRegistry = new ModuleRegistry();
  logger.info('Module registry initialized', {
    component: 'server',
    activeModules: moduleRegistry.listActiveModules().map(m => m.id)
  });

  // 4. AI
  const aiProvider = new LocalAIProvider({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaModel,
    timeoutMs: 120000
  });
  const analyzer = new AIAnalyzer(aiProvider);

  // 5. Telegram
  const telegramProvider = new DefaultTelegramProvider(config.telegramBotToken || '');
  const telegramService = new TelegramService(telegramProvider, stateRepo, config.telegramChatId || '');

  // 6. Core Pipeline
  const sourceRegistry = new SourceRegistry();
  const deduplicator = new Deduplicator();
  const validator = new EvidenceValidator();
  const collectors = [new CybersecCollector(sourceRegistry)];

  const pipeline = new NewsPipeline(
    collectors,
    deduplicator,
    validator,
    analyzer,
    newsRepo,
    telegramService
  );

  // 6b. Memory & Storage
  logger.info('Initializing Memory & Storage Routers', { component: 'server' });
  
  const embeddingProvider = new LocalEmbeddingProvider(config.ollamaBaseUrl);
  await embeddingProvider.init();
  
  const structuredMemory = new StructuredMemoryRepository(config.databaseUrl);
  const semanticMemory = new SemanticMemoryRepository(embeddingProvider);
  
  const memoryRouter = new MemoryRouter(semanticMemory, structuredMemory);
  const storageRouter = new StorageRouter();
  
  const localFileStorage = new LocalFileStorage('./data/storage');
  await localFileStorage.configure();
  storageRouter.registerProvider(localFileStorage);

  const n8nProvider = new N8nExecutionProvider(
    {
      id: 'n8n-provider',
      name: 'N8n Workflow Provider',
      capabilities: ['research' as any],
      executionMode: 'local',
      costModel: 'free',
      privacyModel: 'strict',
      availability: 'available',
      requiresCredentials: false
    },
    {
      n8nBaseUrl: 'http://localhost:5678',
      webhookPath: '/webhook/automata-research'
    }
  );

  const providerRouter = new ProviderRouter();
  providerRouter.registerProvider(pipeline);
  providerRouter.registerProvider(n8nProvider);

  const planner = new DefaultPlanner(aiProvider);

  // 7. Orchestrator
  const orchestrator = new PipelineOrchestrator(
    planner,
    providerRouter,
    memoryRouter,
    storageRouter,
    executionTracker
  );

  // 8. Scheduler
  if (config.pipelineIntervalMs > 0) {
    logger.info(`Starting scheduler with interval ${config.pipelineIntervalMs}ms`, { component: 'server', intervalMs: config.pipelineIntervalMs });
    // In a real system we would schedule `orchestrator.executePrompt(...)` here.
    // Not scheduling NewsPipeline directly anymore since orchestrator takes prompts.
  } else {
    logger.info('Pipeline scheduler disabled (PIPELINE_INTERVAL_MS=0)', { component: 'server' });
  }

  // 9. API / HTTP Trigger (for n8n & read api)
  if (config.apiAuthToken) {
    const feedService = new FeedService(newsRepo);
    const trigger = new HttpTrigger(
      orchestrator,
      feedService,
      {
        port: config.port,
        authToken: config.apiAuthToken,
        corsOrigin: config.corsOrigin
      },
      executionTracker,
      moduleRegistry
    );
    await trigger.start();
    logger.info(`Automation OS API listening on port ${config.port}`, { component: 'server', port: config.port });
  } else {
    logger.info('API_AUTH_TOKEN not set, skipping HTTP API trigger server.', { component: 'server' });
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...', { component: 'server' });
    await newsRepo.close();
    await stateRepo.close();
    await executionTracker.close();
    await structuredMemory.close();
    logger.info('Shutdown complete', { component: 'server' });
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main().catch(err => {
    logger.error('Fatal error in server:', { component: 'server', error: err });
    process.exit(1);
  });
}
