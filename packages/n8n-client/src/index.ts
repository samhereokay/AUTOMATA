import { ExecutionResult, N8nClient, ExecutionManager } from './types';

export class N8nRestAPIClient implements N8nClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async executeWorkflow(workflowId: string, inputData: any, n8nCredentialIds: string[]): Promise<ExecutionResult> {
    try {
      // Map workflow ID to the webhook path
      const pathMap: Record<string, string> = {
        'research.web': 'automata-research',
        'writer.general': 'automata-writer',
        'assistant.telegram': 'automata-telegram',
        'ssma.content': 'automata-ssma'
      };
      const path = pathMap[workflowId] || workflowId;

      console.log(`Executing real n8n webhook: ${this.baseUrl}/webhook/${path}`);
      const response = await fetch(`${this.baseUrl}/webhook/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData)
      });

      if (!response.ok) {
        throw new Error(`n8n HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        executionId: crypto.randomUUID(),
        data: data
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getExecutionStatus(executionId: string): Promise<'running' | 'completed' | 'error' | 'unknown'> {
    return 'completed';
  }
}

export class AutomataExecutionManager implements ExecutionManager {
  constructor(private n8nClient: N8nClient) {}

  async run(jobId: string, workflowIds: string[], inputData: any): Promise<void> {
    // Sequentially or orchestrate execution of workflowIds
    for (const wfId of workflowIds) {
      // Pass the job id in the input data
      const result = await this.n8nClient.executeWorkflow(wfId, { ...inputData, jobId }, []);
      if (!result.success) {
        throw new Error(`Execution failed for workflow ${wfId}`);
      }
    }
  }
}

export * from './types';
