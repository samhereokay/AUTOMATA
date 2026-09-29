import { LocalWorkflowRegistry } from './index';
import { WorkflowDefinition } from './types';

export async function seedWorkflows(registry: LocalWorkflowRegistry) {
  const workflows: WorkflowDefinition[] = [
    {
      id: 'research.web',
      version: '1.0.0',
      name: 'Web Research',
      category: 'research',
      description: 'Research a topic and return cited findings',
      inputSchema: {},
      outputSchema: {},
      requiredConnections: ['search_api'],
      capabilities: ['research', 'web_search', 'citations'],
      n8nWorkflow: { workflowId: 'wf-research-1' },
      enabled: true
    },
    {
      id: 'writer.general',
      version: '1.0.0',
      name: 'General Writer',
      category: 'writing',
      description: 'Generates content from provided context',
      inputSchema: {},
      outputSchema: {},
      requiredConnections: ['llm_provider'],
      capabilities: ['writing', 'summarization'],
      n8nWorkflow: { workflowId: 'wf-writer-1' },
      enabled: true
    },
    {
      id: 'assistant.telegram',
      version: '1.0.0',
      name: 'Telegram Assistant',
      category: 'assistant',
      description: 'Sends and receives messages via Telegram',
      inputSchema: {},
      outputSchema: {},
      requiredConnections: ['telegram_bot'],
      capabilities: ['assistant', 'telegram', 'memory', 'delivery'],
      n8nWorkflow: { workflowId: 'wf-telegram-1' },
      enabled: true
    },
    {
      id: 'ssma.content',
      version: '1.0.0',
      name: 'Social Media Manager',
      category: 'ssma',
      description: 'Creates and schedules social media posts',
      inputSchema: {},
      outputSchema: {},
      requiredConnections: ['linkedin', 'x'],
      capabilities: ['social_media', 'content_generation', 'approval'],
      n8nWorkflow: { workflowId: 'wf-ssma-1' },
      enabled: true
    }
  ];

  for (const wf of workflows) {
    await registry.registerWorkflow(wf);
  }
}
