import { CapabilityType } from './Capability';
export type ExecutionMode = 'local' | 'cloud';
export type PrivacyModel = 'strict' | 'mixed' | 'unrestricted';
export interface ProviderMetadata {
    id: string;
    name: string;
    capabilities: CapabilityType[];
    executionMode: ExecutionMode;
    costModel: 'free' | 'paid' | 'mixed';
    privacyModel: PrivacyModel;
    availability: 'available' | 'unavailable' | 'unknown';
    requiresCredentials: boolean;
}
export interface Provider {
    readonly metadata: ProviderMetadata;
    /**
     * Validates if the provider is currently healthy and reachable.
     */
    healthCheck(): Promise<boolean>;
    /**
     * Allows the provider to initialize or load required credentials.
     */
    configure(options?: any): Promise<void>;
}
//# sourceMappingURL=Provider.d.ts.map