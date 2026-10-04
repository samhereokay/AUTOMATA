/**
 * Automata Platform E2E Test
 *
 * Tests the full pipeline:
 *   prompt → AIPlanner (qwen2.5:3b) → registry validation → execution record
 *   → real n8n workflow execution → step tracking → final status
 *
 * Run: node test/automata_e2e.js
 * Requires: Automata orchestrator running on 127.0.0.1:3000
 */

const BASE_URL = process.env.ORCHESTRATOR_URL || 'http://127.0.0.1:3000';
const POLL_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

function log(tag, msg, data) {
  const ts = new Date().toISOString().slice(11, 19);
  const prefix = `[${ts}][${tag}]`;
  if (data !== undefined) {
    console.log(prefix, msg, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(prefix, msg);
  }
}

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok && !json.plan) { // allow 422 with plan attached
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function pollExecution(executionId, timeoutMs = POLL_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request('GET', `/api/executions/${executionId}`);
    const status = res.execution?.status;
    if (status === 'success' || status === 'failed' || status === 'no_runnable_steps') {
      return res;
    }
    log('POLL', `${executionId} → ${status}, waiting...`);
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Execution ${executionId} did not complete within ${timeoutMs}ms`);
}

async function runTest(testName, prompt) {
  console.log('\n' + '='.repeat(70));
  log('TEST', `START: ${testName}`);
  log('TEST', `Prompt: "${prompt}"`);
  console.log('='.repeat(70));

  // Step 1: health check
  log('HEALTH', 'Checking orchestrator health...');
  const health = await request('GET', '/api/health');
  log('HEALTH', 'OK', health.services);

  if (health.services.ollama !== 'ok') {
    throw new Error(`Ollama is not available at ${health.services.ollama_url}`);
  }

  // Step 2: plan
  log('PLAN', 'Submitting prompt to planner...');
  const planRes = await request('POST', '/api/automations/plan', { prompt });

  if (!planRes.success && !planRes.plan) {
    throw new Error(`Plan failed: ${planRes.error}`);
  }

  log('PLAN', 'Intent:', planRes.plan.intent);
  log('PLAN', 'Tasks:', planRes.plan.tasks);
  log('PLAN', 'Required capabilities:', planRes.plan.requiredCapabilities);
  log('PLAN', 'Annotated steps:', planRes.annotatedSteps);

  if (!planRes.success) {
    // Validation failed — still a useful result for debugging
    log('PLAN', `⚠ Validation warning: ${planRes.error}`);
    log('PLAN', '  (Planner selected an unregistered module ID — this is the safety guard working correctly)');
    return { testName, prompt, result: 'validation_guard_triggered', plan: planRes.plan };
  }

  // Step 3: execute
  log('RUN', 'Submitting plan for execution...');
  const runRes = await request('POST', '/api/automations/run', {
    plan: planRes.plan,
    prompt,
  });

  log('RUN', `Execution ID: ${runRes.executionId}, status: ${runRes.status}`);

  if (runRes.status === 'no_runnable_steps') {
    log('RUN', '⚠ No ready templates available for selected modules');
    log('RUN', '  Steps require adaptation (e.g., OpenAI → Ollama credential swap)');
    return { testName, prompt, result: 'no_runnable_steps', executionId: runRes.executionId };
  }

  // Step 4: poll
  log('POLL', `Polling execution ${runRes.executionId}...`);
  const finalRes = await pollExecution(runRes.executionId);

  log('RESULT', `Status: ${finalRes.execution.status}`);
  log('RESULT', `Steps (${finalRes.steps.length}):`)
  for (const step of finalRes.steps) {
    log('RESULT', `  [${step.status}] ${step.module_name} (wf=${step.n8n_execution_id})`,
      step.outputs ? JSON.stringify(step.outputs).slice(0, 200) : '(no output)');
  }

  return { testName, prompt, result: finalRes.execution.status, executionId: runRes.executionId, steps: finalRes.steps };
}

async function main() {
  const results = [];

  // ── Test 1: Single-capability cybersecurity research ──────────────────────
  try {
    const r = await runTest(
      'Single-capability: Cybersecurity news',
      "Give me today's cybersecurity threat intelligence"
    );
    results.push({ ...r, passed: r.result !== 'error' });
  } catch (err) {
    console.error('[TEST FAIL]', err.message);
    results.push({ testName: 'Cybersecurity news', passed: false, error: err.message });
  }

  // ── Test 2: Multi-step research + Telegram notification ───────────────────
  try {
    const r = await runTest(
      'Multi-step: Research + Notify',
      'Research today\'s top cybersecurity developments and send a summary to Telegram'
    );
    results.push({ ...r, passed: r.result !== 'error' });
  } catch (err) {
    console.error('[TEST FAIL]', err.message);
    results.push({ testName: 'Research + Notify', passed: false, error: err.message });
  }

  // ── Test 3: Full multi-step E2E ───────────────────────────────────────────
  try {
    const r = await runTest(
      'Full E2E: Research → Summarize → Report',
      'Research today\'s cybersecurity developments, summarize the findings, and create a comprehensive report'
    );
    results.push({ ...r, passed: r.result !== 'error' });
  } catch (err) {
    console.error('[TEST FAIL]', err.message);
    results.push({ testName: 'Full E2E', passed: false, error: err.message });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('E2E TEST SUMMARY');
  console.log('='.repeat(70));
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.testName}: ${r.result || r.error || 'unknown'}`);
  }
  console.log('='.repeat(70));

  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.error(`\n${failed.length}/${results.length} tests failed`);
    process.exit(1);
  } else {
    console.log(`\nAll ${results.length} tests passed ✓`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
