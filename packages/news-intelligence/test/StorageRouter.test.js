"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const StorageRouter_1 = require("../src/router/StorageRouter");
class MockFileProvider {
    metadata;
    constructor(metadata) {
        this.metadata = metadata;
    }
    async healthCheck() { return true; }
    async configure() { }
    async upload() { return {}; }
    async download() { return Buffer.from(''); }
    async delete() { return true; }
    async exists() { return true; }
    async getMetadata() { return null; }
}
(0, node_test_1.test)('StorageRouter: Selects local provider for LOCAL_ONLY', async () => {
    const router = new StorageRouter_1.StorageRouter();
    router.registerProvider(new MockFileProvider({
        id: 'cloud-fs', name: 'Cloud FS', capabilities: ['storage'],
        executionMode: 'cloud', costModel: 'free', privacyModel: 'unrestricted',
        availability: 'available', requiresCredentials: false
    }));
    router.registerProvider(new MockFileProvider({
        id: 'local-fs', name: 'Local FS', capabilities: ['storage'],
        executionMode: 'local', costModel: 'free', privacyModel: 'strict',
        availability: 'available', requiresCredentials: false
    }));
    const provider = await router.route({ required: true }, { cloud_allowed: false });
    node_assert_1.default.strictEqual(provider.metadata.id, 'local-fs');
});
(0, node_test_1.test)('StorageRouter: Selects cloud provider for CLOUD_ONLY', async () => {
    const router = new StorageRouter_1.StorageRouter();
    router.registerProvider(new MockFileProvider({
        id: 'cloud-fs', name: 'Cloud FS', capabilities: ['storage'],
        executionMode: 'cloud', costModel: 'free', privacyModel: 'unrestricted',
        availability: 'available', requiresCredentials: false
    }));
    const provider = await router.route({ required: true }, { cloud_allowed: true });
    node_assert_1.default.strictEqual(provider.metadata.id, 'cloud-fs');
});
(0, node_test_1.test)('StorageRouter: Throws when missing local provider for LOCAL_ONLY', async () => {
    const router = new StorageRouter_1.StorageRouter();
    router.registerProvider(new MockFileProvider({
        id: 'cloud-fs', name: 'Cloud FS', capabilities: ['storage'],
        executionMode: 'cloud', costModel: 'free', privacyModel: 'unrestricted',
        availability: 'available', requiresCredentials: false
    }));
    await node_assert_1.default.rejects(async () => await router.route({ required: true }, { cloud_allowed: false }), /No local storage provider available for LOCAL_ONLY policy/);
});
//# sourceMappingURL=StorageRouter.test.js.map