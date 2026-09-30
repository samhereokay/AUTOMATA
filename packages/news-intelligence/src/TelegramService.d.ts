import { AnalyzedNewsItem } from './AIAnalyzer';
import { NotificationStateRepository } from './NotificationStateRepository';
export interface TelegramProvider {
    sendMessage(chatId: string, message: string): Promise<void>;
}
export declare class TelegramService {
    private provider;
    private stateRepo;
    private defaultChatId;
    constructor(provider: TelegramProvider, stateRepo: NotificationStateRepository, defaultChatId: string);
    notify(item: AnalyzedNewsItem, chatId?: string): Promise<boolean>;
    formatMessage(item: AnalyzedNewsItem): string;
}
//# sourceMappingURL=TelegramService.d.ts.map