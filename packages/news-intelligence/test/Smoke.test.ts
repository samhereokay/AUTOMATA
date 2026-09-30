import { test } from 'node:test';
import * as assert from 'node:assert';
import { CybersecCollector } from '../src/CybersecCollector';
import { LocalAIProvider } from '../src/LocalAIProvider';
import { TelegramService, TelegramProvider } from '../src/TelegramService';
import { SourceRegistry } from '../src/SourceRegistry';
import { PostgresNotificationStateRepository } from '../src/persistence/PostgresNotificationStateRepository';

class RealTelegramProvider implements TelegramProvider {
  private token: string;
  constructor(token: string) {
    this.token = token;
  }
  async sendMessage(chatId: string, message: string): Promise<void> {
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

test('Opt-in Smoke Tests', { skip: process.env.RUN_SMOKE_TESTS !== '1' }, async (t) => {
  await t.test('Real External Collectors', async () => {
    const sourceRegistry = new SourceRegistry();
    const cyber = new CybersecCollector(sourceRegistry);
    const items = await cyber.collect();
    assert.ok(Array.isArray(items));
    if (items.length > 0) {
      assert.ok(items[0].title);
      assert.ok(items[0].url);
      assert.strictEqual(items[0].category, 'cybersecurity');
    }
  });

  await t.test('Real Telegram', { skip: !process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID }, async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN!;
    const chatId = process.env.TELEGRAM_CHAT_ID!;
    
    const provider = new RealTelegramProvider(token);
    
    // We don't have a real DB in this unit test without setup, so mock state repo
    const mockStateRepo = {
      hasBeenSent: async () => false,
      markSent: async () => {}
    };

    const service = new TelegramService(provider, mockStateRepo as any, chatId);
    
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

    const sent = await service.notify(mockItem as any);
    assert.strictEqual(sent, true);
  });

  await t.test('Real AI qwen2.5:3b', { skip: !process.env.RUN_REAL_AI_TEST }, async () => {
    const provider = new LocalAIProvider({
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
