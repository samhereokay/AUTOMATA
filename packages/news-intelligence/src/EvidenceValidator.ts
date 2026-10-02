import { NewsItem } from './types';

export type EvidenceStatus = 'verified' | 'unverified' | 'invalid';

export interface ValidationResult {
  valid: boolean;
  status: EvidenceStatus;
  errors: string[];
  warnings: string[];
}

export class EvidenceValidator {
  
  /**
   * Validates a NewsItem's evidence without mutating the item.
   * Returns a structured ValidationResult.
   */
  public validate(item: Readonly<NewsItem>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate required core fields
    if (!item.id || item.id.trim() === '') {
      errors.push('Missing or empty id');
    }
    if (!item.title || item.title.trim() === '') {
      errors.push('Missing or empty title');
    }
    if (!item.source || item.source.trim() === '') {
      errors.push('Missing or empty source');
    }
    if (!item.collectedAt || item.collectedAt.trim() === '') {
      errors.push('Missing or empty collectedAt');
    } else {
      if (!this.isValidIsoDate(item.collectedAt)) {
        errors.push(`Invalid collectedAt timestamp: ${item.collectedAt}`);
      }
    }

    // 2. Validate URL
    if (!item.url || item.url.trim() === '') {
      errors.push('Missing or empty url');
    } else {
      try {
        const u = new URL(item.url);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          errors.push(`Non-http(s) URL protocol: ${u.protocol}`);
        }
      } catch {
        errors.push(`Invalid URL format: ${item.url}`);
      }
    }

    // 3. Validate publishedAt
    let hasPublishedAt = false;
    if (item.publishedAt !== null && item.publishedAt !== undefined) {
      if (item.publishedAt.trim() === '') {
        warnings.push('publishedAt is an empty string');
      } else if (!this.isValidIsoDate(item.publishedAt)) {
        errors.push(`Invalid publishedAt timestamp: ${item.publishedAt}`);
      } else {
        hasPublishedAt = true;
      }
    } else {
      warnings.push('Missing publishedAt evidence');
    }

    // 4. Determine Status
    let status: EvidenceStatus;
    let valid: boolean;

    if (errors.length > 0) {
      status = 'invalid';
      valid = false;
    } else if (!hasPublishedAt) {
      // Usable, but lacks sufficient evidence (e.g. publication date) for full verification
      status = 'unverified';
      valid = true;
    } else {
      // All core required evidence is present and valid
      status = 'verified';
      valid = true;
    }

    return {
      valid,
      status,
      errors,
      warnings
    };
  }

  private isValidIsoDate(dateStr: string): boolean {
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  }
}
