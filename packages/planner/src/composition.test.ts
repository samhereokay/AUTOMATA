import { AIPlanner } from './planner';
import { AIProvider } from '@automata/ai-provider';
import { ExecutionPlan } from './types';

// Mock AI provider that returns expected plan structure to test composition matching
class MockAIProvider implements AIProvider {
  name = 'mock';
  constructor(private responses: Record<string, ExecutionPlan>) {}

  async generateText(prompt: string): Promise<string> { return ''; }
  async generateJSON<T>(prompt: string): Promise<T> {
    for (const key of Object.keys(this.responses)) {
      if (prompt.includes(key)) {
        return this.responses[key] as any as T;
      }
    }
    throw new Error('No mock response found');
  }
  async isAvailable(): Promise<boolean> { return true; }
  async getModels(): Promise<string[]> { return ['mock']; }
}

const capabilities = [
  'research', 'web_search', 'citations',
  'writing', 'summarization',
  'assistant', 'telegram', 'memory', 'delivery',
  'social_media', 'content_generation', 'approval'
];

async function runTests() {
  const provider = new MockAIProvider({
    "Research AI news": {
      intent: "Research AI news",
      tasks: ["Research"],
      requiredCapabilities: [["research", "web_search"]]
    },
    "Write a report about AI news": {
      intent: "Write a report about AI news",
      tasks: ["Research", "Write report"],
      requiredCapabilities: [["research", "web_search"], ["writing", "summarization"]]
    },
    "Research AI news and create a LinkedIn post": {
      intent: "Research AI news and create a LinkedIn post",
      tasks: ["Research", "Write", "Post"],
      requiredCapabilities: [["research", "web_search"], ["writing"], ["social_media", "content_generation"]]
    },
    "Send me today's AI news on Telegram": {
      intent: "Send me today's AI news on Telegram",
      tasks: ["Research", "Send Telegram"],
      requiredCapabilities: [["research", "web_search"], ["assistant", "telegram", "delivery"]]
    },
    "Research AI news, create a report, then send it to Telegram": {
      intent: "Research AI news, create a report, then send it to Telegram",
      tasks: ["Research", "Write report", "Send Telegram"],
      requiredCapabilities: [["research", "web_search"], ["writing", "summarization"], ["assistant", "telegram", "delivery"]]
    }
  });

  const planner = new AIPlanner(provider);
  
  const testCases = [
    "Research AI news",
    "Write a report about AI news",
    "Research AI news and create a LinkedIn post",
    "Send me today's AI news on Telegram",
    "Research AI news, create a report, then send it to Telegram"
  ];

  let passed = 0;
  for (const test of testCases) {
    try {
      const plan = await planner.plan(test, capabilities);
      console.log(`\nTest: ${test}`);
      console.log(`Plan:\n${plan.requiredCapabilities.map(c => `  - [${c.join(', ')}]`).join('\n')}`);
      passed++;
    } catch (e) {
      console.error(`Test Failed: ${test}`);
    }
  }

  console.log(`\nPassed ${passed}/${testCases.length} composition tests.`);
}

runTests().catch(console.error);
