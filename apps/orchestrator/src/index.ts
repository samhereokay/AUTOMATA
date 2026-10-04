import express from 'express';
import { db } from './database';
import { AIPlanner } from '@automata/planner';
import { OllamaProvider } from '@automata/ai-provider';
import { N8nExecutionAdapter, AutomataExecutionManager } from '@automata/n8n-client';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// ─── Dependency initialization ───────────────────────────────────────────────

const ollamaUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/v1$/, '');
const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

const aiProvider = new OllamaProvider(ollamaUrl, ollamaModel);
const planner = new AIPlanner(aiProvider);

const n8nUrl = process.env.N8N_URL || 'http://127.0.0.1:5678';
const n8nApiKey = process.env.N8N_API_KEY || '';
const n8nAdapter = new N8nExecutionAdapter(n8nUrl, n8nApiKey);

// ─── Execution step completion callback ─────────────────────────────────────

async function onStepComplete(stepId: string, success: boolean, result: any, error?: string) {
  const status = success ? 'success' : 'failed';
  await db.query(
    `UPDATE automata_execution_steps
     SET status = $1, completed_at = CURRENT_TIMESTAMP, outputs = $2, error = $3
     WHERE id = $4`,
    [status, JSON.stringify(result ?? {}), error ?? null, stepId]
  );

  // Roll up execution status when all steps are done
  const stepRes = await db.query(
    'SELECT execution_id FROM automata_execution_steps WHERE id = $1',
    [stepId]
  );
  if (stepRes.rows.length === 0) return;

  const execId = stepRes.rows[0].execution_id;
  const allSteps = await db.query(
    'SELECT status FROM automata_execution_steps WHERE execution_id = $1',
    [execId]
  );

  const anyRunning = allSteps.rows.some(
    (s: any) => s.status === 'pending' || s.status === 'running'
  );
  if (anyRunning) return;

  const anyFailed = allSteps.rows.some((s: any) => s.status === 'failed');
  const finalStatus = anyFailed ? 'failed' : 'success';

  await db.query(
    'UPDATE automata_executions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
    [finalStatus, execId]
  );
  console.log(`[Execution] ${execId} → ${finalStatus}`);
}

const executionManager = new AutomataExecutionManager(n8nAdapter, onStepComplete);

