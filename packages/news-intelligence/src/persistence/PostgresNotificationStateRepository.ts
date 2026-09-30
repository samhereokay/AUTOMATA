import { Pool } from 'pg';
import { NotificationStateRepository } from '../NotificationStateRepository';

export class PostgresNotificationStateRepository implements NotificationStateRepository {
  private pool: Pool;
  private isClosed = false;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  public async initialize(): Promise<void> {
    // Schema creation has been moved to migrations (migrate.ts)
  }

  public async close(): Promise<void> {
    if (!this.isClosed) {
      this.isClosed = true;
      await this.pool.end();
    }
  }

  public async hasBeenSent(channel: string, canonicalNewsId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        `SELECT 1 FROM notification_deliveries WHERE channel = $1 AND news_item_id = $2 LIMIT 1`,
        [channel, canonicalNewsId]
      );
      return res.rows.length > 0;
    } finally {
      client.release();
    }
  }

  public async markSent(channel: string, canonicalNewsId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO notification_deliveries (channel, news_item_id, sent_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (channel, news_item_id) DO NOTHING`,
        [channel, canonicalNewsId]
      );
    } finally {
      client.release();
    }
  }
}
