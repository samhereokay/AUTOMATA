import { Provider } from '../core/Provider';
import { CapabilityType } from '../core/Capability';
import { PrivacyRequirement } from '../planner/Planner';
export interface ProviderRouterOptions {
    requireHealthy?: boolean;
}
export declare class ProviderRouter {
    private providers;
    constructor(providers?: Provider[]);
    /**
     * Register a new provider in the router.
     */
    registerProvider(provider: Provider): void;
    /**
     * Find the best provider for a given capability, considering privacy constraints.
     */
    route(capability: CapabilityType, privacy: PrivacyRequirement, options?: ProviderRouterOptions): Promise<Provider>;
    /**
     * Find all providers capable of a specific capability.
     */
    getProvidersByCapability(capability: CapabilityType): Provider[];
}
//# sourceMappingURL=ProviderRouter.d.ts.map