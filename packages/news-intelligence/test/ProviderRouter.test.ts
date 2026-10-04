import { test } from 'node:test';
import assert from 'node:assert';
import { ProviderRouter } from '../src/router/ProviderRouter';
import { Provider, ProviderMetadata } from '../src/core/Provider';

class TestProvider implements Provider {
  constructor(public metadata: ProviderMetadata) {}
  async healthCheck() { return true; }
  async configure() {}
}

test('ProviderRouter: Selects local provider when cloud_allowed is false', async () => {
  const router = new ProviderRouter();
  
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
  assert.strictEqual(provider.metadata.id, 'local-ai');
});

test('ProviderRouter: Selects cloud provider when allowed and available', async () => {
  const router = new ProviderRouter();
  
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
  assert.strictEqual(provider.metadata.id, 'cloud-ai');
});

test('ProviderRouter: Throws when capability not found', async () => {
  const router = new ProviderRouter();
  await assert.rejects(
    async () => await router.route('design', { cloud_allowed: true }),
    /No provider available for design/
  );
});
