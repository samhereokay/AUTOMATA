import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { ExecutionTracker } from '../src/ExecutionTracker';

const TEST_DB = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

if (!TEST_DB) {
  console.warn('Skipping ExecutionTracker tests: no DATABASE_URL set');
  process.exit(0);
}

describe('ExecutionTracker', () => {
  let tracker: ExecutionTracker;
  let pool: Pool;

  beforeEach(async () => {
    tracker = new ExecutionTracker(TEST_DB!);
    pool = new Pool({ connectionString: TEST_DB });
  });

  afterEach(async () => {
    await tracker.close();
    await pool.end();
  });

  it('generates collision-safe execution IDs in exec_ format', async () => {
    const id = await tracker.planExecution('test-module-1', {});
    assert.match(id, /^exec_[a-z0-9]+_[a-f0-9]{8}$/);
  });

  it('creates execution with planned status, then transitions to running', async () => {
    const id = await tracker.planExecution('test-module-2', { key: 'value' });
    let exec = await tracker.getExecution(id);
    assert.ok(exec);
    assert.equal(exec!.module, 'test-module-2');
    assert.equal(exec!.status, 'planned');
    
    await tracker.startExecution(id);
    exec = await tracker.getExecution(id);
    assert.equal(exec!.status, 'running');
    assert.ok(exec!.startedAt);
    assert.equal(exec!.completedAt, undefined);
  });

  it('completeExecution sets success status and verification', async () => {
    const id = await tracker.planExecution('test-module', {});
    await tracker.startExecution(id);
    const verification = {
      passed: true,
      checks: [{ name: 'test_check', status: 'pass' as const, detail: 'all good' }],
      passCount: 1, failCount: 0, skipCount: 0
    };
    await tracker.completeExecution(id, { items_persisted: 5 }, verification, []);

    const exec = await tracker.getExecution(id);
    assert.ok(exec);
    assert.equal(exec!.status, 'success');
    assert.ok(exec!.completedAt);
    assert.deepEqual(exec!.verification, verification);
  });

  it('completeExecution sets partial status when failCount > 0', async () => {
    const id = await tracker.planExecution('test-module', {});
    await tracker.startExecution(id);
    const verification = {
      passed: false,
      checks: [
        { name: 'check_a', status: 'pass' as const },
        { name: 'check_b', status: 'fail' as const, detail: 'something failed' }
      ],
      passCount: 1, failCount: 1, skipCount: 0
    };
    await tracker.completeExecution(id, {}, verification, []);

    const exec = await tracker.getExecution(id);
    assert.equal(exec!.status, 'verification_failed');
  });

  it('failExecution sets failure status with error', async () => {
    const id = await tracker.planExecution('test-module', {});
    await tracker.startExecution(id);
    await tracker.failExecution(id, 'Something went wrong');

    const exec = await tracker.getExecution(id);
    assert.ok(exec);
    assert.equal(exec!.status, 'failure');
    assert.equal(exec!.error, 'Something went wrong');
    assert.ok(exec!.completedAt);
  });

  it('getExecution returns null for unknown ID', async () => {
    const result = await tracker.getExecution('exec_notexist_00000000');
    assert.equal(result, null);
  });

  it('listExecutions returns executions in reverse chronological order', async () => {
    const id1 = await tracker.planExecution('test-module', {});
    const id2 = await tracker.planExecution('test-module', {});

    const list = await tracker.listExecutions({ module: 'test-module' });
    assert.ok(list.length >= 2);
    const idx1 = list.findIndex(e => e.id === id1);
    const idx2 = list.findIndex(e => e.id === id2);
    assert.ok(idx2 < idx1, 'Second (newer) execution should come before first');
  });

  it('listExecutions filters by module', async () => {
    const id = await tracker.planExecution('test-module', {});

    const list = await tracker.listExecutions({ module: 'test-module' });
    assert.ok(list.some(e => e.id === id));

    const otherList = await tracker.listExecutions({ module: 'other-module' });
    assert.ok(!otherList.some(e => e.id === id));
  });

  it('listExecutions filters by status', async () => {
    const id = await tracker.planExecution('test-module', {});
    await tracker.startExecution(id);

    const runningList = await tracker.listExecutions({ module: 'test-module', status: 'running' });
    assert.ok(runningList.some(e => e.id === id));

    const successList = await tracker.listExecutions({ module: 'test-module', status: 'success' });
    assert.ok(!successList.some(e => e.id === id));
  });

  it('listExecutions respects limit and offset', async () => {
    await pool.query("DELETE FROM executions WHERE module = 'test-module-page'");
    await tracker.planExecution('test-module-page', {});
    await tracker.planExecution('test-module-page', {});
    await tracker.planExecution('test-module-page', {});

    const page1 = await tracker.listExecutions({ module: 'test-module-page', limit: 2, offset: 0 });
    const page2 = await tracker.listExecutions({ module: 'test-module-page', limit: 2, offset: 2 });

    assert.equal(page1.length, 2);
    assert.ok(page2.length >= 1);

    const ids1 = new Set(page1.map(e => e.id));
    const ids2 = new Set(page2.map(e => e.id));
    const intersection = [...ids1].filter(id => ids2.has(id));
    assert.equal(intersection.length, 0);
  });

  it('stores and retrieves notifications', async () => {
    const id = await tracker.planExecution('test-module', {});
    await tracker.startExecution(id);
    const notifications = [
      { channel: 'telegram', status: 'skipped' as const, detail: 'not configured', count: 0 }
    ];
    await tracker.completeExecution(
      id,
      {},
      { passed: true, checks: [], passCount: 0, failCount: 0, skipCount: 0 },
      notifications
    );

    const exec = await tracker.getExecution(id);
    assert.deepEqual(exec!.notifications, notifications);
  });

  it('generates different IDs for rapid concurrent calls', async () => {
    const ids = await Promise.all([
      tracker.planExecution('test-module', {}),
      tracker.planExecution('test-module', {}),
      tracker.planExecution('test-module', {}),
      tracker.planExecution('test-module', {}),
      tracker.planExecution('test-module', {})
    ]);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 5, 'All IDs must be unique');
  });
});
