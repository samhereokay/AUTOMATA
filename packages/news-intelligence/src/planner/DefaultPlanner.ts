import { Planner, ExecutionPlan } from './Planner';
import { LocalAIProvider } from '../LocalAIProvider';
import { logger } from '../logger';
import { randomBytes } from 'crypto';

export class DefaultPlanner implements Planner {
  constructor(private aiProvider: LocalAIProvider) {}

  public async createPlan(prompt: string): Promise<ExecutionPlan> {
    logger.info('Planning execution', { prompt });
    
    const systemPrompt = `You are the Automation OS Planner.
Your job is to convert the user's natural language request into a structured JSON ExecutionPlan.
Return ONLY valid JSON, with no markdown formatting or extra text.

Required JSON structure:
{
  "intent": "String describing the goal",
  "capabilities": ["List", "of", "required", "Capability", "strings"],
  "memory": {
    "required": boolean,
    "scopes": ["List", "of", "scopes", "e.g., GLOBAL_USER, PROJECT"]
  },
  "storage": {
    "required": boolean,
    "type": "String describing storage type"
  },
  "privacy": {
    "cloud_allowed": boolean
  },
  "verificationRequirements": ["List", "of", "verification", "steps"]
}

Capabilities might include: 'news-search', 'summarization', 'web-scrape', 'notification', 'news-intelligence'.
If they ask for local saving, set cloud_allowed to false and storage required true.
If they ask for Telegram, add 'notification' to capabilities.`;

    const result = await this.aiProvider.executePrompt([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]);

    let parsed: ExecutionPlan;
    try {
      // Clean potential markdown blocks
      const jsonText = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const raw = JSON.parse(jsonText);

      parsed = {
        intent: raw.intent || 'Unknown intent',
        capabilities: Array.isArray(raw.capabilities) ? raw.capabilities : [],
        memory: {
          required: !!raw.memory?.required,
          scopes: Array.isArray(raw.memory?.scopes) ? raw.memory.scopes : []
        },
        storage: {
          required: !!raw.storage?.required,
          type: raw.storage?.type || 'document'
        },
        privacy: {
          cloud_allowed: !!raw.privacy?.cloud_allowed
        },
        verificationRequirements: Array.isArray(raw.verificationRequirements) ? raw.verificationRequirements : []
      };
    } catch (error) {
      logger.error('Failed to parse planner output, falling back', { error, result });
      
      // Safe fallback plan
      parsed = {
        intent: prompt,
        capabilities: ['news-intelligence'], // Fallback assumption based on vertical slice
        memory: { required: false, scopes: [] },
        storage: { required: false, type: 'document' },
        privacy: { cloud_allowed: false },
        verificationRequirements: []
      };
    }

    return parsed;
  }
}
