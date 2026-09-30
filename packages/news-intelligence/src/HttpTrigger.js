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
    server = null;
    constructor(orchestrator, feedService, options) {
        this.orchestrator = orchestrator;
        this.feedService = feedService;
        this.options = options;
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
                    // CORS headers for public API consumption
                    res.setHeader('Access-Control-Allow-Origin', '*');
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
                        if (req.method === 'POST' && path === '/api/news/run') {
                            await this.handlePostRun(req, res);
                            return;
                        }
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
    async handlePostRun(req, res) {
        const authHeader = req.headers['authorization'];
        if (!authHeader || authHeader !== `Bearer ${this.options.authToken}`) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        const result = await this.orchestrator.run();
        if (result === null) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Pipeline is already running' }));
            return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result }));
    }
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