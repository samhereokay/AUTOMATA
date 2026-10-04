import { AnalyzedNewsItem } from './AIAnalyzer';
import { NotificationStateRepository } from './NotificationStateRepository';
export interface TelegramProvider {
    sendMessage(chatId: string, message: string): Promise<void>;
    isConfigured(): boolean;
}
export declare class TelegramService {
    private provider;
    private stateRepo;
    private defaultChatId;
    constructor(provider: TelegramProvider, stateRepo: NotificationStateRepository, defaultChatId: string);
    /**
     * Returns true if the Telegram provider is configured with credentials.
     * Used to distinguish 'skipped' from 'failed' in verification.
     */
    isConfigured(): boolean;
    /**
     * Send a notification for a single analyzed news item.
     * Returns true if sent, false if already sent (dedup) or skipped.
     * Throws if configured but delivery fails.
     */
    notify(item: AnalyzedNewsItem, executionId?: string, chatId?: string): Promise<boolean>;
    /**
     * Format a news item as the canonical Automation OS Telegram alert.
     * Follows the spec template: 🔐 CYBERSECURITY ALERT header.
     * Fields absent from AI analysis are shown as 'Not provided'.
     */
    formatMessage(item: AnalyzedNewsItem, executionId?: string): string;
}
//# sourceMappingURL=TelegramService.d.ts.map