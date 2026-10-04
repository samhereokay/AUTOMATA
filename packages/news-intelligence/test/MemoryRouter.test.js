"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const MemoryRouter_1 = require("../src/router/MemoryRouter");
(0, node_test_1.test)('MemoryRouter: Handles routing successfully', async () => {
    const router = new MemoryRouter_1.MemoryRouter({}, {});
    await node_assert_1.default.doesNotReject(async () => {
        await router.route({
            required: true,
            scopes: ['GLOBAL_USER']
        });
    });
});
(0, node_test_1.test)('MemoryRouter: Ignores route if not required', async () => {
    const router = new MemoryRouter_1.MemoryRouter({}, {});
    await node_assert_1.default.doesNotReject(async () => {
        await router.route({
            required: false,
            scopes: []
        });
    });
});
//# sourceMappingURL=MemoryRouter.test.js.map