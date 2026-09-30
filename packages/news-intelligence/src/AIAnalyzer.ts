import { NewsItem } from './types';
import { EvidenceValidator, ValidationResult } from './EvidenceValidator';

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
  item: Readonly<NewsItem>; // Original facts remain immutable
  validation: ValidationResult; // Evidence status remains immutable
  analysis?: AnalysisOutput; // AI analysis is optional (e.g. if provider fails)
}

export class AIAnalyzer {
  private validator: EvidenceValidator;

  constructor(private provider: AIProvider) {
    this.validator = new EvidenceValidator();
  }

  public async analyzeItem(item: Readonly<NewsItem>): Promise<AnalyzedNewsItem> {
    // 1. Validate the item first. Invalid items are rejected.
    const validation = this.validator.validate(item);
    if (!validation.valid || validation.status === 'invalid') {
      throw new Error(`Cannot analyze invalid item: ${validation.errors.join(', ')}`);
    }

    // 2. Prepare the input for the AI provider
    // We only provide the title and snippet to the AI to prevent it from inventing facts
    const contentToAnalyze = `Title: ${item.title}\nSnippet: ${item.metadata?.snippet || ''}`;

    try {
      // 3. Call the provider
      const response = await this.provider.analyze(contentToAnalyze);

      // 4. Parse the output securely
      // We expect the provider to return valid JSON matching AnalysisOutput
      let parsedAnalysis: unknown;
      try {
        parsedAnalysis = JSON.parse(response);
      } catch (e) {
        throw new Error('Malformed AI output: not valid JSON');
      }

      const analysis = this.validateAnalysisOutput(parsedAnalysis);

      // 5. Return the wrapper object without mutating the original item or evidence
      return {
        item: Object.freeze({ ...item }), // Ensure immutability
        validation: Object.freeze({ ...validation }),
        analysis
      };

    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Malformed AI output')) {
        throw e;
      }
      throw new Error(`Provider failure: ${(e as Error).message}`);
    }
  }

  private validateAnalysisOutput(data: any): AnalysisOutput {
    if (!data || typeof data !== 'object') {
      throw new Error('Malformed AI output: expected object');
    }
    
    if (typeof data.summary !== 'string') {
      throw new Error('Malformed AI output: missing or invalid summary');
    }
    
    if (!Array.isArray(data.keyPoints)) {
      throw new Error('Malformed AI output: missing or invalid keyPoints');
    }

    if (!Array.isArray(data.entities)) {
      throw new Error('Malformed AI output: missing or invalid entities');
    }

    if (!Array.isArray(data.technologies)) {
      throw new Error('Malformed AI output: missing or invalid technologies');
    }

    if (!Array.isArray(data.tags)) {
      throw new Error('Malformed AI output: missing or invalid tags');
    }

    return {
      summary: data.summary,
      keyPoints: data.keyPoints.filter((k: any) => typeof k === 'string'),
      category: typeof data.category === 'string' ? data.category : undefined,
      severity: ['low', 'medium', 'high', 'critical'].includes(data.severity) ? data.severity : undefined,
      entities: data.entities.filter((e: any) => typeof e === 'string'),
      technologies: data.technologies.filter((t: any) => typeof t === 'string'),
      impact: typeof data.impact === 'string' ? data.impact : undefined,
      tags: data.tags.filter((t: any) => typeof t === 'string')
    };
  }
}
