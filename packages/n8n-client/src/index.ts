import { AutomataExecutionResult, N8nClient, ExecutionManager } from './types';

export class N8nExecutionAdapter implements N8nClient {
  constructor(private baseUrl: string, private apiKey: string = '') {}

  async executeWorkflow(
    workflowId: string,
    inputData: Record<string, unknown>
  ): Promise<AutomataExecutionResult> {
    return this._tryWebhook(workflowId, inputData);
  }

  private async _tryWebhook(
    workflowId: string,
    inputData: Record<string, unknown>
  ): Promise<AutomataExecutionResult> {
    const url = `${this.baseUrl}/webhook/${workflowId}`;
    console.log(`[n8n] Webhook → ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`n8n webhook error ${response.status}: ${body.slice(0, 200)}`);
      }

      let raw = await response.json();

      if (raw && typeof raw === 'object' && (raw as any).message === 'Workflow was started' && this.apiKey) {
        console.log(`[n8n] Async execution detected for ${workflowId}. Polling...`);
        await new Promise(r => setTimeout(r, 1000));
        
        let foundFinalResult = false;
        let attempts = 0;
        
        while (attempts < 10 && !foundFinalResult) {
          const execsRes = await fetch(`${this.baseUrl}/api/v1/executions?workflowId=${workflowId}&limit=1`, {
            headers: { 'X-N8N-API-KEY': this.apiKey }
          });
          
          if (execsRes.ok) {
            const execsData = await execsRes.json();
            if (execsData.data && execsData.data.length > 0) {
              const execId = execsData.data[0].id;
              
              const detailRes = await fetch(`${this.baseUrl}/api/v1/executions/${execId}`, {
                headers: { 'X-N8N-API-KEY': this.apiKey }
              });
              
              if (detailRes.ok) {
                const execDetails = await detailRes.json();
                if (execDetails.finished || execDetails.stoppedAt) {
                  const runData = execDetails.data?.resultData?.runData;
                  if (runData) {
                    const nodeNames = Object.keys(runData);
                    if (nodeNames.length > 0) {
                      const lastNodeData = runData[nodeNames[nodeNames.length - 1]];
                      if (lastNodeData && lastNodeData[0]?.data?.main?.[0]?.[0]?.json) {
                        raw = lastNodeData[0].data.main[0][0].json;
                        foundFinalResult = true;
                        break;
                      }
                    }
                  }
                  foundFinalResult = true; 
                }
              }
            }
          }
          attempts++;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      return {
        success: true,
        n8nExecutionId: workflowId,
        data: this._normalizeOutput(raw),
      };
    } catch (err: any) {
      console.warn(`[n8n] Webhook execution failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  private _normalizeOutput(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') return { raw };

    if (Array.isArray(raw)) {
      return { items: raw, count: raw.length };
    }

    const asObj = raw as Record<string, unknown>;
    if (asObj.data && typeof asObj.data === 'object') {
      const d = asObj.data as Record<string, unknown>;
      if (d.resultData) return { output: d.resultData };
      return { output: d };
    }

    return { output: asObj };
  }

  async getWorkflowStatus(workflowId: string): Promise<'active' | 'inactive' | 'unknown'> {
    if (!this.apiKey) return 'unknown';
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        headers: { 'X-N8N-API-KEY': this.apiKey },
      });
      if (!response.ok) return 'unknown';
      const data = await response.json();
      return data.active ? 'active' : 'inactive';
    } catch {
      return 'unknown';
    }
  }
}

export class AutomataExecutionManager implements ExecutionManager {
  constructor(
    private n8nClient: N8nClient,
    private onStepComplete?: (
      stepId: string,
      success: boolean,
      result: Record<string, unknown> | undefined,
      error?: string
    ) => Promise<void>
  ) {}

  async run(
    jobId: string,
    workflowIds: string[],
    inputData: Record<string, unknown>,
    stepIds?: string[]
  ): Promise<void> {
    for (let i = 0; i < workflowIds.length; i++) {
      const wfId = workflowIds[i];
      const stepId = stepIds?.[i];

      console.log(`[ExecutionManager] job=${jobId} step=${i + 1}/${workflowIds.length} wf=${wfId}`);

      const result = await (this.n8nClient as any).executeWorkflow(wfId, { ...inputData, jobId });

      if (this.onStepComplete && stepId) {
        await this.onStepComplete(stepId, result.success, result.data, result.error);
      }

      if (!result.success) {
        throw new Error(`Step ${i + 1} (workflow ${wfId}) failed: ${result.error}`);
      }
    }
  }
}

export * from './types';
