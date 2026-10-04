"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpTrigger = void 0;
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const logger_1 = require("./logger");
const crypto_1 = require("crypto");
class HttpTrigger {
    orchestrator;
    feedService;
    options;
    executionTracker;
    moduleRegistry;
    server = null;
    constructor(orchestrator, feedService, options, executionTracker, moduleRegistry) {
        this.orchestrator = orchestrator;
        this.feedService = feedService;
        this.options = options;
        this.executionTracker = executionTracker;
        this.moduleRegistry = moduleRegistry;
    }
    start() {
        return new Promise((resolve) => {
            this.server = http_1.default.createServer((req, res) => {
                const requestId = (0, crypto_1.randomUUID)();
                logger_1.logger.runWithContext({ requestId }, async () => {
                    const startTime = Date.now();
                    logger_1.logger.info('Incoming HTTP request', {
                        component: 'http',
                        event: 'http.request',
                        method: req.method,
                        route: req.url
                    });
                    // Intercept res.end to log response
                    const originalEnd = res.end.bind(res);
                    res.end = function (chunk, encoding, cb) {
                        const duration = Date.now() - startTime;
                        logger_1.logger.info('HTTP response', {
                            component: 'http',
                            event: 'http.response',
                            method: req.method,
                            route: req.url,
                            status: res.statusCode,
                            duration
                        });
                        return originalEnd(chunk, encoding, cb);
                    };
                    // CORS headers
                    const corsOrigin = this.options.corsOrigin || '*';
                    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
                    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                    if (req.method === 'OPTIONS') {
                        res.writeHead(204);
                        res.end();
                        return;
                    }
                    try {
                        const reqUrl = new url_1.URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
                        const path = reqUrl.pathname;
                        // ─── Public health endpoints (no auth) ─────────────────────────
                        if (req.method === 'GET' && path === '/health') {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
                            return;
                        }
                        if (req.method === 'GET' && path === '/ready') {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'ready', timestamp: new Date().toISOString() }));
                            return;
                        }
                        // ─── Module registry (public read) ──────────────────────────────
                        if (req.method === 'GET' && path === '/api/modules') {
                            await this.handleGetModules(res);
                            return;
                        }
                        if (req.method === 'GET' && path.startsWith('/api/modules/')) {
                            const id = decodeURIComponent(path.substring('/api/modules/'.length));
                            await this.handleGetModuleById(id, res);
                            return;
                        }
                        // ─── Execution API (all require auth) ───────────────────────────
                        if (path === '/api/executions' || path.startsWith('/api/executions/')) {
                            // Verify auth first
                            if (!this.authenticate(req)) {
                                res.writeHead(401, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Unauthorized' }));
                                return;
                            }
                            if (req.method === 'GET' && path === '/api/executions') {
                                await this.handleListExecutions(reqUrl, res);
                                return;
                            }
                            if (req.method === 'POST' && path === '/api/executions') {
                                await this.handlePostExecution(req, res);
                                return;
                            }
                            if (req.method === 'GET' && path.endsWith('/verification')) {
                                const id = decodeURIComponent(path.substring('/api/executions/'.length, path.length - '/verification'.length));
                                await this.handleGetExecutionVerification(id, res);
                                return;
                            }
                            if (req.method === 'GET' && path.startsWith('/api/executions/')) {
                                const id = decodeURIComponent(path.substring('/api/executions/'.length));
                                await this.handleGetExecutionById(id, res);
                                return;
                            }
                        }
                        // ─── News pipeline trigger (backward compat for n8n) ────────────
                        if (req.method === 'POST' && path === '/api/news/run') {
                            await this.handlePostRun(req, res);
                            return;
                        }
                        // ─── News feed read API (public) ────────────────────────────────
                        if (req.method === 'GET' && path === '/api/news') {
                            await this.handleGetNews(reqUrl, res);
                            return;
                        }
                        if (req.method === 'GET' && path === '/api/news/search') {
                            await this.handleSearchNews(reqUrl, res);
                            return;
                        }
                        if (req.method === 'GET' && path.startsWith('/api/news/')) {
                            const id = decodeURIComponent(path.substring('/api/news/'.length));
                            await this.handleGetNewsById(id, res);
                            return;
                        }
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Not found' }));
                    }
                    catch (error) {
                        logger_1.logger.error('Unhandled error in HttpTrigger', {
                            component: 'http',
                            event: 'http.error',
                            error
                        });
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal server error' }));
                    }
                });
            });
            this.server.listen(this.options.port, () => {
                resolve();
            });
        });
    }
    // ─── Auth helper ─────────────────────────────────────────────────────────
    authenticate(req) {
        const authHeader = req.headers['authorization'];
        return !!(authHeader && authHeader === `Bearer ${this.options.authToken}`);
    }
    // ─── POST /api/news/run — legacy n8n-compat endpoint ────────────────────
    async handlePostRun(req, res) {
        if (!this.authenticate(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        const prompt = 'Run cybersecurity news pipeline';
        const result = await this.orchestrator.executePrompt(prompt);
        if (result === null) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Pipeline is already running' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            execution_id: result.executionId || 'unknown',
            result: {
                ...result,
                failures: (result.failures || []).map(f => f.message)
            }
        }));
    }
    // ─── POST /api/executions — generic module trigger ────────────────────────
    async handlePostExecution(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        await new Promise(resolve => req.on('end', resolve));
        let parsed = {};
        try {
            if (body)
                parsed = JSON.parse(body);
        }
        catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            return;
        }
        const moduleId = parsed.module || 'cybersecurity-news';
        // Validate module exists and is active
        if (this.moduleRegistry) {
            const mod = this.moduleRegistry.getModule(moduleId);
            if (!mod) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Module '${moduleId}' not found` }));
                return;
            }
            if (mod.status !== 'active') {
                res.writeHead(422, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Module '${moduleId}' is not active (status: ${mod.status})` }));
                return;
            }
        }
        // Only cybersecurity-news is wired to an actual pipeline right now
        if (moduleId !== 'cybersecurity-news') {
            res.writeHead(422, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Module '${moduleId}' execution not yet implemented` }));
            return;
        }
        const prompt = parsed.prompt || `Execute module ${moduleId}`;
        const result = await this.orchestrator.executePrompt(prompt);
        if (result === null) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Pipeline is already running' }));
            return;
        }
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            execution_id: result.executionId || 'unknown',
            module: moduleId,
            status: (result.failures || []).length === 0 ? 'success' : 'partial',
            result: {
                ...result,
                failures: (result.failures || []).map(f => f.message)
            }
        }));
    }
    // ─── Verification builder ─────────────────────────────────────────────────
    buildVerification(result) {
        const checks = [];
        checks.push({ name: 'input_schema', status: 'pass' });
        if (result.collected > 0) {
            checks.push({ name: 'source_collection', status: 'pass', detail: `${result.collected} items collected` });
        }
        else {
            checks.push({ name: 'source_collection', status: 'fail', detail: 'No items collected' });
        }
        checks.push({
            name: 'deduplication',
            status: result.deduplicated >= 0 ? 'pass' : 'skip',
            detail: `${result.deduplicated} unique items`
        });
        if (result.analyzed > 0) {
            checks.push({ name: 'ai_analysis', status: 'pass', detail: `${result.analyzed} analyzed` });
        }
        else if (result.validated > 0) {
            checks.push({ name: 'ai_analysis', status: 'fail', detail: 'Analysis failed for all items' });
        }
        else {
            checks.push({ name: 'ai_analysis', status: 'skip', detail: 'No items to analyze' });
        }
        if (result.persisted > 0) {
            checks.push({ name: 'persistence', status: 'pass', detail: `${result.persisted} saved` });
        }
        else {
            checks.push({ name: 'persistence', status: result.validated > 0 ? 'fail' : 'skip', detail: '0 saved' });
        }
        // Telegram: distinguish skip (not configured) from fail (configured but errored)
        const telegramFailures = result.failures.filter(f => f.message.includes('Telegram'));
        if (!result.telegramConfigured) {
            checks.push({ name: 'telegram', status: 'skip', detail: 'credentials not configured' });
        }
        else if (telegramFailures.length > 0) {
            checks.push({ name: 'telegram', status: 'fail', detail: `${telegramFailures.length} notification failure(s)` });
        }
        else {
            checks.push({ name: 'telegram', status: 'pass', detail: `${result.notified} sent` });
        }
        const passCount = checks.filter(c => c.status === 'pass').length;
        const failCount = checks.filter(c => c.status === 'fail').length;
        const skipCount = checks.filter(c => c.status === 'skip').length;
        const verification = { passed: failCount === 0, checks, passCount, failCount, skipCount };
        const notifications = [
            {
                channel: 'telegram',
                status: !result.telegramConfigured ? 'skipped' : telegramFailures.length > 0 ? 'failed' : 'sent',
                detail: !result.telegramConfigured ? 'credentials not configured' : undefined,
                count: result.notified
            }
        ];
        return { verification, notifications };
    }
    // ─── GET /api/modules ─────────────────────────────────────────────────────
    async handleGetModules(res) {
        if (!this.moduleRegistry) {
            res.writeHead(501, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Module registry not available' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ modules: this.moduleRegistry.listModules() }));
    }
    async handleGetModuleById(id, res) {
        if (!this.moduleRegistry) {
            res.writeHead(501, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Module registry not available' }));
            return;
        }
        const mod = this.moduleRegistry.getModule(id);
        if (!mod) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Module '${id}' not found` }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mod));
    }
    // ─── GET /api/executions ──────────────────────────────────────────────────
    async handleListExecutions(reqUrl, res) {
        if (!this.executionTracker) {
            res.writeHead(501, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Execution tracker not available' }));
            return;
        }
        const options = {};
        if (reqUrl.searchParams.has('module'))
            options.module = reqUrl.searchParams.get('module');
        if (reqUrl.searchParams.has('status')) {
            const s = reqUrl.searchParams.get('status');
            const valid = ['pending', 'running', 'success', 'failure', 'partial'];
            if (!valid.includes(s)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Invalid status. Must be one of: ${valid.join(', ')}` }));
                return;
            }
            options.status = s;
        }
        if (reqUrl.searchParams.has('limit')) {
            const l = parseInt(reqUrl.searchParams.get('limit'), 10);
            if (isNaN(l) || l < 1 || l > 100) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'limit must be between 1 and 100' }));
                return;
            }
            options.limit = l;
        }
        if (reqUrl.searchParams.has('offset')) {
            const o = parseInt(reqUrl.searchParams.get('offset'), 10);
            if (isNaN(o) || o < 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'offset must be >= 0' }));
                return;
            }
            options.offset = o;
        }
        const executions = await this.executionTracker.listExecutions(options);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ executions }));
    }
    // ─── GET /api/executions/:id ──────────────────────────────────────────────
    async handleGetExecutionById(id, res) {
        if (!this.executionTracker) {
            res.writeHead(501, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Execution tracker not available' }));
            return;
        }
        if (!id || id.trim() === '') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid execution ID' }));
            return;
        }
        const execution = await this.executionTracker.getExecution(id);
        if (!execution) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Execution '${id}' not found` }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(execution));
    }
    // ─── GET /api/executions/:id/verification ─────────────────────────────────
    async handleGetExecutionVerification(id, res) {
        if (!this.executionTracker) {
            res.writeHead(501, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Execution tracker not available' }));
            return;
        }
        const execution = await this.executionTracker.getExecution(id);
        if (!execution) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Execution '${id}' not found` }));
            return;
        }
        if (!execution.verification) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Verification not yet available for this execution' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(execution.verification));
    }
    // ─── News feed read endpoints ─────────────────────────────────────────────
    parseFilterOptions(reqUrl) {
        const options = {};
        if (reqUrl.searchParams.has('category'))
            options.category = reqUrl.searchParams.get('category');
        if (reqUrl.searchParams.has('source'))
            options.source = reqUrl.searchParams.get('source');
        if (reqUrl.searchParams.has('severity'))
            options.severity = reqUrl.searchParams.get('severity');
        if (reqUrl.searchParams.has('tags')) {
            options.tags = reqUrl.searchParams.get('tags').split(',').map(s => s.trim()).filter(s => s);
        }
        if (reqUrl.searchParams.has('limit')) {
            const limit = parseInt(reqUrl.searchParams.get('limit'), 10);
            if (isNaN(limit) || limit < 1 || limit > 100)
                throw new Error('Invalid limit parameter');
            options.limit = limit;
        }
        if (reqUrl.searchParams.has('page')) {
            const page = parseInt(reqUrl.searchParams.get('page'), 10);
            if (isNaN(page) || page < 1)
                throw new Error('Invalid page parameter');
            const limit = options.limit || 10;
            options.offset = (page - 1) * limit;
        }
        return options;
    }
    async handleGetNews(reqUrl, res) {
        try {
            const options = this.parseFilterOptions(reqUrl);
            const result = await this.feedService.getLatest(options);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        }
        catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Bad Request' }));
        }
    }
    async handleSearchNews(reqUrl, res) {
        try {
            const query = reqUrl.searchParams.get('query');
            if (!query)
                throw new Error('Missing query parameter');
            const options = this.parseFilterOptions(reqUrl);
            const result = await this.feedService.search(query, options);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        }
        catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Bad Request' }));
        }
    }
    async handleGetNewsById(id, res) {
        const item = await this.feedService.getById(id);
        if (!item) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Item not found' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(item));
    }
    stop() {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((err) => {
                    if (err)
                        reject(err);
                    else {
                        this.server = null;
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
}
exports.HttpTrigger = HttpTrigger;
//# sourceMappingURL=HttpTrigger.js.map