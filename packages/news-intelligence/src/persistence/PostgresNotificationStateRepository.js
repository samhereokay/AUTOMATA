"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresNotificationStateRepository = void 0;
const pg_1 = require("pg");
class PostgresNotificationStateRepository {
    pool;
    isClosed = false;
    constructor(connectionString) {
        this.pool = new pg_1.Pool({ connectionString });
    }
    async initialize() {
        // Schema creation has been moved to migrations (migrate.ts)
    }
    async close() {
        if (!this.isClosed) {
            this.isClosed = true;
            await this.pool.end();
        }
    }
    async hasBeenSent(channel, canonicalNewsId) {
        const client = await this.pool.connect();
        try {
            const res = await client.query(`SELECT 1 FROM notification_deliveries WHERE channel = $1 AND news_item_id = $2 LIMIT 1`, [channel, canonicalNewsId]);
            return res.rows.length > 0;
        }
        finally {
            client.release();
        }
    }
    async markSent(channel, canonicalNewsId) {
        const client = await this.pool.connect();
        try {
            await client.query(`INSERT INTO notification_deliveries (channel, news_item_id, sent_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (channel, news_item_id) DO NOTHING`, [channel, canonicalNewsId]);
        }
        finally {
            client.release();
        }
    }
}
exports.PostgresNotificationStateRepository = PostgresNotificationStateRepository;
//# sourceMappingURL=PostgresNotificationStateRepository.js.map