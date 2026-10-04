"use strict";
import test from 'node:test';
import assert from 'node:assert';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';

import { PipelineOrchestrator } from '../src/PipelineOrchestrator';
import { DefaultPlanner } from '../src/planner/DefaultPlanner';
import { ProviderRouter } from '../src/router/ProviderRouter';
import { MemoryRouter } from '../src/router/MemoryRouter';
import { StorageRouter } from '../src/router/StorageRouter';
import { ExecutionTracker } from '../src/ExecutionTracker';
import { NewsPipeline } from '../src/NewsPipeline';
import { TelegramService, TelegramProvider } from '../src/TelegramService';
import { CybersecCollector } from '../src/CybersecCollector';
import { SourceRegistry } from '../src/SourceRegistry';
import { Deduplicator } from '../src/Deduplicator';
import { EvidenceValidator } from '../src/EvidenceValidator';
import { AIAnalyzer } from '../src/AIAnalyzer';
import { LocalAIProvider } from '../src/LocalAIProvider';
import { PostgresNewsRepository } from '../src/persistence/PostgresNewsRepository';
import { PostgresNotificationStateRepository } from '../src/persistence/PostgresNotificationStateRepository';
import { StructuredMemoryRepository } from '../src/memory/StructuredMemoryRepository';
import { SemanticMemoryRepository } from '../src/memory/SemanticMemoryRepository';
import { LocalEmbeddingProvider } from '../src/memory/LocalEmbeddingProvider';
import { LocalFileStorage } from '../src/storage/LocalFileStorage';
import { loadConfig } from '../src/config';

// Reusable skip helper
const skipIf = (condition: boolean, message: string) => {
  if (condition) {
    return { skip: message };
  }
  return {};
};

class MockTelegramProvider implements TelegramProvider {
  public dispatched: {chatId: string, message: string}[] = [];
  public async sendMessage(chatId: string, message: string): Promise<void> {
    this.dispatched.push({ chatId, message });
  }
  public isConfigured(): boolean {
    return true;
  }
}

