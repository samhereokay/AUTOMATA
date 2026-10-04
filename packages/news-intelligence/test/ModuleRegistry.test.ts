import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ModuleRegistry } from '../src/ModuleRegistry';

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = new ModuleRegistry();
  });

  it('initializes with default cybersecurity-news module', () => {
    const modules = registry.listModules();
    assert.equal(modules.length, 8);
    assert.equal(modules[0].id, 'cybersecurity-news');
    assert.equal(modules[0].version, '1.0.0');
  });

  it('getModule returns the module if it exists', () => {
    const mod = registry.getModule('cybersecurity-news');
    assert.ok(mod);
    assert.equal(mod!.id, 'cybersecurity-news');
  });

  it('getModule returns undefined for non-existent module', () => {
    const mod = registry.getModule('non-existent');
    assert.equal(mod, undefined);
  });

  it('registerModule adds a new module', () => {
    const customModule = {
      id: 'custom-module',
      name: 'Custom',
      version: '1.0.0',
      description: 'Test',
      type: 'processor' as const,
      entrypoint: '/api/custom',
      status: 'active' as const,
      author: 'Test',
      schema: { input: {}, output: {} },
      tags: []
    };

    registry.registerModule(customModule);
    const mod = registry.getModule('custom-module');
    assert.deepEqual(mod, customModule);
    
    const modules = registry.listModules();
    assert.equal(modules.length, 9);
  });
});
