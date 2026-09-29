export interface WorkflowDefinition {
  id: string;
  version: string;
  name: string;
  category: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  requiredConnections: string[];
  capabilities: string[];
  n8nWorkflow: {
    workflowId: string;
  };
  enabled: boolean;
}

export interface WorkflowRegistry {
  getWorkflow(id: string): Promise<WorkflowDefinition | undefined>;
  listWorkflows(): Promise<WorkflowDefinition[]>;
  findWorkflowsByCapabilities(capabilities: string[]): Promise<WorkflowDefinition[]>;
  registerWorkflow(workflow: WorkflowDefinition): Promise<void>;
}
