import { test } from 'node:test';
import assert from 'node:assert';
import { MemoryRouter } from '../src/router/MemoryRouter';
import { StructuredStorageProvider } from '../src/storage/StorageProvider';
import { EmbeddingProvider } from '../src/memory/EmbeddingProvider';
import { ProviderMetadata } from '../src/core/Provider';

test('MemoryRouter: Handles routing successfully', async () => {
  const router = new MemoryRouter({} as any, {} as any);
  await assert.doesNotReject(async () => {
    await router.route({
      required: true,
      scopes: ['GLOBAL_USER']
    });
  });
});

test('MemoryRouter: Ignores route if not required', async () => {
  const router = new MemoryRouter({} as any, {} as any);
  await assert.doesNotReject(async () => {
    await router.route({
      required: false,
      scopes: []
    });
  });
});
