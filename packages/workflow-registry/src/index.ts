import { WorkflowDefinition, WorkflowRegistry } from './types';

export class LocalWorkflowRegistry implements WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  async getWorkflow(id: string): Promise<WorkflowDefinition | undefined> {
    return this.workflows.get(id);
  }

  async listWorkflows(): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values());
  }

  async findWorkflowsByCapabilities(capabilities: string[]): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values()).filter(workflow => 
      capabilities.every(cap => workflow.capabilities.includes(cap))
    );
  }

  async registerWorkflow(workflow: WorkflowDefinition): Promise<void> {
    this.workflows.set(workflow.id, workflow);
  }
}

export * from './types';
