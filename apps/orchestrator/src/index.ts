import express from 'express';
import { OllamaProvider } from '@automata/ai-provider';
import { AIPlanner, PlanValidator } from '@automata/planner';
import { LocalWorkflowRegistry } from '@automata/workflow-registry';
import { seedWorkflows } from '@automata/workflow-registry/dist/seed';
import { LocalConnectionManager } from '@automata/connections';
import { N8nRestAPIClient, AutomataExecutionManager } from '@automata/n8n-client';

const app = express();
app.use(express.json());

// Initialize core services
const aiProvider = new OllamaProvider('http://localhost:11434');
const registry = new LocalWorkflowRegistry();
const planner = new AIPlanner(aiProvider);
const planValidator = new PlanValidator(registry);
const connectionManager = new LocalConnectionManager();
const n8nClient = new N8nRestAPIClient('http://localhost:5678/api/v1', 'mock_api_key');
const executionManager = new AutomataExecutionManager(n8nClient);

// Seed the workflows
seedWorkflows(registry).catch(console.error);

app.post('/api/prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // 1. Get available capabilities from registry
    const workflows = await registry.listWorkflows();
    const availableCapabilities = Array.from(new Set(workflows.flatMap(w => w.capabilities)));
    
    // 2. Plan
    const plan = await planner.plan(prompt, availableCapabilities);
    
    // 3. Validate Plan
    await planValidator.validate(plan);
    
    // In Phase 1, we return the plan for user approval.
    res.json({
      success: true,
      plan,
      status: 'awaiting_approval'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/execute', async (req, res) => {
  try {
    const { plan, inputData } = req.body;
    
    // Extract workflow IDs matching the plan's capabilities
    const workflowIdsToExecute: string[] = [];
    for (const stepCaps of plan.requiredCapabilities) {
       const matchingWorkflows = await registry.findWorkflowsByCapabilities(stepCaps);
       if (matchingWorkflows.length > 0) {
         workflowIdsToExecute.push(matchingWorkflows[0].id);
       } else {
         throw new Error(`Could not resolve workflow for capabilities: ${stepCaps.join(', ')}`);
       }
    }
    
    const jobId = crypto.randomUUID();
    
    // 4. Execution Manager triggers n8n
    // Fire and forget, execution manager handles it asynchronously
    executionManager.run(jobId, workflowIdsToExecute, inputData).catch(err => {
      console.error(`Job ${jobId} failed:`, err);
    });
    
    res.json({
      success: true,
      jobId,
      status: 'queued'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Automata Orchestrator running on port ${PORT}`);
});
