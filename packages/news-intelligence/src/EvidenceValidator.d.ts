import { NewsItem } from './types';
export type EvidenceStatus = 'verified' | 'unverified' | 'invalid';
export interface ValidationResult {
    valid: boolean;
    status: EvidenceStatus;
    errors: string[];
    warnings: string[];
}
export declare class EvidenceValidator {
    /**
     * Validates a NewsItem's evidence without mutating the item.
     * Returns a structured ValidationResult.
     */
    validate(item: Readonly<NewsItem>): ValidationResult;
    private isValidIsoDate;
}
//# sourceMappingURL=EvidenceValidator.d.ts.map