// ─── CORS ────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/health
app.get('/api/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    const ollamaOk = await aiProvider.isAvailable();
    const models = ollamaOk ? await aiProvider.getModels() : [];
    res.json({
      success: true,
      services: {
        database: 'ok',
        ollama: ollamaOk ? 'ok' : 'unreachable',
        ollama_url: ollamaUrl,
        models,
        model: ollamaModel,
        n8n_url: n8nUrl,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/modules
app.get('/api/modules', async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, description, category, status FROM automata_modules ORDER BY (dependencies->>\'priority\')::int ASC, name ASC'
    );
    res.json({ success: true, modules: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/templates
app.get('/api/templates', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.module_id, t.n8n_workflow_id,
              t.input_schema->>'name' AS name,
              t.input_schema->>'audit_status' AS audit_status,
              m.name AS module_name
       FROM automata_templates t
       JOIN automata_modules m ON m.id = t.module_id
       ORDER BY m.name, t.id`
    );
    res.json({ success: true, templates: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/automations/plan
// Accepts: { prompt: string }
// Returns: { success, plan, candidateModules, status: 'awaiting_approval' }
app.post('/api/automations/plan', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });

    // Fetch ALL modules from registry (model may need to understand what's available even if adaptation_required)
    const modResult = await db.query(
      'SELECT id, name, description, status FROM automata_modules ORDER BY (dependencies->>\'priority\')::int ASC'
    );
    const candidateModules = modResult.rows;

    // Build capability list for the planner (include status so model knows context)
    const availableCapabilities = candidateModules.map(
      (m: any) => `${m.id} [${m.status}]: ${m.name} — ${m.description}`
    );

    // Generate plan with qwen2.5:3b
    const plan = await planner.plan(prompt, availableCapabilities);

    // ── REGISTRY VALIDATION ──────────────────────────────────────────────────
    // The model's requiredCapabilities MUST reference valid registry module IDs.
    // Never allow arbitrary IDs through.
    const validModuleIds = new Set(candidateModules.map((m: any) => m.id));
    const invalidIds: string[] = [];

    for (const stepCaps of plan.requiredCapabilities) {
      for (const modId of stepCaps) {
        if (!validModuleIds.has(modId)) {
          invalidIds.push(modId);
        }
      }
    }

    if (invalidIds.length > 0) {
      return res.status(422).json({
        success: false,
        error: `Planner selected unregistered module IDs: ${invalidIds.join(', ')}`,
        plan,
      });
    }

    // Annotate plan with module statuses for the UI
    const annotatedSteps = plan.requiredCapabilities.map((stepCaps: string[]) =>
      stepCaps.map((modId: string) => {
        const mod = candidateModules.find((m: any) => m.id === modId);
        return { module_id: modId, module_name: mod?.name, status: mod?.status };
      })
    );

    res.json({
      success: true,
      plan,
      annotatedSteps,
      status: 'awaiting_approval',
    });
  } catch (error: any) {
    console.error('[Plan] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/automations/run
// Accepts: { plan, prompt }
// Executes ONLY modules whose templates exist and whose status is 'ready'
// Returns: { success, executionId, status: 'running' }
app.post('/api/automations/run', async (req, res) => {
  try {
    const { plan, prompt } = req.body;
    if (!plan || !prompt) {
      return res.status(400).json({ success: false, error: 'plan and prompt are required' });
    }

    const executionId = crypto.randomUUID();

    await db.query(
      `INSERT INTO automata_executions (id, user_request, status, execution_plan)
       VALUES ($1, $2, 'running', $3)`,
      [executionId, prompt, JSON.stringify(plan)]
    );

    const workflowIds: string[] = [];
    const stepIds: string[] = [];

    for (const stepCaps of plan.requiredCapabilities as string[][]) {
      for (const modId of stepCaps) {
        // Only execute ready templates — adaptation_required ones are tracked but skipped
        const modCheck = await db.query(
          'SELECT status FROM automata_modules WHERE id = $1',
          [modId]
        );
        if (modCheck.rows.length === 0) continue;
        const modStatus = modCheck.rows[0].status;

        // Look for a ready template for this module
        const tplResult = await db.query(
          `SELECT n8n_workflow_id FROM automata_templates
           WHERE module_id = $1 AND input_schema->>'audit_status' = 'ready'
           LIMIT 1`,
          [modId]
        );

        const stepId = crypto.randomUUID();
        const stepStatus = tplResult.rows.length > 0 ? 'pending' : 'skipped';
        const wfId = tplResult.rows[0]?.n8n_workflow_id ?? null;

        await db.query(
          `INSERT INTO automata_execution_steps
             (id, execution_id, module_id, n8n_execution_id, status, outputs)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            stepId, executionId, modId, wfId, stepStatus,
            JSON.stringify({ module_status: modStatus, skipped_reason: stepStatus === 'skipped' ? `No ready template for module ${modId}` : null }),
          ]
        );

        if (wfId && stepStatus === 'pending') {
          workflowIds.push(wfId);
          stepIds.push(stepId);
        }
      }
    }

    if (workflowIds.length === 0) {
      await db.query(
        'UPDATE automata_executions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['no_runnable_steps', executionId]
      );
      return res.json({
        success: true,
        executionId,
        status: 'no_runnable_steps',
        message: 'No ready templates found for the selected modules. All steps require adaptation.',
      });
    }

    // Fire-and-forget — execution tracked via DB callbacks
    executionManager.run(executionId, workflowIds, { prompt, executionId }, stepIds).catch(async (err: any) => {
      console.error(`[Execution] ${executionId} failed:`, err);
      await db.query(
        'UPDATE automata_executions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['failed', executionId]
      );
    });

    res.json({ success: true, executionId, status: 'running' });
  } catch (error: any) {
    console.error('[Run] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/executions
app.get('/api/executions', async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT id, user_request, status, created_at, completed_at FROM automata_executions ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ success: true, executions: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/executions/:id
app.get('/api/executions/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM automata_executions WHERE id = $1',
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Not found' });

    const steps = await db.query(
      `SELECT s.id, s.module_id, m.name AS module_name, s.n8n_execution_id,
              s.status, s.started_at, s.completed_at, s.error, s.outputs
       FROM automata_execution_steps s
       JOIN automata_modules m ON m.id = s.module_id
       WHERE s.execution_id = $1
       ORDER BY s.started_at ASC`,
      [req.params.id]
    );

    res.json({ success: true, execution: result.rows[0], steps: steps.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Automata Orchestrator running on port ${PORT}`);
  console.log(`  Ollama : ${ollamaUrl} (model: ${ollamaModel})`);
  console.log(`  n8n    : ${n8nUrl}`);
  console.log(`  DB     : ${process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@') ?? 'default'}`);
});
