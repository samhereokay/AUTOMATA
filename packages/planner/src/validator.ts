import { ExecutionPlan } from './types';
import { WorkflowRegistry } from '@automata/workflow-registry';

export class PlanValidator {
  constructor(private registry: WorkflowRegistry) {}

  async validate(plan: ExecutionPlan): Promise<boolean> {
    const allWorkflows = await this.registry.listWorkflows();
    
    // Flatten capabilities required by the plan
    const requiredCaps = new Set<string>();
    plan.requiredCapabilities.forEach(stepCaps => {
      stepCaps.forEach(cap => requiredCaps.add(cap));
    });

    // Check if every capability is satisfied by at least one workflow
    for (const reqCap of requiredCaps) {
      let isSatisfied = false;
      for (const wf of allWorkflows) {
        if (!wf.enabled) continue;
        if (wf.capabilities.includes(reqCap)) {
          isSatisfied = true;
          break;
        }
      }
      if (!isSatisfied) {
        throw new Error(`Validation failed: Required capability '${reqCap}' is not provided by any enabled workflow.`);
      }
    }
    
    // Further validation could include connection verification
    // but the backend connection manager would handle that.
    
    return true;
  }
}
