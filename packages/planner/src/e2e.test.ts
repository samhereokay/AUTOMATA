import { AIPlanner } from './planner';
import { OllamaProvider } from '@automata/ai-provider';
import { N8nRestAPIClient, AutomataExecutionManager } from '@automata/n8n-client';

const capabilities = [
  'research', 'web_search', 'citations',
  'writing', 'summarization',
  'assistant', 'telegram', 'memory', 'delivery',
  'social_media', 'content_generation', 'approval'
];

async function runE2E() {
  const provider = new OllamaProvider('http://localhost:11434');
  
  console.log("Checking AI provider...");
  const isAvailable = await provider.isAvailable();
  if (!isAvailable) {
    throw new Error("Ollama is not available");
  }

  const models = await provider.getModels();
  console.log("Available models:", models);
  if (models.length === 0) {
    throw new Error("No models available in Ollama");
  }

  const planner = new AIPlanner(provider);
  const n8nClient = new N8nRestAPIClient('http://localhost:5678', 'dummy-key');
  const executionManager = new AutomataExecutionManager(n8nClient);
  
  const testCases = [
    "Research AI news",
    "Write a report about AI news",
    "Research AI news and create a LinkedIn post",
    "Send me today's AI news on Telegram",
    "Research AI news, create a report, then send it to Telegram"
  ];

  let passed = 0;
  for (const test of testCases) {
    console.log(`\n==========================================`);
    console.log(`E2E Test: ${test}`);
    try {
      // 1. Plan
      console.log(`[1] Planning...`);
      const plan = await planner.plan(test, capabilities);
      console.log(`Plan produced:`);
      console.log(JSON.stringify(plan, null, 2));

      // 2. Validate
      if (!plan.requiredCapabilities || plan.requiredCapabilities.length === 0) {
        throw new Error("Invalid plan produced");
      }

      // 3. Execute
      console.log(`[2] Executing in n8n...`);
      // Convert tasks to workflow IDs for the mock (normally WorkflowRegistry handles this)
      // Since the Planner just returns capabilities, we map them manually for the test
      const workflowIds = [];
      const caps = plan.requiredCapabilities.flat().join(' ');
      if (caps.includes('research')) workflowIds.push('research.web');
      if (caps.includes('writing')) workflowIds.push('writer.general');
      if (caps.includes('telegram')) workflowIds.push('assistant.telegram');
      if (caps.includes('social')) workflowIds.push('ssma.content');

      if (workflowIds.length === 0) workflowIds.push('research.web');

      await executionManager.run('job-' + Date.now(), workflowIds, { prompt: test });
      
      console.log(`✅ Success`);
      passed++;
    } catch (e: any) {
      console.error(`❌ Failed:`, e.message);
    }
  }

  console.log(`\nPassed ${passed}/${testCases.length} E2E tests.`);
}

runE2E().catch(console.error);
