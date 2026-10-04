"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const ProviderRouter_1 = require("../src/router/ProviderRouter");
class TestProvider {
    metadata;
    constructor(metadata) {
        this.metadata = metadata;
    }
    async healthCheck() { return true; }
    async configure() { }
}
(0, node_test_1.test)('ProviderRouter: Selects local provider when cloud_allowed is false', async () => {
    const router = new ProviderRouter_1.ProviderRouter();
    router.registerProvider(new TestProvider({
        id: 'cloud-ai',
        name: 'Cloud AI',
        capabilities: ['ai'],
        executionMode: 'cloud',
        costModel: 'free',
        privacyModel: 'unrestricted',
        availability: 'available',
        requiresCredentials: false
    }));
    router.registerProvider(new TestProvider({
        id: 'local-ai',
        name: 'Local AI',
        capabilities: ['ai'],
        executionMode: 'local',
        costModel: 'free',
        privacyModel: 'strict',
        availability: 'available',
        requiresCredentials: false
    }));
    const provider = await router.route('ai', { cloud_allowed: false });
    node_assert_1.default.strictEqual(provider.metadata.id, 'local-ai');
});
(0, node_test_1.test)('ProviderRouter: Selects cloud provider when allowed and available', async () => {
    const router = new ProviderRouter_1.ProviderRouter();
    router.registerProvider(new TestProvider({
        id: 'cloud-ai',
        name: 'Cloud AI',
        capabilities: ['ai'],
        executionMode: 'cloud',
        costModel: 'free',
        privacyModel: 'unrestricted',
        availability: 'available',
        requiresCredentials: false
    }));
    const provider = await router.route('ai', { cloud_allowed: true });
    node_assert_1.default.strictEqual(provider.metadata.id, 'cloud-ai');
});
(0, node_test_1.test)('ProviderRouter: Throws when capability not found', async () => {
    const router = new ProviderRouter_1.ProviderRouter();
    await node_assert_1.default.rejects(async () => await router.route('design', { cloud_allowed: true }), /No provider available for design/);
});
//# sourceMappingURL=ProviderRouter.test.js.map