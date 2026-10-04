import { Deduplicator } from './Deduplicator';
import { EvidenceValidator } from './EvidenceValidator';
import { AIAnalyzer } from './AIAnalyzer';
import { NewsRepository } from './NewsRepository';
import { TelegramService } from './TelegramService';
import { Provider, ProviderMetadata } from './core/Provider';
export interface PipelineResult {
    executionId?: string;
    collected: number;
    deduplicated: number;
    validated: number;
    analyzed: number;
    persisted: number;
    notified: number;
    failures: Error[];
    telegramConfigured: boolean;
}
export declare class NewsPipeline implements Provider {
    private collectors;
    private deduplicator;
    private validator;
    private analyzer;
    private repository;
    private telegram;
    readonly metadata: ProviderMetadata;
    constructor(collectors: any[], deduplicator: Deduplicator, validator: EvidenceValidator, analyzer: AIAnalyzer, repository: NewsRepository, telegram: TelegramService);
    healthCheck(): Promise<boolean>;
    configure(): Promise<void>;
    run(executionId?: string): Promise<PipelineResult>;
}
//# sourceMappingURL=NewsPipeline.d.ts.map