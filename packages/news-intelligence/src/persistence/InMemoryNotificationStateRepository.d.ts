import { NotificationStateRepository } from '../NotificationStateRepository';
export declare class InMemoryNotificationStateRepository implements NotificationStateRepository {
    private sent;
    initialize(): Promise<void>;
    close(): Promise<void>;
    private getKey;
    hasBeenSent(channel: string, canonicalNewsId: string): Promise<boolean>;
    markSent(channel: string, canonicalNewsId: string): Promise<void>;
}
//# sourceMappingURL=InMemoryNotificationStateRepository.d.ts.map