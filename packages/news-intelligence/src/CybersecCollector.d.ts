import { SourceRegistry } from './SourceRegistry';
import { NewsItem } from './types';
export declare class CybersecCollector {
    private registry;
    constructor(registry: SourceRegistry);
    collect(): Promise<NewsItem[]>;
    private fetchSourceSafe;
}
//# sourceMappingURL=CybersecCollector.d.ts.map