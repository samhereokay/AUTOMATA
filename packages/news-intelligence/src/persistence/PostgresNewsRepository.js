"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresNewsRepository = void 0;
const pg_1 = require("pg");
class PostgresNewsRepository {
    pool;
    isClosed = false;
    constructor(connectionString) {
        this.pool = new pg_1.Pool({ connectionString });
    }
    /**
     * Initializes the database schema.
     */
    async initialize() {
        // Schema creation has been moved to migrations (migrate.ts)
    }
    async close() {
        if (!this.isClosed) {
            this.isClosed = true;
            await this.pool.end();
        }
    }
    async save(item) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const existing = await this.getByIdInternal(client, item.item.id);
            // Merge related sources
            const mergedSources = new Set();
            if (existing?.item.relatedSources) {
                existing.item.relatedSources.forEach(s => mergedSources.add(s));
            }
            if (item.item.relatedSources) {
                item.item.relatedSources.forEach(s => mergedSources.add(s));
            }
            // Upsert into news_items
            await client.query(`
        INSERT INTO news_items (
          id, title, url, source, published_at, collected_at, category, metadata,
          validation_status, validation_errors, validation_warnings,
          analysis_summary, analysis_key_points, analysis_entities, analysis_technologies, analysis_tags, analysis_severity
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          url = EXCLUDED.url,
          source = EXCLUDED.source,
          published_at = EXCLUDED.published_at,
          collected_at = EXCLUDED.collected_at,
          category = EXCLUDED.category,
          metadata = EXCLUDED.metadata,
          validation_status = EXCLUDED.validation_status,
          validation_errors = EXCLUDED.validation_errors,
          validation_warnings = EXCLUDED.validation_warnings,
          analysis_summary = COALESCE(EXCLUDED.analysis_summary, news_items.analysis_summary),
          analysis_key_points = COALESCE(EXCLUDED.analysis_key_points, news_items.analysis_key_points),
          analysis_entities = COALESCE(EXCLUDED.analysis_entities, news_items.analysis_entities),
          analysis_technologies = COALESCE(EXCLUDED.analysis_technologies, news_items.analysis_technologies),
          analysis_tags = COALESCE(EXCLUDED.analysis_tags, news_items.analysis_tags),
          analysis_severity = COALESCE(EXCLUDED.analysis_severity, news_items.analysis_severity)
      `, [
                item.item.id,
                item.item.title,
                item.item.url,
                item.item.source,
                item.item.publishedAt ? new Date(item.item.publishedAt) : null,
                new Date(item.item.collectedAt),
                item.item.category,
                item.item.metadata ? JSON.stringify(item.item.metadata) : null,
                item.validation.status,
                JSON.stringify(item.validation.errors || []),
                JSON.stringify(item.validation.warnings || []),
                item.analysis?.summary || null,
                item.analysis?.keyPoints ? JSON.stringify(item.analysis.keyPoints) : null,
                item.analysis?.entities ? JSON.stringify(item.analysis.entities) : null,
                item.analysis?.technologies ? JSON.stringify(item.analysis.technologies) : null,
                item.analysis?.tags ? JSON.stringify(item.analysis.tags) : null,
                item.analysis?.severity || null
            ]);
            // Handle related_sources
            // Clear existing and insert merged
            await client.query(`DELETE FROM related_sources WHERE news_item_id = $1`, [item.item.id]);
            const sourcesArray = Array.from(mergedSources);
            if (sourcesArray.length > 0) {
                for (const s of sourcesArray) {
                    await client.query(`
            INSERT INTO related_sources (news_item_id, source)
            VALUES ($1, $2)
          `, [item.item.id, s]);
                }
            }
            await client.query('COMMIT');
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
    async getById(id) {
        const client = await this.pool.connect();
        try {
            return await this.getByIdInternal(client, id);
        }
        finally {
            client.release();
        }
    }
    async findByUrl(url) {
        const normalizedTarget = this.normalizeUrl(url);
        const client = await this.pool.connect();
        try {
            // In a real implementation we'd probably have a normalized_url column,
            // but for parity with the InMemoryRepo and to preserve exact tests without schema changes,
            // we'll fetch them (or we can query by url if we are careful). 
            // The prompt says "preserve all existing repository semantics".
            // We will do a full scan if necessary, or better, we can filter in DB if we assume url matches closely.
            // But InMemory normalizes and checks all. Let's do the same for deterministic correctness.
            const res = await client.query(`SELECT id, url FROM news_items`);
            for (const row of res.rows) {
                if (this.normalizeUrl(row.url) === normalizedTarget) {
                    return await this.getByIdInternal(client, row.id);
                }
            }
            return null;
        }
        finally {
            client.release();
        }
    }
    async findByTitle(title) {
        const normalizedTarget = this.normalizeTitle(title);
        const client = await this.pool.connect();
        try {
            const res = await client.query(`SELECT id, title FROM news_items`);
            for (const row of res.rows) {
                if (this.normalizeTitle(row.title) === normalizedTarget) {
                    return await this.getByIdInternal(client, row.id);
                }
            }
            return null;
        }
        finally {
            client.release();
        }
    }
    async list(options) {
        const client = await this.pool.connect();
        try {
            const offset = options?.offset || 0;
            const limit = options?.limit || 1000;
            const res = await client.query(`
        SELECT id FROM news_items
        ORDER BY collected_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
            const items = [];
            for (const row of res.rows) {
                const item = await this.getByIdInternal(client, row.id);
                if (item)
                    items.push(item);
            }
            return items;
        }
        finally {
            client.release();
        }
    }
    async delete(id) {
        const client = await this.pool.connect();
        try {
            await client.query(`DELETE FROM news_items WHERE id = $1`, [id]);
        }
        finally {
            client.release();
        }
    }
    async getByIdInternal(client, id) {
        const res = await client.query(`SELECT * FROM news_items WHERE id = $1`, [id]);
        if (res.rows.length === 0)
            return null;
        const row = res.rows[0];
        const sourcesRes = await client.query(`SELECT source FROM related_sources WHERE news_item_id = $1`, [id]);
        const relatedSources = sourcesRes.rows.map(r => r.source);
        const baseItem = {
            id: row.id,
            title: row.title,
            url: row.url,
            source: row.source,
            publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
            collectedAt: new Date(row.collected_at).toISOString(),
            category: row.category,
        };
        if (row.metadata) {
            baseItem.metadata = row.metadata;
        }
        if (relatedSources.length > 0) {
            baseItem.relatedSources = relatedSources;
        }
        const validation = {
            valid: row.validation_status === 'verified',
            status: row.validation_status,
            errors: row.validation_errors || [],
            warnings: row.validation_warnings || []
        };
        let analysis = undefined;
        if (row.analysis_summary) {
            analysis = {
                summary: row.analysis_summary,
                keyPoints: row.analysis_key_points || [],
                entities: row.analysis_entities || [],
                technologies: row.analysis_technologies || [],
                tags: row.analysis_tags || [],
                severity: row.analysis_severity
            };
        }
        return {
            item: Object.freeze(baseItem),
            validation: Object.freeze(validation),
            analysis: analysis ? Object.freeze(analysis) : undefined
        };
    }
    normalizeUrl(urlStr) {
        try {
            const u = new URL(urlStr);
            const paramsToDelete = [];
            u.searchParams.forEach((_, key) => {
                if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
                    paramsToDelete.push(key);
                }
            });
            paramsToDelete.forEach(k => u.searchParams.delete(k));
            let normalized = u.origin + u.pathname + u.search;
            if (normalized.endsWith('/')) {
                normalized = normalized.slice(0, -1);
            }
            return normalized.toLowerCase();
        }
        catch {
            return urlStr.toLowerCase();
        }
    }
    normalizeTitle(title) {
        return title.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
}
exports.PostgresNewsRepository = PostgresNewsRepository;
//# sourceMappingURL=PostgresNewsRepository.js.map