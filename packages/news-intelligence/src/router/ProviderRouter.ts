import { Provider } from '../core/Provider';
import { CapabilityType } from '../core/Capability';
import { PrivacyRequirement } from '../planner/Planner';

export interface ProviderRouterOptions {
  requireHealthy?: boolean;
}

export class ProviderRouter {
  private providers: Provider[];

  constructor(providers: Provider[] = []) {
    this.providers = providers;
  }

  /**
   * Register a new provider in the router.
   */
  public registerProvider(provider: Provider): void {
    this.providers.push(provider);
  }

  /**
   * Find the best provider for a given capability, considering privacy constraints.
   */
  public async route(capability: CapabilityType, privacy: PrivacyRequirement, options?: ProviderRouterOptions): Promise<Provider> {
    const candidates = this.getProvidersByCapability(capability);
    if (!candidates.length) throw new Error(`No provider available for ${capability}`);

    // If cloud is not allowed, filter out cloud executionMode
    if (!privacy.cloud_allowed) {
      const localCandidates = candidates.filter(p => p.metadata.executionMode === 'local');
      if (!localCandidates.length) throw new Error(`No local provider available for ${capability}`);
      return localCandidates[0];
    }
    return candidates[0];
  }
  
  /**
   * Find all providers capable of a specific capability.
   */
  public getProvidersByCapability(capability: CapabilityType): Provider[] {
    return this.providers.filter(p => p.metadata.capabilities.includes(capability) && p.metadata.availability === 'available');
  }
}
