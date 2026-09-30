export interface NotificationStateRepository {
    /**
     * Initialize the repository (e.g. create tables)
     */
    initialize(): Promise<void>;
    /**
     * Close the repository connection
     */
    close(): Promise<void>;
    /**
     * Check if a notification has already been sent to this channel for this canonical story.
     */
    hasBeenSent(channel: string, canonicalNewsId: string): Promise<boolean>;
    /**
     * Mark a notification as sent for this channel and canonical story.
     * This should be idempotent.
     */
    markSent(channel: string, canonicalNewsId: string): Promise<void>;
}
//# sourceMappingURL=NotificationStateRepository.d.ts.map