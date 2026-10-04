import { FileStorageProvider } from '../storage/FileStorageProvider';
import { StorageRequirement, PrivacyRequirement } from '../planner/Planner';

export class StorageRouter {
  private providers: FileStorageProvider[] = [];

  public registerProvider(provider: FileStorageProvider) {
    this.providers.push(provider);
  }

  public async route(requirement: StorageRequirement, privacy: PrivacyRequirement): Promise<FileStorageProvider> {
    if (this.providers.length === 0) {
      throw new Error('No storage providers registered.');
    }

    if (!privacy.cloud_allowed) {
      const localProvider = this.providers.find(p => p.metadata.executionMode === 'local');
      if (!localProvider) throw new Error('No local storage provider available for LOCAL_ONLY policy.');
      return localProvider;
    }

    return this.providers.find(p => p.metadata.executionMode === 'local') || this.providers[0];
  }
}
