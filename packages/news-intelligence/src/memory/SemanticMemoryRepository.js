"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticMemoryRepository = void 0;
const logger_1 = require("../logger");
class SemanticMemoryRepository {
    embeddingProvider;
    qdrantUrl;
    collectionName = 'automata_semantic';
    initialized = false;
    constructor(embeddingProvider, qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333') {
        this.embeddingProvider = embeddingProvider;
        this.qdrantUrl = qdrantUrl;
    }
    async ensureCollection() {
        if (this.initialized)
            return;
        if (this.embeddingProvider.health && this.embeddingProvider.health() !== 'AVAILABLE') {
            logger_1.logger.warn('EmbeddingProvider is UNAVAILABLE. Semantic memory will not be initialized.');
            return;
        }
        try {
            const response = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}`);
            if (response.status === 404) {
                // Create collection
                const createRes = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vectors: {
                            size: this.embeddingProvider.dimensions || 2048,
                            distance: 'Cosine'
                        }
                    })
                });
                if (!createRes.ok) {
                    throw new Error(`Failed to create Qdrant collection: ${createRes.statusText}`);
                }
                logger_1.logger.info(`Created Qdrant collection: ${this.collectionName}`);
            }
            this.initialized = true;
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize SemanticMemoryRepository', error);
            throw error;
        }
    }
    async store(item) {
        if (this.embeddingProvider.health && this.embeddingProvider.health() !== 'AVAILABLE') {
            throw new Error('Semantic memory is UNAVAILABLE because no embedding provider is available.');
        }
        await this.ensureCollection();
        const vector = await this.embeddingProvider.embed(item.text);
        const payload = {
            points: [
                {
                    id: item.id,
                    vector,
                    payload: {
                        scope: item.scope,
                        scopeId: item.scopeId,
                        type: item.type,
                        text: item.text,
                        ...item.metadata
                    }
                }
            ]
        };
        const response = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points?wait=true`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`Failed to store semantic memory: ${response.statusText}`);
        }
        logger_1.logger.debug('Stored semantic memory', { id: item.id, scope: item.scope });
    }
    async search(query, scope, scopeId, limit = 5) {
        if (this.embeddingProvider.health && this.embeddingProvider.health() !== 'AVAILABLE') {
            throw new Error('Semantic memory is UNAVAILABLE because no embedding provider is available.');
        }
        await this.ensureCollection();
        const vector = await this.embeddingProvider.embed(query);
        const response = await fetch(`${this.qdrantUrl}/collections/${this.collectionName}/points/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vector,
                limit,
                filter: {
                    must: [
                        { key: 'scope', match: { value: scope } },
                        { key: 'scopeId', match: { value: scopeId } }
                    ]
                },
                with_payload: true
            })
        });
        if (!response.ok) {
            throw new Error(`Failed to search semantic memory: ${response.statusText}`);
        }
        const data = await response.json();
        return data.result.map((p) => ({
            id: p.id,
            scope: p.payload.scope,
            scopeId: p.payload.scopeId,
            type: p.payload.type,
            text: p.payload.text,
            metadata: p.payload // Includes all other keys
        }));
    }
}
exports.SemanticMemoryRepository = SemanticMemoryRepository;
//# sourceMappingURL=SemanticMemoryRepository.js.map