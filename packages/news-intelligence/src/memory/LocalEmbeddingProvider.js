"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalEmbeddingProvider = void 0;
const logger_1 = require("../logger");
class LocalEmbeddingProvider {
    provider = 'ollama';
    model;
    dimensions = 2048; // Default, will be updated via tags if possible.
    availability = 'UNAVAILABLE';
    baseUrl;
    metadata;
    constructor(baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1') {
        // We rewrite the v1 endpoint to the base server endpoint since we need /api/tags
        this.baseUrl = baseUrl.replace('/v1', '');
        const envModel = process.env.OLLAMA_EMBEDDING_MODEL;
        this.model = envModel || 'none';
        this.metadata = {
            id: 'local-embedding-provider',
            name: 'Local Ollama Embeddings',
            capabilities: ['embedding'],
            executionMode: 'local',
            costModel: 'free',
            privacyModel: 'strict',
            availability: 'unavailable',
            requiresCredentials: false
        };
    }
    async healthCheck() {
        return this.availability === 'AVAILABLE';
    }
    async configure() { }
    async execute(prompt, context) {
        throw new Error('Not implemented for EmbeddingProvider');
    }
    async embedBatch(texts) {
        return Promise.all(texts.map(t => this.embed(t)));
    }
    async init() {
        if (this.model === 'none') {
            logger_1.logger.info('No OLLAMA_EMBEDDING_MODEL configured. EmbeddingProvider will remain UNAVAILABLE.');
            this.availability = 'UNAVAILABLE';
            return;
        }
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`Failed to fetch models from Ollama: ${response.status}`);
            }
            const data = await response.json();
            const modelExists = data.models?.some((m) => m.name === this.model || m.name.startsWith(this.model + ':'));
            if (!modelExists) {
                logger_1.logger.warn(`Configured embedding model ${this.model} is not installed in Ollama. EmbeddingProvider will remain UNAVAILABLE. Do not download it automatically.`);
                this.availability = 'UNAVAILABLE';
                return;
            }
            // Test embedding capability
            const embedTestResponse = await fetch(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: this.model, prompt: 'test' })
            });
            if (!embedTestResponse.ok) {
                logger_1.logger.warn(`Model ${this.model} exists, but embedding test failed (${embedTestResponse.status}). EmbeddingProvider UNAVAILABLE.`);
                this.availability = 'UNAVAILABLE';
                return;
            }
            const embedData = await embedTestResponse.json();
            if (embedData.error) {
                logger_1.logger.warn(`Model ${this.model} exists, but embedding test returned error: ${embedData.error}. EmbeddingProvider UNAVAILABLE.`);
                this.availability = 'UNAVAILABLE';
                return;
            }
            if (embedData.embedding && Array.isArray(embedData.embedding)) {
                this.dimensions = embedData.embedding.length;
                this.availability = 'AVAILABLE';
                logger_1.logger.info(`EmbeddingProvider AVAILABLE. Model: ${this.model}, Dimensions: ${this.dimensions}`);
            }
            else {
                logger_1.logger.warn(`Model ${this.model} did not return a valid embedding array. EmbeddingProvider UNAVAILABLE.`);
                this.availability = 'UNAVAILABLE';
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize LocalEmbeddingProvider:', error);
            this.availability = 'UNAVAILABLE';
        }
    }
    async embed(text) {
        if (this.availability === 'UNAVAILABLE') {
            throw new Error(`Embedding capability is unavailable. Current model: ${this.model}`);
        }
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.model, prompt: text })
        });
        if (!response.ok) {
            throw new Error(`Embedding request failed: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`Embedding error: ${data.error}`);
        }
        return data.embedding;
    }
    health() {
        return this.availability;
    }
}
exports.LocalEmbeddingProvider = LocalEmbeddingProvider;
//# sourceMappingURL=LocalEmbeddingProvider.js.map