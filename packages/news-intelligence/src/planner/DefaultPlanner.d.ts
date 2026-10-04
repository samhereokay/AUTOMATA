import { Planner, ExecutionPlan } from './Planner';
import { LocalAIProvider } from '../LocalAIProvider';
export declare class DefaultPlanner implements Planner {
    private aiProvider;
    constructor(aiProvider: LocalAIProvider);
    createPlan(prompt: string): Promise<ExecutionPlan>;
}
//# sourceMappingURL=DefaultPlanner.d.ts.map