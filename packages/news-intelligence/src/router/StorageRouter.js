"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageRouter = void 0;
class StorageRouter {
    providers = [];
    registerProvider(provider) {
        this.providers.push(provider);
    }
    async route(requirement, privacy) {
        if (this.providers.length === 0) {
            throw new Error('No storage providers registered.');
        }
        if (!privacy.cloud_allowed) {
            const localProvider = this.providers.find(p => p.metadata.executionMode === 'local');
            if (!localProvider)
                throw new Error('No local storage provider available for LOCAL_ONLY policy.');
            return localProvider;
        }
        return this.providers.find(p => p.metadata.executionMode === 'local') || this.providers[0];
    }
}
exports.StorageRouter = StorageRouter;
//# sourceMappingURL=StorageRouter.js.map