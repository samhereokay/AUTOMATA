"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionTracker = void 0;
const pg_1 = require("pg");
const crypto_1 = require("crypto");
const logger_1 = require("./logger");
/**
 * Generates a collision-safe execution ID.
 * Format: exec_<timestamp_ms_base36>_<random_hex8>
 * Example: exec_lq4x7k8_a3f2b1c9
 */
function generateExecutionId() {
    const ts = Date.now().toString(36);
    const rand = (0, crypto_1.randomBytes)(4).toString('hex');
    return `exec_${ts}_${rand}`;
}
/**
 * Tracks the lifecycle of every Automation OS pipeline execution.
 * Persists to the `executions` table via the existing PostgreSQL pool.
 */
class ExecutionTracker {
    pool;
    constructor(connectionString) {
        this.pool = new pg_1.Pool({ connectionString });
    }
    async close() {
        await this.pool.end();
    }
    /**
     * Create a new execution record and return its ID.
     * Status starts as 'pending'.
     */
    async planExecution(module, input) {
        const id = generateExecutionId();
        const startedAt = new Date().toISOString();
        await this.pool.query(`INSERT INTO executions (id, module, status, started_at, input)
       VALUES ($1, $2, 'planned', $3, $4)`, [id, module, startedAt, input ? JSON.stringify(input) : null]);
        logger_1.logger.info('Execution planned', {
            component: 'execution-tracker',
            event: 'execution.planned',
            executionId: id,
            module
        });
        return id;
    }
    /**
     * Transition a planned execution to running.
     */
    async startExecution(id) {
        await this.pool.query(`UPDATE executions SET status = 'running' WHERE id = $1`, [id]);
        logger_1.logger.info('Execution started', {
            component: 'execution-tracker',
            event: 'execution.started',
            executionId: id
        });
    }
    /**
     * Mark an execution as successfully completed.
     */
    async completeExecution(id, result, verification, notifications) {
        const completedAt = new Date().toISOString();
        // Determine status from verification
        const status = verification.failCount > 0 ? 'verification_failed' : 'success';
        await this.pool.query(`UPDATE executions
       SET status = $1,
           completed_at = $2,
           result = $3,
           verification = $4,
           notifications = $5
       WHERE id = $6`, [
            status,
            completedAt,
            JSON.stringify(result),
            JSON.stringify(verification),
            JSON.stringify(notifications),
            id
        ]);
        logger_1.logger.info('Execution completed', {
            component: 'execution-tracker',
            event: 'execution.completed',
            executionId: id,
            status,
            passCount: verification.passCount,
            failCount: verification.failCount,
            skipCount: verification.skipCount
        });
    }
    /**
     * Mark an execution as failed with an error message.
     */
    async failExecution(id, error) {
        const completedAt = new Date().toISOString();
        await this.pool.query(`UPDATE executions
       SET status = 'failure',
           completed_at = $1,
           error = $2
       WHERE id = $3`, [completedAt, error, id]);
        logger_1.logger.error('Execution failed', {
            component: 'execution-tracker',
            event: 'execution.failed',
            executionId: id,
            error
        });
    }
    /**
     * Retrieve a single execution by ID.
     */
    async getExecution(id) {
        const res = await this.pool.query(`SELECT id, module, status, started_at, completed_at,
              input, result, error, verification, notifications
       FROM executions
       WHERE id = $1`, [id]);
        if (res.rows.length === 0)
            return null;
        return this.rowToRecord(res.rows[0]);
    }
    /**
     * List executions with optional filtering and pagination.
     */
    async listExecutions(options = {}) {
        const { module, status, limit = 20, offset = 0 } = options;
        const conditions = [];
        const params = [];
        let paramIdx = 1;
        if (module) {
            conditions.push(`module = $${paramIdx++}`);
            params.push(module);
        }
        if (status) {
            conditions.push(`status = $${paramIdx++}`);
            params.push(status);
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(limit, offset);
        const res = await this.pool.query(`SELECT id, module, status, started_at, completed_at,
              input, result, error, verification, notifications
       FROM executions
       ${where}
       ORDER BY started_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`, params);
        return res.rows.map(r => this.rowToRecord(r));
    }
    rowToRecord(row) {
        return {
            id: row.id,
            module: row.module,
            status: row.status,
            startedAt: row.started_at.toISOString(),
            completedAt: row.completed_at
                ? row.completed_at.toISOString()
                : undefined,
            input: row.input,
            result: row.result,
            error: row.error,
            verification: row.verification,
            notifications: row.notifications
        };
    }
}
exports.ExecutionTracker = ExecutionTracker;
//# sourceMappingURL=ExecutionTracker.js.map