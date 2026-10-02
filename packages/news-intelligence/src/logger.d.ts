export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LogContext {
    requestId?: string;
    [key: string]: any;
}
export declare class Logger {
    private als;
    private minLevel;
    private allowlistedConfigFields;
    constructor(level?: LogLevel);
    setLevel(level: LogLevel): void;
    runWithContext<T>(context: LogContext, fn: () => T): T;
    private redact;
    private formatError;
    private log;
    debug(message: string, meta?: Record<string, any>): void;
    info(message: string, meta?: Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    error(message: string, meta?: Record<string, any>): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map