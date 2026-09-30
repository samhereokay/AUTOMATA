"use strict";
import test from 'node:test';
import assert from 'node:assert';
import { LocalAIProvider } from '../src/LocalAIProvider';
import { AIAnalyzer } from '../src/AIAnalyzer';

if (!process.env.RUN_REAL_AI_TEST) {
  console.log('Skipping real AI provider tests. Set RUN_REAL_AI_TEST=1 to run them.');
  process.exit(0);
}

test('LocalAIProvider (Real Ollama)', async (t) => {
  // Use the default constructor with real fetch, hitting 127.0.0.1:11434/v1
  // with the qwen2.5:3b model.
  const provider = new LocalAIProvider({ timeoutMs: 60000 }); // give it 60s for local inference
  const analyzer = new AIAnalyzer(provider);

  await t.test('✔ Successfully generates structured analysis from real local model', async () => {
    // We pass a mock NewsItem through the real AIAnalyzer to test the real integration
    const newsItem = {
      id: 'real-test-1',
      title: 'Major Security Flaw Found in popular NPM package',
      url: 'https://example.com/npm-flaw',
      source: 'Hacker News',
      publishedAt: new Date().toISOString(),
      collectedAt: new Date().toISOString(),
      category: 'cybersecurity' as any,
      metadata: {
        snippet: 'A critical remote code execution vulnerability (CVSS 9.8) was discovered in a popular NPM package. Attackers are actively exploiting this in the wild. Patches are available in version 2.1.4.'
      }
    };

    console.log('    (Waiting for local Ollama inference...)');
    
    // The analyzer validates the item first, then calls the provider, then parses the JSON.
    const analyzed = await analyzer.analyzeItem(newsItem);
    
    assert.ok(analyzed.analysis, 'Should have produced analysis');
    assert.strictEqual(typeof analyzed.analysis.summary, 'string');
    assert.ok(analyzed.analysis.keyPoints.length > 0);
    assert.ok(['low', 'medium', 'high', 'critical'].includes(analyzed.analysis.severity as string), `Expected valid severity, got ${analyzed.analysis.severity}`);
    assert.ok(analyzed.validation.valid === true, 'Evidence should remain valid');
  });

});
