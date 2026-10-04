"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRouter = void 0;
class ProviderRouter {
    providers;
    constructor(providers = []) {
        this.providers = providers;
    }
    /**
     * Register a new provider in the router.
     */
    registerProvider(provider) {
        this.providers.push(provider);
    }
    /**
     * Find the best provider for a given capability, considering privacy constraints.
     */
    async route(capability, privacy, options) {
        const candidates = this.getProvidersByCapability(capability);
        if (!candidates.length)
            throw new Error(`No provider available for ${capability}`);
        // If cloud is not allowed, filter out cloud executionMode
        if (!privacy.cloud_allowed) {
            const localCandidates = candidates.filter(p => p.metadata.executionMode === 'local');
            if (!localCandidates.length)
                throw new Error(`No local provider available for ${capability}`);
            return localCandidates[0];
        }
        return candidates[0];
    }
    /**
     * Find all providers capable of a specific capability.
     */
    getProvidersByCapability(capability) {
        return this.providers.filter(p => p.metadata.capabilities.includes(capability) && p.metadata.availability === 'available');
    }
}
exports.ProviderRouter = ProviderRouter;
//# sourceMappingURL=ProviderRouter.js.map