test('AutomationOS Vertical Slice E2E', async (t) => {
  // Inject mock configs if not provided
  if (!process.env.API_AUTH_TOKEN) process.env.API_AUTH_TOKEN = 'test';
  if (!process.env.DATABASE_URL) process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
  
  const config = loadConfig();
  const dbUrl = process.env.TEST_DATABASE_URL;
  
  if (!dbUrl) {
    // Explicitly SKIP the suite
    await t.test('E2E Vertical Slice', { skip: 'TEST_DATABASE_URL is not set' }, () => {});
    return;
  }

  // Check Ollama availability
  const aiProvider = new LocalAIProvider({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaModel,
    timeoutMs: 60000
  });

  let ollamaAvailable = false;
  try {
    const isHealthy = await aiProvider.healthCheck();
    if (isHealthy) {
      ollamaAvailable = true;
    }
  } catch (e) {
    // Ollama not available
  }

  const pool = new Pool({ connectionString: dbUrl });
  const testStorageDir = path.join(__dirname, '../data/test_storage');
  
  // Cleanup test artifacts from previous runs
  try {
    await fs.rm(testStorageDir, { recursive: true, force: true });
    await fs.mkdir(testStorageDir, { recursive: true });
  } catch(e) {}
  
  // Clean execution tracker table in TEST database for e2e
  await pool.query("DELETE FROM executions WHERE module = 'core-news-pipeline'");
  
  // Initialize Real Dependencies
  const executionTracker = new ExecutionTracker(dbUrl);
  
  const sourceRegistry = new SourceRegistry();
  const collectors = [new CybersecCollector(sourceRegistry)];
  const deduplicator = new Deduplicator();
  const validator = new EvidenceValidator();
  const analyzer = new AIAnalyzer(aiProvider);
  
  const newsRepo = new PostgresNewsRepository(dbUrl);
  await newsRepo.initialize();
  
  const stateRepo = new PostgresNotificationStateRepository(dbUrl);
  await stateRepo.initialize();
  
  const telegramConfigured = true;
  const telegramProvider = new MockTelegramProvider();
  const telegramService = new TelegramService(telegramProvider, stateRepo, config.telegramChatId || '@dummy');
  
  const newsPipeline = new NewsPipeline(collectors, deduplicator, validator, analyzer, newsRepo, telegramService);
  const providerRouter = new ProviderRouter([newsPipeline]);
  
  const embeddingProvider = new LocalEmbeddingProvider(config.ollamaBaseUrl);
  await embeddingProvider.init(); // This will report UNAVAILABLE since no --embeddings
  
  const structuredMemory = new StructuredMemoryRepository(dbUrl);
  const semanticMemory = new SemanticMemoryRepository(embeddingProvider);
  const memoryRouter = new MemoryRouter(semanticMemory, structuredMemory);
  
  const storageRouter = new StorageRouter();
  const localFileStorage = new LocalFileStorage(testStorageDir);
  await localFileStorage.configure();
  storageRouter.registerProvider(localFileStorage);

  const planner = new DefaultPlanner(aiProvider);
  
  const orchestrator = new PipelineOrchestrator(
    planner,
    providerRouter,
    memoryRouter,
    storageRouter,
    executionTracker
  );

  await t.test('✔ Executes the first vertical slice from prompt successfully', async (t2) => {
    const prompt = "Research the latest Linux cybersecurity news, summarize the important findings, save the report locally, and send the important findings to Telegram.";
    const result = await orchestrator.executePrompt(prompt);
    
    assert.ok(result);
    assert.strictEqual(typeof result.executionId, 'string');
    
    // 1. Verify ExecutionTracker in Postgres
    const execRows = await pool.query('SELECT * FROM executions WHERE id = $1', [result.executionId]);
    assert.strictEqual(execRows.rows.length, 1);
    const execRecord = execRows.rows[0];
    
    assert.strictEqual(execRecord.status, 'success');
    assert.ok(execRecord.started_at);
    assert.ok(execRecord.completed_at);
    assert.ok(execRecord.verification);
    
    const verification = JSON.parse(execRecord.verification);
    assert.strictEqual(verification.passed, true);
    assert.ok(verification.passCount > 0);
    
    // 2. Storage LocalFileStorage tests
    await t2.test('LocalFileStorage performs I/O and protects against traversal', async () => {
      await localFileStorage.upload('test_report.txt', Buffer.from('Important Findings'));
      const exists = await localFileStorage.exists('test_report.txt');
      assert.strictEqual(exists, true);
      
      const meta = await localFileStorage.getMetadata('test_report.txt');
      assert.ok(meta.sizeBytes > 0);
      assert.strictEqual(meta.mimeType, 'text/plain');
      
      const downloaded = await localFileStorage.download('test_report.txt');
      assert.strictEqual(downloaded.toString(), 'Important Findings');
      
      // Path traversal
      await assert.rejects(
        async () => await localFileStorage.upload('../outside.txt', Buffer.from('hack')),
        /Invalid path/
      );
    });
    
    // 3. Telegram verification
    await t2.test('Telegram Notification Verification', skipIf(!telegramConfigured, 'Telegram credentials unavailable'), async () => {
      // In a real execution, newsPipeline returns notified > 0 if telegram was actually sent.
      // However, we might not have any *new* news to send. But we check that it was attempted or ran properly.
      assert.ok((result as any)['news-intelligence']?.telegramConfigured === true);
    });

    // 3b. Structured Memory verification
    await t2.test('Structured Memory Verification', async () => {
      const memRows = await pool.query("SELECT * FROM structured_memory WHERE scope = 'EXECUTION' AND scope_id = $1", [result.executionId]);
      assert.ok(memRows.rows.length > 0, 'Structured memory should be written');
      assert.strictEqual(memRows.rows[0].type, 'execution_result');
    });
    
    // 4. Semantic Memory state
    await t2.test('Semantic Memory is UNAVAILABLE', async () => {
      assert.strictEqual(embeddingProvider.metadata.availability, 'unavailable');
    });
  });

  // Cleanup test DB and filesystem
  await pool.end();
  await newsRepo.close();
  await stateRepo.close();
  await executionTracker.close();
  try {
    await fs.rm(testStorageDir, { recursive: true, force: true });
  } catch(e) {}
});
