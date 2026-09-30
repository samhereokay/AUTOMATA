import { NewsItem } from './types';
import { ValidationResult } from './EvidenceValidator';
export interface AIProvider {
    analyze(input: string): Promise<string>;
}
export interface AnalysisOutput {
    summary: string;
    keyPoints: string[];
    category?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    entities: string[];
    technologies: string[];
    impact?: string;
    tags: string[];
}
export interface AnalyzedNewsItem {
    item: Readonly<NewsItem>;
    validation: ValidationResult;
    analysis?: AnalysisOutput;
}
export declare class AIAnalyzer {
    private provider;
    private validator;
    constructor(provider: AIProvider);
    analyzeItem(item: Readonly<NewsItem>): Promise<AnalyzedNewsItem>;
    private validateAnalysisOutput;
}
//# sourceMappingURL=AIAnalyzer.d.ts.map