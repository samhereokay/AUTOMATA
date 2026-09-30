"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
const async_hooks_1 = require("async_hooks");
const LogLevelWeights = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};
class Logger {
    als = new async_hooks_1.AsyncLocalStorage();
    minLevel;
    allowlistedConfigFields = ['port', 'nodeEnv', 'schedulerIntervalMs', 'logLevel', 'corsOrigin'];
    constructor(level = 'info') {
        this.minLevel = LogLevelWeights[level];
    }
    setLevel(level) {
        this.minLevel = LogLevelWeights[level];
    }
    runWithContext(context, fn) {
        return this.als.run(context, fn);
    }
    redact(obj) {
        if (typeof obj !== 'object' || obj === null)
            return obj;
        const redacted = { ...obj };
        const sensitiveKeys = ['token', 'password', 'secret', 'auth', 'databaseurl', 'api_key'];
        for (const key in redacted) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
                redacted[key] = '[REDACTED]';
            }
        }
        return redacted;
    }
    formatError(err) {
        if (err instanceof Error) {
            return {
                name: err.name,
                message: err.message,
                stack: err.stack
            };
        }
        return err;
    }
    log(level, message, meta = {}) {
        if (LogLevelWeights[level] < this.minLevel)
            return;
        const context = this.als.getStore() || {};
        let safeMeta = { ...meta };
        if (safeMeta.config) {
            const safeConfig = {};
            for (const key of this.allowlistedConfigFields) {
                if (key in safeMeta.config) {
                    safeConfig[key] = safeMeta.config[key];
                }
            }
            safeMeta.config = safeConfig;
        }
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...context,
            ...this.redact(safeMeta)
        };
        if (logEntry.error) {
            logEntry.error = this.formatError(logEntry.error);
        }
        const logString = JSON.stringify(logEntry);
        if (level === 'error' || level === 'warn') {
            console.error(logString);
        }
        else {
            console.log(logString);
        }
    }
    debug(message, meta) {
        this.log('debug', message, meta);
    }
    info(message, meta) {
        this.log('info', message, meta);
    }
    warn(message, meta) {
        this.log('warn', message, meta);
    }
    error(message, meta) {
        this.log('error', message, meta);
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map