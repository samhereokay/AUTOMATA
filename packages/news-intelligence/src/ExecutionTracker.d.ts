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
 * Tracks the lifecycle of every Automation OS pipeline execution.
 * Persists to the `executions` table via the existing PostgreSQL pool.
 */
export declare class ExecutionTracker {
    private pool;
    constructor(connectionString: string);
    close(): Promise<void>;
    /**
     * Create a new execution record and return its ID.
     * Status starts as 'pending'.
     */
    planExecution(module: string, input?: Record<string, unknown>): Promise<string>;
    /**
     * Transition a planned execution to running.
     */
    startExecution(id: string): Promise<void>;
    /**
     * Mark an execution as successfully completed.
     */
    completeExecution(id: string, result: Record<string, unknown>, verification: VerificationResult, notifications: NotificationStatus[]): Promise<void>;
    /**
     * Mark an execution as failed with an error message.
     */
    failExecution(id: string, error: string): Promise<void>;
    /**
     * Retrieve a single execution by ID.
     */
    getExecution(id: string): Promise<ExecutionRecord | null>;
    /**
     * List executions with optional filtering and pagination.
     */
    listExecutions(options?: ExecutionListOptions): Promise<ExecutionRecord[]>;
    private rowToRecord;
}
//# sourceMappingURL=ExecutionTracker.d.ts.map