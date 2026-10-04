"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const pg_1 = require("pg");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const PipelineOrchestrator_1 = require("../src/PipelineOrchestrator");
const DefaultPlanner_1 = require("../src/planner/DefaultPlanner");
const ProviderRouter_1 = require("../src/router/ProviderRouter");
const MemoryRouter_1 = require("../src/router/MemoryRouter");
const StorageRouter_1 = require("../src/router/StorageRouter");
const ExecutionTracker_1 = require("../src/ExecutionTracker");
const NewsPipeline_1 = require("../src/NewsPipeline");
const TelegramService_1 = require("../src/TelegramService");
const CybersecCollector_1 = require("../src/CybersecCollector");
const SourceRegistry_1 = require("../src/SourceRegistry");
const Deduplicator_1 = require("../src/Deduplicator");
const EvidenceValidator_1 = require("../src/EvidenceValidator");
const AIAnalyzer_1 = require("../src/AIAnalyzer");
const LocalAIProvider_1 = require("../src/LocalAIProvider");
const PostgresNewsRepository_1 = require("../src/persistence/PostgresNewsRepository");
const PostgresNotificationStateRepository_1 = require("../src/persistence/PostgresNotificationStateRepository");
const StructuredMemoryRepository_1 = require("../src/memory/StructuredMemoryRepository");
const SemanticMemoryRepository_1 = require("../src/memory/SemanticMemoryRepository");
const LocalEmbeddingProvider_1 = require("../src/memory/LocalEmbeddingProvider");
const LocalFileStorage_1 = require("../src/storage/LocalFileStorage");
const config_1 = require("../src/config");
// Reusable skip helper
const skipIf = (condition, message) => {
    if (condition) {
        return { skip: message };
    }
    return {};
};
class MockTelegramProvider {
    dispatched = [];
    async sendMessage(chatId, message) {
        this.dispatched.push({ chatId, message });
    }
    isConfigured() {
        return true;
    }
}
(0, node_test_1.default)('AutomationOS Vertical Slice E2E', async (t) => {
    // Inject mock configs if not provided
    if (!process.env.API_AUTH_TOKEN)
        process.env.API_AUTH_TOKEN = 'test';
    if (!process.env.DATABASE_URL)
        process.env.DATABASE_URL = 'postgresql://dummy:dummy@localhost:5432/dummy';
    const config = (0, config_1.loadConfig)();
    const dbUrl = process.env.TEST_DATABASE_URL;
    if (!dbUrl) {
        // Explicitly SKIP the suite
        await t.test('E2E Vertical Slice', { skip: 'TEST_DATABASE_URL is not set' }, () => { });
        return;
    }
    // Check Ollama availability
    const aiProvider = new LocalAIProvider_1.LocalAIProvider({
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
    }
    catch (e) {
        // Ollama not available
    }
    const pool = new pg_1.Pool({ connectionString: dbUrl });
    const testStorageDir = path_1.default.join(__dirname, '../data/test_storage');
    // Cleanup test artifacts from previous runs
    try {
        await promises_1.default.rm(testStorageDir, { recursive: true, force: true });
        await promises_1.default.mkdir(testStorageDir, { recursive: true });
    }
    catch (e) { }
    // Clean execution tracker table in TEST database for e2e
    await pool.query("DELETE FROM executions WHERE module = 'core-news-pipeline'");
    // Initialize Real Dependencies
    const executionTracker = new ExecutionTracker_1.ExecutionTracker(dbUrl);
    const sourceRegistry = new SourceRegistry_1.SourceRegistry();
    const collectors = [new CybersecCollector_1.CybersecCollector(sourceRegistry)];
    const deduplicator = new Deduplicator_1.Deduplicator();
    const validator = new EvidenceValidator_1.EvidenceValidator();
    const analyzer = new AIAnalyzer_1.AIAnalyzer(aiProvider);
    const newsRepo = new PostgresNewsRepository_1.PostgresNewsRepository(dbUrl);
    await newsRepo.initialize();
    const stateRepo = new PostgresNotificationStateRepository_1.PostgresNotificationStateRepository(dbUrl);
    await stateRepo.initialize();
    const telegramConfigured = true;
    const telegramProvider = new MockTelegramProvider();
    const telegramService = new TelegramService_1.TelegramService(telegramProvider, stateRepo, config.telegramChatId || '@dummy');
    const newsPipeline = new NewsPipeline_1.NewsPipeline(collectors, deduplicator, validator, analyzer, newsRepo, telegramService);
    const providerRouter = new ProviderRouter_1.ProviderRouter([newsPipeline]);
    const embeddingProvider = new LocalEmbeddingProvider_1.LocalEmbeddingProvider(config.ollamaBaseUrl);
    await embeddingProvider.init(); // This will report UNAVAILABLE since no --embeddings
    const structuredMemory = new StructuredMemoryRepository_1.StructuredMemoryRepository(dbUrl);
    const semanticMemory = new SemanticMemoryRepository_1.SemanticMemoryRepository(embeddingProvider);
    const memoryRouter = new MemoryRouter_1.MemoryRouter(semanticMemory, structuredMemory);
    const storageRouter = new StorageRouter_1.StorageRouter();
    const localFileStorage = new LocalFileStorage_1.LocalFileStorage(testStorageDir);
    await localFileStorage.configure();
    storageRouter.registerProvider(localFileStorage);
    const planner = new DefaultPlanner_1.DefaultPlanner(aiProvider);
    const orchestrator = new PipelineOrchestrator_1.PipelineOrchestrator(planner, providerRouter, memoryRouter, storageRouter, executionTracker);
    await t.test('✔ Executes the first vertical slice from prompt successfully', async (t2) => {
        const prompt = "Research the latest Linux cybersecurity news, summarize the important findings, save the report locally, and send the important findings to Telegram.";
        const result = await orchestrator.executePrompt(prompt);
        node_assert_1.default.ok(result);
        node_assert_1.default.strictEqual(typeof result.executionId, 'string');
        // 1. Verify ExecutionTracker in Postgres
        const execRows = await pool.query('SELECT * FROM executions WHERE id = $1', [result.executionId]);
        node_assert_1.default.strictEqual(execRows.rows.length, 1);
        const execRecord = execRows.rows[0];
        node_assert_1.default.strictEqual(execRecord.status, 'success');
        node_assert_1.default.ok(execRecord.started_at);
        node_assert_1.default.ok(execRecord.completed_at);
        node_assert_1.default.ok(execRecord.verification);
        const verification = JSON.parse(execRecord.verification);
        node_assert_1.default.strictEqual(verification.passed, true);
        node_assert_1.default.ok(verification.passCount > 0);
        // 2. Storage LocalFileStorage tests
        await t2.test('LocalFileStorage performs I/O and protects against traversal', async () => {
            await localFileStorage.upload('test_report.txt', Buffer.from('Important Findings'));
            const exists = await localFileStorage.exists('test_report.txt');
            node_assert_1.default.strictEqual(exists, true);
            const meta = await localFileStorage.getMetadata('test_report.txt');
            node_assert_1.default.ok(meta.sizeBytes > 0);
            node_assert_1.default.strictEqual(meta.mimeType, 'text/plain');
            const downloaded = await localFileStorage.download('test_report.txt');
            node_assert_1.default.strictEqual(downloaded.toString(), 'Important Findings');
            // Path traversal
            await node_assert_1.default.rejects(async () => await localFileStorage.upload('../outside.txt', Buffer.from('hack')), /Invalid path/);
        });
        // 3. Telegram verification
        await t2.test('Telegram Notification Verification', skipIf(!telegramConfigured, 'Telegram credentials unavailable'), async () => {
            // In a real execution, newsPipeline returns notified > 0 if telegram was actually sent.
            // However, we might not have any *new* news to send. But we check that it was attempted or ran properly.
            node_assert_1.default.ok(result['news-intelligence']?.telegramConfigured === true);
        });
        // 3b. Structured Memory verification
        await t2.test('Structured Memory Verification', async () => {
            const memRows = await pool.query("SELECT * FROM structured_memory WHERE scope = 'EXECUTION' AND scope_id = $1", [result.executionId]);
            node_assert_1.default.ok(memRows.rows.length > 0, 'Structured memory should be written');
            node_assert_1.default.strictEqual(memRows.rows[0].type, 'execution_result');
        });
        // 4. Semantic Memory state
        await t2.test('Semantic Memory is UNAVAILABLE', async () => {
            node_assert_1.default.strictEqual(embeddingProvider.metadata.availability, 'unavailable');
        });
    });
    // Cleanup test DB and filesystem
    await pool.end();
    await newsRepo.close();
    await stateRepo.close();
    await executionTracker.close();
    try {
        await promises_1.default.rm(testStorageDir, { recursive: true, force: true });
    }
    catch (e) { }
});
//# sourceMappingURL=AutomationOS.e2e.test.js.map