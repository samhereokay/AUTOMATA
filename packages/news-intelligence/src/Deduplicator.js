"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deduplicator = void 0;
class Deduplicator {
    /**
     * Deduplicates an array of NewsItems.
     * Preserves evidence of duplicate sources by populating the `relatedSources` array.
     */
    deduplicate(items) {
        const uniqueItems = [];
        for (const item of items) {
            let isDuplicate = false;
            for (const existing of uniqueItems) {
                if (this.isMatch(item, existing)) {
                    isDuplicate = true;
                    this.mergeDuplicate(existing, item);
                    break;
                }
            }
            if (!isDuplicate) {
                uniqueItems.push({ ...item });
            }
        }
        return uniqueItems;
    }
    /**
     * Determines if two items represent the same underlying story.
     * Uses deterministic signals: ID, Normalized URL, and Normalized Title.
     */
    isMatch(a, b) {
        // 1. Exact ID match (mostly for deduplicating identical items from the same source)
        if (a.id === b.id)
            return true;
        // 2. Normalized URL match
        if (this.normalizeUrl(a.url) === this.normalizeUrl(b.url))
            return true;
        // 3. Normalized Title match
        if (this.normalizeTitle(a.title) === this.normalizeTitle(b.title))
            return true;
        return false;
    }
    /**
     * Merges evidence from a duplicate item into the existing item.
     * Never silently deletes evidence of multiple sources.
     */
    mergeDuplicate(existing, duplicate) {
        if (!existing.relatedSources) {
            existing.relatedSources = [existing.source];
        }
        if (!existing.relatedSources.includes(duplicate.source)) {
            existing.relatedSources.push(duplicate.source);
        }
        // Optionally, if the duplicate has a publishedAt that is earlier, we could take it.
        // For now, we preserve the primary item and track the related sources.
    }
    normalizeUrl(urlStr) {
        try {
            const u = new URL(urlStr);
            // Strip common tracking parameters
            const paramsToDelete = [];
            u.searchParams.forEach((_, key) => {
                if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
                    paramsToDelete.push(key);
                }
            });
            paramsToDelete.forEach(k => u.searchParams.delete(k));
            let normalized = u.origin + u.pathname + u.search;
            // Remove trailing slash
            if (normalized.endsWith('/')) {
                normalized = normalized.slice(0, -1);
            }
            return normalized.toLowerCase();
        }
        catch {
            return urlStr.toLowerCase();
        }
    }
    normalizeTitle(title) {
        // Lowercase and remove all non-alphanumeric characters for a strong structural match
        return title.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
}
exports.Deduplicator = Deduplicator;
//# sourceMappingURL=Deduplicator.js.map