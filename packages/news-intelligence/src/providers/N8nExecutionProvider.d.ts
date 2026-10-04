import { Provider, ProviderMetadata } from '../core/Provider';
export interface N8nExecutionProviderOptions {
    n8nBaseUrl: string;
    webhookPath: string;
}
export declare class N8nExecutionProvider implements Provider {
    readonly metadata: ProviderMetadata;
    private n8nBaseUrl;
    private webhookPath;
    constructor(metadata: ProviderMetadata, options: N8nExecutionProviderOptions);
    healthCheck(): Promise<boolean>;
    configure(): Promise<void>;
    execute(prompt: string, context?: Record<string, unknown>): Promise<Record<string, unknown>>;
    run(executionId: string): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=N8nExecutionProvider.d.ts.map