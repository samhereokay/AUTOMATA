import { AIProvider } from '@automata/ai-provider';
import { ExecutionPlan, Planner } from './types';

export class AIPlanner implements Planner {
  constructor(private aiProvider: AIProvider) {}

  async plan(prompt: string, availableCapabilities: string[]): Promise<ExecutionPlan> {
    const systemPrompt = `You are the AI Planner for AUTOMATA.
Your job is to read the user's natural language request and output a structured JSON plan.
You must select which capabilities are required for the tasks to be completed.

Available capabilities:
${availableCapabilities.join(', ')}

Output exactly in this JSON format:
{
  "intent": "Short description of the user intent",
  "tasks": ["Task 1", "Task 2"],
  "requiredCapabilities": [
    ["capability1"],
    ["capability2", "capability3"]
  ]
}

Note: requiredCapabilities should represent sequential steps. If two capabilities can be run in the same step (or belong to the same workflow), group them in the same inner array.`;

    const fullPrompt = `${systemPrompt}\n\nUser Request: ${prompt}`;

    return await this.aiProvider.generateJSON<ExecutionPlan>(fullPrompt);
  }
}
