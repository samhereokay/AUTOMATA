"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const pg_1 = require("pg");
const ExecutionTracker_1 = require("../src/ExecutionTracker");
const TEST_DB = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!TEST_DB) {
    console.warn('Skipping ExecutionTracker tests: no DATABASE_URL set');
    process.exit(0);
}
(0, node_test_1.describe)('ExecutionTracker', () => {
    let tracker;
    let pool;
    (0, node_test_1.beforeEach)(async () => {
        tracker = new ExecutionTracker_1.ExecutionTracker(TEST_DB);
        pool = new pg_1.Pool({ connectionString: TEST_DB });
    });
    (0, node_test_1.afterEach)(async () => {
        await tracker.close();
        await pool.end();
    });
    (0, node_test_1.it)('generates collision-safe execution IDs in exec_ format', async () => {
        const id = await tracker.planExecution('test-module-1', {});
        strict_1.default.match(id, /^exec_[a-z0-9]+_[a-f0-9]{8}$/);
    });
    (0, node_test_1.it)('creates execution with planned status, then transitions to running', async () => {
        const id = await tracker.planExecution('test-module-2', { key: 'value' });
        let exec = await tracker.getExecution(id);
        strict_1.default.ok(exec);
        strict_1.default.equal(exec.module, 'test-module-2');
        strict_1.default.equal(exec.status, 'planned');
        await tracker.startExecution(id);
        exec = await tracker.getExecution(id);
        strict_1.default.equal(exec.status, 'running');
        strict_1.default.ok(exec.startedAt);
        strict_1.default.equal(exec.completedAt, undefined);
    });
    (0, node_test_1.it)('completeExecution sets success status and verification', async () => {
        const id = await tracker.planExecution('test-module', {});
        await tracker.startExecution(id);
        const verification = {
            passed: true,
            checks: [{ name: 'test_check', status: 'pass', detail: 'all good' }],
            passCount: 1, failCount: 0, skipCount: 0
        };
        await tracker.completeExecution(id, { items_persisted: 5 }, verification, []);
        const exec = await tracker.getExecution(id);
        strict_1.default.ok(exec);
        strict_1.default.equal(exec.status, 'success');
        strict_1.default.ok(exec.completedAt);
        strict_1.default.deepEqual(exec.verification, verification);
    });
    (0, node_test_1.it)('completeExecution sets partial status when failCount > 0', async () => {
        const id = await tracker.planExecution('test-module', {});
        await tracker.startExecution(id);
        const verification = {
            passed: false,
            checks: [
                { name: 'check_a', status: 'pass' },
                { name: 'check_b', status: 'fail', detail: 'something failed' }
            ],
            passCount: 1, failCount: 1, skipCount: 0
        };
        await tracker.completeExecution(id, {}, verification, []);
        const exec = await tracker.getExecution(id);
        strict_1.default.equal(exec.status, 'verification_failed');
    });
    (0, node_test_1.it)('failExecution sets failure status with error', async () => {
        const id = await tracker.planExecution('test-module', {});
        await tracker.startExecution(id);
        await tracker.failExecution(id, 'Something went wrong');
        const exec = await tracker.getExecution(id);
        strict_1.default.ok(exec);
        strict_1.default.equal(exec.status, 'failure');
        strict_1.default.equal(exec.error, 'Something went wrong');
        strict_1.default.ok(exec.completedAt);
    });
    (0, node_test_1.it)('getExecution returns null for unknown ID', async () => {
        const result = await tracker.getExecution('exec_notexist_00000000');
        strict_1.default.equal(result, null);
    });
    (0, node_test_1.it)('listExecutions returns executions in reverse chronological order', async () => {
        const id1 = await tracker.planExecution('test-module', {});
        const id2 = await tracker.planExecution('test-module', {});
        const list = await tracker.listExecutions({ module: 'test-module' });
        strict_1.default.ok(list.length >= 2);
        const idx1 = list.findIndex(e => e.id === id1);
        const idx2 = list.findIndex(e => e.id === id2);
        strict_1.default.ok(idx2 < idx1, 'Second (newer) execution should come before first');
    });
    (0, node_test_1.it)('listExecutions filters by module', async () => {
        const id = await tracker.planExecution('test-module', {});
        const list = await tracker.listExecutions({ module: 'test-module' });
        strict_1.default.ok(list.some(e => e.id === id));
        const otherList = await tracker.listExecutions({ module: 'other-module' });
        strict_1.default.ok(!otherList.some(e => e.id === id));
    });
    (0, node_test_1.it)('listExecutions filters by status', async () => {
        const id = await tracker.planExecution('test-module', {});
        await tracker.startExecution(id);
        const runningList = await tracker.listExecutions({ module: 'test-module', status: 'running' });
        strict_1.default.ok(runningList.some(e => e.id === id));
        const successList = await tracker.listExecutions({ module: 'test-module', status: 'success' });
        strict_1.default.ok(!successList.some(e => e.id === id));
    });
    (0, node_test_1.it)('listExecutions respects limit and offset', async () => {
        await pool.query("DELETE FROM executions WHERE module = 'test-module-page'");
        await tracker.planExecution('test-module-page', {});
        await tracker.planExecution('test-module-page', {});
        await tracker.planExecution('test-module-page', {});
        const page1 = await tracker.listExecutions({ module: 'test-module-page', limit: 2, offset: 0 });
        const page2 = await tracker.listExecutions({ module: 'test-module-page', limit: 2, offset: 2 });
        strict_1.default.equal(page1.length, 2);
        strict_1.default.ok(page2.length >= 1);
        const ids1 = new Set(page1.map(e => e.id));
        const ids2 = new Set(page2.map(e => e.id));
        const intersection = [...ids1].filter(id => ids2.has(id));
        strict_1.default.equal(intersection.length, 0);
    });
    (0, node_test_1.it)('stores and retrieves notifications', async () => {
        const id = await tracker.planExecution('test-module', {});
        await tracker.startExecution(id);
        const notifications = [
            { channel: 'telegram', status: 'skipped', detail: 'not configured', count: 0 }
        ];
        await tracker.completeExecution(id, {}, { passed: true, checks: [], passCount: 0, failCount: 0, skipCount: 0 }, notifications);
        const exec = await tracker.getExecution(id);
        strict_1.default.deepEqual(exec.notifications, notifications);
    });
    (0, node_test_1.it)('generates different IDs for rapid concurrent calls', async () => {
        const ids = await Promise.all([
            tracker.planExecution('test-module', {}),
            tracker.planExecution('test-module', {}),
            tracker.planExecution('test-module', {}),
            tracker.planExecution('test-module', {}),
            tracker.planExecution('test-module', {})
        ]);
        const uniqueIds = new Set(ids);
        strict_1.default.equal(uniqueIds.size, 5, 'All IDs must be unique');
    });
});
//# sourceMappingURL=ExecutionTracker.test.js.map