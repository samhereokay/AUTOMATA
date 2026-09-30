import { AsyncLocalStorage } from 'async_hooks';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LogLevelWeights: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

interface LogContext {
  requestId?: string;
  [key: string]: any;
}

export class Logger {
  private als = new AsyncLocalStorage<LogContext>();
  private minLevel: number;
  private allowlistedConfigFields = ['port', 'nodeEnv', 'schedulerIntervalMs', 'logLevel', 'corsOrigin'];

  constructor(level: LogLevel = 'info') {
    this.minLevel = LogLevelWeights[level];
  }

  public setLevel(level: LogLevel) {
    this.minLevel = LogLevelWeights[level];
  }

  public runWithContext<T>(context: LogContext, fn: () => T): T {
    return this.als.run(context, fn);
  }

  private redact(obj: any): any {
    if (typeof obj !== 'object' || obj === null) return obj;
    const redacted = { ...obj };
    const sensitiveKeys = ['token', 'password', 'secret', 'auth', 'databaseurl', 'api_key'];
    for (const key in redacted) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        redacted[key] = '[REDACTED]';
      }
    }
    return redacted;
  }

  private formatError(err: unknown): any {
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack
      };
    }
    return err;
  }

  private log(level: LogLevel, message: string, meta: Record<string, any> = {}) {
    if (LogLevelWeights[level] < this.minLevel) return;

    const context = this.als.getStore() || {};
    
    let safeMeta = { ...meta };
    if (safeMeta.config) {
       const safeConfig: Record<string, any> = {};
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
    } else {
      console.log(logString);
    }
  }

  public debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  public info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  public error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta);
  }
}

export const logger = new Logger();
