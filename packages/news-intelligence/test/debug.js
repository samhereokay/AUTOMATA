"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const ExecutionTracker_1 = require("../src/ExecutionTracker");
const TEST_DB = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
async function run() {
    console.log("DB URL:", TEST_DB);
    const tracker = new ExecutionTracker_1.ExecutionTracker(TEST_DB);
    const pool = new pg_1.Pool({ connectionString: TEST_DB });
    // cleanup
    await pool.query("DELETE FROM executions WHERE module = 'test-module-debug'");
    const id = await tracker.planExecution('test-module-debug', { key: 'value' });
    console.log('Planned ID:', id);
    const res = await pool.query('SELECT * FROM executions WHERE id = $1', [id]);
    console.log('Raw DB Row:', res.rows[0]);
    let exec = await tracker.getExecution(id);
    console.log('Fetched Exec before start:', exec);
    await tracker.startExecution(id);
    const res2 = await pool.query('SELECT * FROM executions WHERE id = $1', [id]);
    console.log('Raw DB Row after start:', res2.rows[0]);
    exec = await tracker.getExecution(id);
    console.log('Fetched Exec after start:', exec);
    await tracker.close();
    await pool.end();
}
run().catch(console.error);
//# sourceMappingURL=debug.js.map