export interface ExecutionPlan {
  intent: string;
  tasks: string[];
  requiredCapabilities: string[][]; // Array of capability arrays representing steps
}

export interface Planner {
  plan(prompt: string, availableCapabilities: string[]): Promise<ExecutionPlan>;
}
