"use strict";
import test from 'node:test';
import assert from 'node:assert';
import { PipelineOrchestrator } from '../src/PipelineOrchestrator';
import { Planner, ExecutionPlan } from '../src/planner/Planner';
import { ProviderRouter } from '../src/router/ProviderRouter';
import { MemoryRouter } from '../src/router/MemoryRouter';
import { StorageRouter } from '../src/router/StorageRouter';
import { ExecutionTracker } from '../src/ExecutionTracker';

test('PipelineOrchestrator', async (t) => {

  const mockProvider = {
    metadata: { id: 'core-news-pipeline', name: 'Mock' },
    run: async () => ({ collected: 1 })
  } as any;

  const mockPlanner = {
    createPlan: async () => ({
      intent: 'test',
      capabilities: ['test'],
      memory: { required: false },
      storage: { required: false },
      privacy: { cloud_allowed: false },
      verificationRequirements: []
    })
  } as unknown as Planner;

  const mockProviderRouter = {
    route: async () => mockProvider
  } as unknown as ProviderRouter;

  const mockMemoryRouter = {
    route: async () => {}
  } as unknown as MemoryRouter;

  const mockStorageRouter = {
    route: async () => ({})
  } as unknown as StorageRouter;

  const mockExecutionTracker = {
    planExecution: async () => 'exec_123',
    startExecution: async () => {},
    completeExecution: async () => {},
    failExecution: async () => {}
  } as unknown as ExecutionTracker;

  await t.test('✔ Runs pipeline successfully', async () => {
    const orchestrator = new PipelineOrchestrator(
      mockPlanner, mockProviderRouter, mockMemoryRouter, mockStorageRouter, mockExecutionTracker
    );
    assert.strictEqual(orchestrator.isCurrentlyRunning, false);

    const promise = orchestrator.executePrompt('test');
    assert.strictEqual(orchestrator.isCurrentlyRunning, true);
    
    const res = await promise;
    assert.strictEqual(orchestrator.isCurrentlyRunning, false);
    assert.ok(res);
  });

  await t.test('✔ Prevents overlapping runs', async () => {
    let resolveRun: (v: any) => void = () => {};
    
    const slowProviderRouter = {
      route: async () => {
         return {
           metadata: { id: 'core-news-pipeline', name: 'Slow' },
           run: async () => new Promise(res => { resolveRun = res; })
         };
      }
    } as unknown as ProviderRouter;

    const orchestrator = new PipelineOrchestrator(
      mockPlanner, slowProviderRouter, mockMemoryRouter, mockStorageRouter, mockExecutionTracker
    );

    const p1 = orchestrator.executePrompt('test');
    
    // Ensure the event loop runs and p1 reaches the slow provider
    await new Promise(r => setTimeout(r, 10));

    // Attempt second run while first is blocked
    const res2 = await orchestrator.executePrompt('test');
    assert.strictEqual(res2, null);

    resolveRun!({ collected: 1 });
    await p1;
  });
});
