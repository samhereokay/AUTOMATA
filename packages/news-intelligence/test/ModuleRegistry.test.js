"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ModuleRegistry_1 = require("../src/ModuleRegistry");
(0, node_test_1.describe)('ModuleRegistry', () => {
    let registry;
    (0, node_test_1.beforeEach)(() => {
        registry = new ModuleRegistry_1.ModuleRegistry();
    });
    (0, node_test_1.it)('initializes with default cybersecurity-news module', () => {
        const modules = registry.listModules();
        strict_1.default.equal(modules.length, 8);
        strict_1.default.equal(modules[0].id, 'cybersecurity-news');
        strict_1.default.equal(modules[0].version, '1.0.0');
    });
    (0, node_test_1.it)('getModule returns the module if it exists', () => {
        const mod = registry.getModule('cybersecurity-news');
        strict_1.default.ok(mod);
        strict_1.default.equal(mod.id, 'cybersecurity-news');
    });
    (0, node_test_1.it)('getModule returns undefined for non-existent module', () => {
        const mod = registry.getModule('non-existent');
        strict_1.default.equal(mod, undefined);
    });
    (0, node_test_1.it)('registerModule adds a new module', () => {
        const customModule = {
            id: 'custom-module',
            name: 'Custom',
            version: '1.0.0',
            description: 'Test',
            type: 'processor',
            entrypoint: '/api/custom',
            status: 'active',
            author: 'Test',
            schema: { input: {}, output: {} },
            tags: []
        };
        registry.registerModule(customModule);
        const mod = registry.getModule('custom-module');
        strict_1.default.deepEqual(mod, customModule);
        const modules = registry.listModules();
        strict_1.default.equal(modules.length, 9);
    });
});
//# sourceMappingURL=ModuleRegistry.test.js.map