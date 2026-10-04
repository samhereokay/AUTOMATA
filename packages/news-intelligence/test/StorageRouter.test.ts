import { test } from 'node:test';
import assert from 'node:assert';
import { StorageRouter } from '../src/router/StorageRouter';
import { FileStorageProvider, FileMetadata } from '../src/storage/FileStorageProvider';
import { ProviderMetadata } from '../src/core/Provider';

class MockFileProvider implements FileStorageProvider {
  constructor(public metadata: ProviderMetadata) {}
  async healthCheck() { return true; }
  async configure() {}
  async upload() { return {} as FileMetadata; }
  async download() { return Buffer.from(''); }
  async delete() { return true; }
  async exists() { return true; }
  async getMetadata() { return null; }
}

test('StorageRouter: Selects local provider for LOCAL_ONLY', async () => {
  const router = new StorageRouter();
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
  assert.strictEqual(provider.metadata.id, 'local-fs');
});

test('StorageRouter: Selects cloud provider for CLOUD_ONLY', async () => {
  const router = new StorageRouter();
  router.registerProvider(new MockFileProvider({
    id: 'cloud-fs', name: 'Cloud FS', capabilities: ['storage'],
    executionMode: 'cloud', costModel: 'free', privacyModel: 'unrestricted',
    availability: 'available', requiresCredentials: false
  }));

  const provider = await router.route({ required: true }, { cloud_allowed: true });
  assert.strictEqual(provider.metadata.id, 'cloud-fs');
});

test('StorageRouter: Throws when missing local provider for LOCAL_ONLY', async () => {
  const router = new StorageRouter();
  router.registerProvider(new MockFileProvider({
    id: 'cloud-fs', name: 'Cloud FS', capabilities: ['storage'],
    executionMode: 'cloud', costModel: 'free', privacyModel: 'unrestricted',
    availability: 'available', requiresCredentials: false
  }));

  await assert.rejects(
    async () => await router.route({ required: true }, { cloud_allowed: false }),
    /No local storage provider available for LOCAL_ONLY policy/
  );
});
