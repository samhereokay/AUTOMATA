import { EmbeddingProvider } from './EmbeddingProvider';
import { ProviderMetadata } from '../core/Provider';
export declare class LocalEmbeddingProvider implements EmbeddingProvider {
    provider: string;
    model: string;
    dimensions: number;
    availability: 'AVAILABLE' | 'UNAVAILABLE';
    private baseUrl;
    readonly metadata: ProviderMetadata;
    constructor(baseUrl?: string);
    healthCheck(): Promise<boolean>;
    configure(): Promise<void>;
    execute(prompt: string, context?: Record<string, unknown>): Promise<Record<string, unknown>>;
    embedBatch(texts: string[]): Promise<number[][]>;
    init(): Promise<void>;
    embed(text: string): Promise<number[]>;
    health(): 'AVAILABLE' | 'UNAVAILABLE';
}
//# sourceMappingURL=LocalEmbeddingProvider.d.ts.map