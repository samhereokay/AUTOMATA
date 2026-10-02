"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedService = void 0;
class FeedService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async getLatest(options) {
        // In a real DB, these filters and sorts would be pushed down to the SQL/NoSQL query.
        // For this generic interface relying on the repository's simple list() method, 
        // we fetch and filter in-memory.
        const all = await this.repository.list();
        const filtered = this.applyFilters(all, options);
        const sorted = this.sortItems(filtered);
        return this.paginate(sorted, options);
    }
    async getById(id) {
        return this.repository.getById(id);
    }
    async search(query, options) {
        const all = await this.repository.list();
        const q = query.toLowerCase();
        const matched = all.filter(record => {
            const titleMatch = record.item.title.toLowerCase().includes(q);
            const summaryMatch = record.analysis?.summary?.toLowerCase().includes(q) || false;
            const keyPointsMatch = record.analysis?.keyPoints?.some(kp => kp.toLowerCase().includes(q)) || false;
            return titleMatch || summaryMatch || keyPointsMatch;
        });
        const filtered = this.applyFilters(matched, options);
        const sorted = this.sortItems(filtered);
        return this.paginate(sorted, options);
    }
    applyFilters(items, options) {
        if (!options)
            return items;
        return items.filter(record => {
            if (options.category && record.item.category !== options.category)
                return false;
            if (options.source && record.item.source !== options.source)
                return false;
            if (options.severity && record.analysis?.severity !== options.severity)
                return false;
            if (options.tags && options.tags.length > 0) {
                if (!record.analysis?.tags)
                    return false;
                const hasAllTags = options.tags.every(tag => record.analysis.tags.includes(tag));
                if (!hasAllTags)
                    return false;
            }
            return true;
        });
    }
    sortItems(items) {
        return items.sort((a, b) => {
            const dateA = a.item.publishedAt ? new Date(a.item.publishedAt).getTime() : 0;
            const dateB = b.item.publishedAt ? new Date(b.item.publishedAt).getTime() : 0;
            if (dateA !== dateB)
                return dateB - dateA;
            const colA = new Date(a.item.collectedAt).getTime();
            const colB = new Date(b.item.collectedAt).getTime();
            if (colA !== colB)
                return colB - colA;
            return a.item.id.localeCompare(b.item.id);
        });
    }
    paginate(items, options) {
        const limit = options?.limit && options.limit > 0 ? options.limit : 10;
        const offset = Math.max(0, options?.offset || 0);
        const total = items.length;
        const paginatedItems = items.slice(offset, offset + limit);
        return {
            items: paginatedItems,
            pagination: {
                limit,
                offset,
                total
            }
        };
    }
}
exports.FeedService = FeedService;
//# sourceMappingURL=FeedService.js.map