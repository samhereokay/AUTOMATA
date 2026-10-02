export type NodeEnv = 'development' | 'test' | 'production';
export interface Config {
    env: NodeEnv;
    port: number;
    apiAuthToken: string;
    corsOrigin: string;
    databaseUrl: string;
    testDatabaseUrl?: string;
    ollamaBaseUrl: string;
    ollamaModel: string;
    telegramBotToken?: string;
    telegramChatId?: string;
    pipelineIntervalMs: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
export declare function loadConfig(envData?: NodeJS.ProcessEnv): Readonly<Config>;
//# sourceMappingURL=config.d.ts.map