export interface ExecutionResult {
  success: boolean;
  executionId?: string;
  data?: any;
  error?: string;
}

export interface N8nClient {
  executeWorkflow(workflowId: string, inputData: any, n8nCredentialIds: string[]): Promise<ExecutionResult>;
  getExecutionStatus(executionId: string): Promise<'running' | 'completed' | 'error' | 'unknown'>;
}

export interface ExecutionManager {
  run(jobId: string, workflowIds: string[], inputData: any): Promise<void>;
}
