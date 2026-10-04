import { Pool } from 'pg';
import { logger } from '../logger';

export class StructuredMemoryRepository {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async set(
    scope: string,
    scopeId: string,
    type: string,
    key: string,
    value: Record<string, unknown>
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO structured_memory (scope, scope_id, type, key, value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (scope, scope_id, type, key)
       DO UPDATE SET value = $5, updated_at = NOW()`,
      [scope, scopeId, type, key, JSON.stringify(value)]
    );
    logger.debug('Stored structured memory', { scope, scopeId, type, key });
  }

  public async get(
    scope: string,
    scopeId: string,
    type: string,
    key: string
  ): Promise<Record<string, unknown> | null> {
    const res = await this.pool.query(
      `SELECT value FROM structured_memory
       WHERE scope = $1 AND scope_id = $2 AND type = $3 AND key = $4`,
      [scope, scopeId, type, key]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0].value;
  }

  public async delete(
    scope: string,
    scopeId: string,
    type: string,
    key: string
  ): Promise<void> {
    await this.pool.query(
      `DELETE FROM structured_memory
       WHERE scope = $1 AND scope_id = $2 AND type = $3 AND key = $4`,
      [scope, scopeId, type, key]
    );
  }
}
