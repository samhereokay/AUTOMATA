import { CybersecCollector } from './CybersecCollector';
import { Deduplicator } from './Deduplicator';
import { EvidenceValidator } from './EvidenceValidator';
import { AIAnalyzer } from './AIAnalyzer';
import { LocalAIProvider } from './LocalAIProvider';
import { PostgresNewsRepository } from './persistence/PostgresNewsRepository';
import { PostgresNotificationStateRepository } from './persistence/PostgresNotificationStateRepository';
import { HttpTrigger } from './HttpTrigger';
import { DefaultTelegramProvider } from './DefaultTelegramProvider'; // We need this
import { FeedService } from './FeedService';
import { TelegramService } from './TelegramService';
import { NewsPipeline } from './NewsPipeline';
import { PipelineOrchestrator } from './PipelineOrchestrator';
import { SourceRegistry } from './SourceRegistry';
import { loadConfig } from './config';
import { runMigrations } from './persistence/migrate';
import { logger } from './logger';

async function main() {
  const config = loadConfig();
  
  logger.setLevel(config.logLevel);
  logger.info('Starting News Intelligence server', { component: 'server', config });

  // 0. Migrations
  logger.info('Running database migrations', { component: 'server' });
  await runMigrations(config.databaseUrl);

  // 1. Storage
  logger.info('Initializing storage repositories', { component: 'server' });
  const newsRepo = new PostgresNewsRepository(config.databaseUrl);
  const stateRepo = new PostgresNotificationStateRepository(config.databaseUrl);
  await newsRepo.initialize();
  await stateRepo.initialize();

  // 2. AI
  const aiProvider = new LocalAIProvider({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaModel,
    timeoutMs: 120000
  });
  const analyzer = new AIAnalyzer(aiProvider);

  // 3. Telegram
  // We provide a real fetch-based implementation of TelegramProvider
  const telegramProvider = new DefaultTelegramProvider(config.telegramBotToken || '');
  const telegramService = new TelegramService(telegramProvider, stateRepo, config.telegramChatId || '');

  // 4. Core Pipeline
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

  // 5. Orchestrator
  const orchestrator = new PipelineOrchestrator(pipeline);

  // 6. Scheduler
  if (config.pipelineIntervalMs > 0) {
    logger.info(`Starting scheduler with interval ${config.pipelineIntervalMs}ms`, { component: 'server', intervalMs: config.pipelineIntervalMs });
    orchestrator.startSchedule(config.pipelineIntervalMs);
  } else {
    logger.info('Pipeline scheduler disabled (PIPELINE_INTERVAL_MS=0)', { component: 'server' });
  }

  // 7. API / HTTP Trigger (for n8n & read api)
  if (config.apiAuthToken) {
    const feedService = new FeedService(newsRepo);
    const trigger = new HttpTrigger(orchestrator, feedService, { 
      port: config.port, 
      authToken: config.apiAuthToken,
      corsOrigin: config.corsOrigin
    });
    await trigger.start();
    logger.info(`HTTP Trigger API listening on port ${config.port}`, { component: 'server', port: config.port });
  } else {
    logger.info('API_AUTH_TOKEN not set, skipping HTTP API trigger server.', { component: 'server' });
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...', { component: 'server' });
    orchestrator.stopSchedule();
    await newsRepo.close();
    await stateRepo.close();
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
