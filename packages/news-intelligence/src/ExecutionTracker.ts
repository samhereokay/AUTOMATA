import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import { logger } from './logger';

export type ExecutionStatus = 'planned' | 'pending' | 'running' | 'success' | 'failure' | 'partial' | 'verification_failed';

export interface VerificationCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail?: string;
}

export interface VerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
  passCount: number;
  failCount: number;
  skipCount: number;
}

export interface NotificationStatus {
  channel: string;
  status: 'sent' | 'skipped' | 'failed';
  detail?: string;
  count?: number;
}

export interface ExecutionRecord {
  id: string;
  module: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  verification?: VerificationResult;
  notifications?: NotificationStatus[];
}

export interface ExecutionListOptions {
  module?: string;
  status?: ExecutionStatus;
  limit?: number;
  offset?: number;
}

/**
 * Generates a collision-safe execution ID.
 * Format: exec_<timestamp_ms_base36>_<random_hex8>
 * Example: exec_lq4x7k8_a3f2b1c9
 */
function generateExecutionId(): string {
  const ts = Date.now().toString(36);
  const rand = randomBytes(4).toString('hex');
  return `exec_${ts}_${rand}`;
}

/**
 * Tracks the lifecycle of every Automation OS pipeline execution.
 * Persists to the `executions` table via the existing PostgreSQL pool.
 */
export class ExecutionTracker {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Create a new execution record and return its ID.
   * Status starts as 'pending'.
   */
  public async planExecution(
    module: string,
    input?: Record<string, unknown>
  ): Promise<string> {
    const id = generateExecutionId();
    const startedAt = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO executions (id, module, status, started_at, input)
       VALUES ($1, $2, 'planned', $3, $4)`,
      [id, module, startedAt, input ? JSON.stringify(input) : null]
    );

    logger.info('Execution planned', {
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
  public async startExecution(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE executions SET status = 'running' WHERE id = $1`,
      [id]
    );

    logger.info('Execution started', {
      component: 'execution-tracker',
      event: 'execution.started',
      executionId: id
    });
  }

  /**
   * Mark an execution as successfully completed.
   */
  public async completeExecution(
    id: string,
    result: Record<string, unknown>,
    verification: VerificationResult,
    notifications: NotificationStatus[]
  ): Promise<void> {
    const completedAt = new Date().toISOString();

    // Determine status from verification
    const status: ExecutionStatus =
      verification.failCount > 0 ? 'verification_failed' : 'success';

    await this.pool.query(
      `UPDATE executions
       SET status = $1,
           completed_at = $2,
           result = $3,
           verification = $4,
           notifications = $5
       WHERE id = $6`,
      [
        status,
        completedAt,
        JSON.stringify(result),
        JSON.stringify(verification),
        JSON.stringify(notifications),
        id
      ]
    );

    logger.info('Execution completed', {
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
  public async failExecution(id: string, error: string): Promise<void> {
    const completedAt = new Date().toISOString();

    await this.pool.query(
      `UPDATE executions
       SET status = 'failure',
           completed_at = $1,
           error = $2
       WHERE id = $3`,
      [completedAt, error, id]
    );

    logger.error('Execution failed', {
      component: 'execution-tracker',
      event: 'execution.failed',
      executionId: id,
      error
    });
  }

  /**
   * Retrieve a single execution by ID.
   */
  public async getExecution(id: string): Promise<ExecutionRecord | null> {
    const res = await this.pool.query(
      `SELECT id, module, status, started_at, completed_at,
              input, result, error, verification, notifications
       FROM executions
       WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) return null;
    return this.rowToRecord(res.rows[0]);
  }

  /**
   * List executions with optional filtering and pagination.
   */
  public async listExecutions(
    options: ExecutionListOptions = {}
  ): Promise<ExecutionRecord[]> {
    const { module, status, limit = 20, offset = 0 } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];
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
    const res = await this.pool.query(
      `SELECT id, module, status, started_at, completed_at,
              input, result, error, verification, notifications
       FROM executions
       ${where}
       ORDER BY started_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params
    );

    return res.rows.map(r => this.rowToRecord(r));
  }

  private rowToRecord(row: Record<string, unknown>): ExecutionRecord {
    return {
      id: row.id as string,
      module: row.module as string,
      status: row.status as ExecutionStatus,
      startedAt: (row.started_at as Date).toISOString(),
      completedAt: row.completed_at
        ? (row.completed_at as Date).toISOString()
        : undefined,
      input: row.input as Record<string, unknown> | undefined,
      result: row.result as Record<string, unknown> | undefined,
      error: row.error as string | undefined,
      verification: row.verification as VerificationResult | undefined,
      notifications: row.notifications as NotificationStatus[] | undefined
    };
  }
}
