"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAnalyzer = void 0;
const EvidenceValidator_1 = require("./EvidenceValidator");
class AIAnalyzer {
    provider;
    validator;
    constructor(provider) {
        this.provider = provider;
        this.validator = new EvidenceValidator_1.EvidenceValidator();
    }
    async analyzeItem(item) {
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
            let parsedAnalysis;
            try {
                parsedAnalysis = JSON.parse(response);
            }
            catch (e) {
                throw new Error('Malformed AI output: not valid JSON');
            }
            const analysis = this.validateAnalysisOutput(parsedAnalysis);
            // 5. Return the wrapper object without mutating the original item or evidence
            return {
                item: Object.freeze({ ...item }), // Ensure immutability
                validation: Object.freeze({ ...validation }),
                analysis
            };
        }
        catch (e) {
            if (e instanceof Error && e.message.startsWith('Malformed AI output')) {
                throw e;
            }
            throw new Error(`Provider failure: ${e.message}`);
        }
    }
    validateAnalysisOutput(data) {
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
            keyPoints: data.keyPoints.filter((k) => typeof k === 'string'),
            category: typeof data.category === 'string' ? data.category : undefined,
            severity: ['low', 'medium', 'high', 'critical'].includes(data.severity) ? data.severity : undefined,
            entities: data.entities.filter((e) => typeof e === 'string'),
            technologies: data.technologies.filter((t) => typeof t === 'string'),
            impact: typeof data.impact === 'string' ? data.impact : undefined,
            tags: data.tags.filter((t) => typeof t === 'string')
        };
    }
}
exports.AIAnalyzer = AIAnalyzer;
//# sourceMappingURL=AIAnalyzer.js.map