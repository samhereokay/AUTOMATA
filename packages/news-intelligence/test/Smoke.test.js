"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const CybersecCollector_1 = require("../src/CybersecCollector");
const LocalAIProvider_1 = require("../src/LocalAIProvider");
const TelegramService_1 = require("../src/TelegramService");
const SourceRegistry_1 = require("../src/SourceRegistry");
class RealTelegramProvider {
    token;
    constructor(token) {
        this.token = token;
    }
    async sendMessage(chatId, message) {
        const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message })
        });
        if (!res.ok) {
            throw new Error(`Telegram API error: ${res.status} ${await res.text()}`);
        }
    }
}
(0, node_test_1.test)('Opt-in Smoke Tests', { skip: process.env.RUN_SMOKE_TESTS !== '1' }, async (t) => {
    await t.test('Real External Collectors', async () => {
        const sourceRegistry = new SourceRegistry_1.SourceRegistry();
        const cyber = new CybersecCollector_1.CybersecCollector(sourceRegistry);
        const items = await cyber.collect();
        assert.ok(Array.isArray(items));
        if (items.length > 0) {
            assert.ok(items[0].title);
            assert.ok(items[0].url);
            assert.strictEqual(items[0].category, 'cybersecurity');
        }
    });
    await t.test('Real Telegram', { skip: !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID }, async () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        const provider = new RealTelegramProvider(token);
        // We don't have a real DB in this unit test without setup, so mock state repo
        const mockStateRepo = {
            hasBeenSent: async () => false,
            markSent: async () => { }
        };
        const service = new TelegramService_1.TelegramService(provider, mockStateRepo, chatId);
        const mockItem = {
            item: {
                id: 'smoke-test-1',
                title: 'Smoke Test Message',
                url: 'http://example.com',
                source: 'Smoke Test',
                publishedAt: new Date().toISOString(),
                collectedAt: new Date().toISOString(),
                category: 'general'
            },
            validation: { status: 'verified', valid: true },
            analysis: {
                summary: 'This is an automated smoke test message.',
                keyPoints: ['Point 1'],
                entities: ['Test'],
                technologies: ['Node.js'],
                tags: ['smoke-test'],
                severity: 'low'
            }
        };
        const sent = await service.notify(mockItem);
        assert.strictEqual(sent, true);
    });
    await t.test('Real AI qwen2.5:3b', { skip: !process.env.RUN_REAL_AI_TEST }, async () => {
        const provider = new LocalAIProvider_1.LocalAIProvider({
            baseUrl: 'http://127.0.0.1:11434',
            model: 'qwen2.5:3b'
        });
        const text = "A critical zero-day vulnerability in Node.js allows remote code execution.";
        const result = await provider.analyze(text);
        const parsed = JSON.parse(result);
        assert.ok(parsed.summary);
        assert.ok(Array.isArray(parsed.keyPoints));
        assert.strictEqual(parsed.severity, 'high'); // or critical
    });
});
//# sourceMappingURL=Smoke.test.js.map