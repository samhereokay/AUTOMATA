/**
 * N8nExecutionAdapter
 *
 * Centralizes all communication with n8n behind a stable interface.
 * Internal n8n schemas (execution_entity, etc.) are NOT exposed — only the
 * normalized AutomataExecutionResult is returned.
 *
 * Strategy for triggering workflows:
 *   1. Try the n8n REST API execution endpoint (requires API key + workflow active or test-mode)
 *   2. Fall back to webhook-test if the API key is unavailable
 *
 * n8n REST API ref: https://docs.n8n.io/api/api-reference/
 */

export interface AutomataExecutionResult {
  success: boolean;
  /** Normalized output data from n8n — never the raw execution_entity */
  data?: Record<string, unknown>;
  /** Human-readable error message */
  error?: string;
  /** n8n execution ID for audit purposes */
  n8nExecutionId?: string;
}

export interface N8nClient {
  executeWorkflow(workflowId: string, inputData: Record<string, unknown>): Promise<AutomataExecutionResult>;
}

export interface ExecutionManager {
  run(
    jobId: string,
    workflowIds: string[],
    inputData: Record<string, unknown>,
    stepIds?: string[]
  ): Promise<void>;
}
