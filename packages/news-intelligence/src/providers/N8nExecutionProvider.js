"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8nExecutionProvider = void 0;
class N8nExecutionProvider {
    metadata;
    n8nBaseUrl;
    webhookPath;
    constructor(metadata, options) {
        this.metadata = metadata;
        this.n8nBaseUrl = options.n8nBaseUrl.replace(/\/$/, '');
        this.webhookPath = options.webhookPath.startsWith('/') ? options.webhookPath : `/${options.webhookPath}`;
    }
    async healthCheck() { return true; }
    async configure() { }
    async execute(prompt, context) {
        const url = `${this.n8nBaseUrl}${this.webhookPath}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, ...context })
            });
            if (!response.ok) {
                throw new Error(`N8n execution failed with status: ${response.status}`);
            }
            let result;
            const text = await response.text();
            try {
                result = JSON.parse(text);
            }
            catch (e) {
                result = text;
            }
            return { source: 'n8n', success: true, result };
        }
        catch (e) {
            throw new Error(`Failed to execute n8n workflow: ${e.message}`);
        }
    }
    async run(executionId) {
        return this.execute(`Run for executionId: ${executionId}`, { executionId });
    }
}
exports.N8nExecutionProvider = N8nExecutionProvider;
//# sourceMappingURL=N8nExecutionProvider.js.map