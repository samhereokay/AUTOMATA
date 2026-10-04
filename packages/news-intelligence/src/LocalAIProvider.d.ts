import { AIProvider } from './AIAnalyzer';
export interface LocalAIProviderOptions {
    baseUrl?: string;
    model?: string;
    timeoutMs?: number;
    fetchFn?: typeof fetch;
}
export declare class LocalAIProvider implements AIProvider {
    private baseUrl;
    private model;
    private timeoutMs;
    private fetchFn;
    constructor(options?: LocalAIProviderOptions);
    healthCheck(): Promise<boolean>;
    generate(prompt: string): Promise<string>;
    executePrompt(messages: {
        role: string;
        content: string;
    }[]): Promise<string>;
    analyze(input: string): Promise<string>;
}
//# sourceMappingURL=LocalAIProvider.d.ts.map