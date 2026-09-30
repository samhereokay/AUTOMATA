import { Deduplicator } from './Deduplicator';
import { EvidenceValidator } from './EvidenceValidator';
import { AIAnalyzer } from './AIAnalyzer';
import { NewsRepository } from './NewsRepository';
import { TelegramService } from './TelegramService';
export interface PipelineResult {
    collected: number;
    deduplicated: number;
    validated: number;
    analyzed: number;
    persisted: number;
    notified: number;
    failures: Error[];
}
export declare class NewsPipeline {
    private collectors;
    private deduplicator;
    private validator;
    private analyzer;
    private repository;
    private telegram;
    constructor(collectors: any[], deduplicator: Deduplicator, validator: EvidenceValidator, analyzer: AIAnalyzer, repository: NewsRepository, telegram: TelegramService);
    run(): Promise<PipelineResult>;
}
//# sourceMappingURL=NewsPipeline.d.ts.map