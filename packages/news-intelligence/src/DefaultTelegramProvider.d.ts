import { TelegramProvider } from './TelegramService';
export declare class DefaultTelegramProvider implements TelegramProvider {
    private token;
    constructor(token: string);
    sendMessage(chatId: string, message: string): Promise<void>;
}
//# sourceMappingURL=DefaultTelegramProvider.d.ts.map