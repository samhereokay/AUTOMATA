"use strict";
/**
 * ModuleRegistry — central registry of all Automation OS modules.
 * Extends the workflow-registry pattern to include runtime status and API metadata.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleRegistry = void 0;
class ModuleRegistry {
    modules = new Map();
    constructor() {
        this.seed();
    }
    seed() {
        const modules = [
            {
                id: 'cybersecurity-news',
                name: 'Cybersecurity News',
                version: '1.0.0',
                status: 'active',
                description: 'Collects, deduplicates, AI-analyzes, and persists cybersecurity news from ' +
                    'authoritative RSS sources. Sends structured Telegram alerts when configured.',
                capabilities: [
                    'collect_news',
                    'deduplicate',
                    'ai_analysis',
                    'persist',
                    'notify_telegram'
                ],
                permissions: ['network', 'database', 'telegram'],
                inputSchema: {
                    type: 'object',
                    properties: {
                        categories: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Not yet used — all cybersec categories collected by default'
                        },
                        max_items: {
                            type: 'integer',
                            description: 'Not yet used — collector returns all available items'
                        },
                        notify: {
                            type: 'boolean',
                            description: 'Not yet used — notification is automatic when Telegram is configured'
                        }
                    }
                },
                outputSchema: {
                    type: 'object',
                    properties: {
                        execution_id: { type: 'string' },
                        status: { type: 'string', enum: ['success', 'partial', 'failure'] },
                        items_collected: { type: 'integer' },
                        items_deduplicated: { type: 'integer' },
                        items_validated: { type: 'integer' },
                        items_analyzed: { type: 'integer' },
                        items_persisted: { type: 'integer' },
                        items_notified: { type: 'integer' },
                        verification: { type: 'object' }
                    },
                    required: ['execution_id', 'status']
                },
                schedule: 'hourly'
            },
            {
                id: 'forex-news',
                name: 'Forex / Market News',
                version: '0.0.0',
                status: 'coming-soon',
                description: 'Market news and price alerts for XAUUSD, EURUSD, USDJPY, BTC and more.',
                capabilities: ['collect_market_news', 'price_alerts', 'notify_telegram'],
                permissions: ['network', 'database', 'telegram'],
                inputSchema: {},
                outputSchema: {}
            },
            {
                id: 'price-alerts',
                name: 'Price & News Alerts',
                version: '0.0.0',
                status: 'coming-soon',
                description: 'Threshold-based price alerts with configurable cooldown periods.',
                capabilities: ['price_alerts', 'notify_telegram'],
                permissions: ['network', 'database', 'telegram'],
                inputSchema: {},
                outputSchema: {}
            },
            {
                id: 'researcher',
                name: 'Researcher',
                version: '0.0.0',
                status: 'coming-soon',
                description: 'AI-powered research assistant with source validation and citation.',
                capabilities: ['web_research', 'source_validation', 'synthesis', 'citations'],
                permissions: ['network', 'database'],
                inputSchema: {},
                outputSchema: {}
            },
            {
                id: 'coder-auditor',
                name: 'Coder–Auditor–Debugger',
                version: '0.0.0',
                status: 'coming-soon',
                description: 'Static analysis, security audit, bug detection and patch proposal for code repositories.',
                capabilities: ['static_analysis', 'security_audit', 'test_execution', 'patch_proposal'],
                permissions: ['network', 'database', 'filesystem'],
                inputSchema: {},
                outputSchema: {}
            },
            {
                id: 'ssma-poster',
                name: 'SSMA Poster',
                version: '0.0.0',
                status: 'coming-soon',
                description: 'AI-assisted social media asset generation from a brief.',
                capabilities: ['content_generation', 'asset_generation', 'export'],
                permissions: ['network', 'database'],
                inputSchema: {},
                outputSchema: {}
            },
            {
                id: 'figma-workflow',
                name: 'Figma Workflow',
                version: '0.0.0',
                status: 'coming-soon',
                description: 'Design specification to Figma component automation.',
                capabilities: ['figma_design', 'asset_export', 'handoff'],
                permissions: ['network', 'database'],
                inputSchema: {},
                outputSchema: {}
            },
            {
                id: 'video-maker',
                name: 'Video Maker',
                version: '0.0.0',
                status: 'coming-soon',
                description: 'Script-to-video pipeline with scene planning, voice, and render.',
                capabilities: ['script_generation', 'video_composition', 'audio', 'render', 'export'],
                permissions: ['network', 'database', 'filesystem'],
                inputSchema: {},
                outputSchema: {}
            }
        ];
        modules.forEach(m => this.modules.set(m.id, m));
    }
    getModule(id) {
        return this.modules.get(id);
    }
    registerModule(moduleDef) {
        this.modules.set(moduleDef.id, moduleDef);
    }
    listModules() {
        return Array.from(this.modules.values());
    }
    listActiveModules() {
        return this.listModules().filter(m => m.status === 'active');
    }
}
exports.ModuleRegistry = ModuleRegistry;
//# sourceMappingURL=ModuleRegistry.js.map