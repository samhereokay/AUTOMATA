"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuredMemoryRepository = void 0;
const pg_1 = require("pg");
const logger_1 = require("../logger");
class StructuredMemoryRepository {
    pool;
    constructor(connectionString) {
        this.pool = new pg_1.Pool({ connectionString });
    }
    async close() {
        await this.pool.end();
    }
    async set(scope, scopeId, type, key, value) {
        await this.pool.query(`INSERT INTO structured_memory (scope, scope_id, type, key, value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (scope, scope_id, type, key)
       DO UPDATE SET value = $5, updated_at = NOW()`, [scope, scopeId, type, key, JSON.stringify(value)]);
        logger_1.logger.debug('Stored structured memory', { scope, scopeId, type, key });
    }
    async get(scope, scopeId, type, key) {
        const res = await this.pool.query(`SELECT value FROM structured_memory
       WHERE scope = $1 AND scope_id = $2 AND type = $3 AND key = $4`, [scope, scopeId, type, key]);
        if (res.rows.length === 0)
            return null;
        return res.rows[0].value;
    }
    async delete(scope, scopeId, type, key) {
        await this.pool.query(`DELETE FROM structured_memory
       WHERE scope = $1 AND scope_id = $2 AND type = $3 AND key = $4`, [scope, scopeId, type, key]);
    }
}
exports.StructuredMemoryRepository = StructuredMemoryRepository;
//# sourceMappingURL=StructuredMemoryRepository.js.map