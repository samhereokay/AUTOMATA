import { NotificationStateRepository } from '../NotificationStateRepository';
export declare class PostgresNotificationStateRepository implements NotificationStateRepository {
    private pool;
    private isClosed;
    constructor(connectionString: string);
    initialize(): Promise<void>;
    close(): Promise<void>;
    hasBeenSent(channel: string, canonicalNewsId: string): Promise<boolean>;
    markSent(channel: string, canonicalNewsId: string): Promise<void>;
}
//# sourceMappingURL=PostgresNotificationStateRepository.d.ts.map