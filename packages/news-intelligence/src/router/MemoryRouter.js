"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryRouter = void 0;
const logger_1 = require("../logger");
class MemoryRouter {
    semanticMemory;
    structuredMemory;
    constructor(semanticMemory, structuredMemory) {
        this.semanticMemory = semanticMemory;
        this.structuredMemory = structuredMemory;
    }
    async route(requirement) {
        if (!requirement.required)
            return;
        logger_1.logger.info('Memory routing completed', { scopes: requirement.scopes });
    }
    // Structured Memory Methods
    async storeStructured(scope, scopeId, type, key, value) {
        await this.structuredMemory.set(scope, scopeId, type, key, value);
    }
    async retrieveStructured(scope, scopeId, type, key) {
        return await this.structuredMemory.get(scope, scopeId, type, key);
    }
    async updateStructured(scope, scopeId, type, key, value) {
        await this.structuredMemory.set(scope, scopeId, type, key, value);
    }
    async deleteStructured(scope, scopeId, type, key) {
        await this.structuredMemory.delete(scope, scopeId, type, key);
    }
    async searchStructured(scope, scopeId, type, key) {
        // Return exact match as basic search for structured data
        return await this.retrieveStructured(scope, scopeId, type, key);
    }
}
exports.MemoryRouter = MemoryRouter;
//# sourceMappingURL=MemoryRouter.js.map