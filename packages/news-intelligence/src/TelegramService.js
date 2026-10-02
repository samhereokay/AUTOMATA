"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
class TelegramService {
    provider;
    stateRepo;
    defaultChatId;
    constructor(provider, stateRepo, defaultChatId) {
        this.provider = provider;
        this.stateRepo = stateRepo;
        this.defaultChatId = defaultChatId;
    }
    async notify(item, chatId) {
        const targetChatId = chatId || this.defaultChatId;
        const sent = await this.stateRepo.hasBeenSent('telegram', item.item.id);
        if (sent) {
            return false; // Already notified this canonical story
        }
        const message = this.formatMessage(item);
        await this.provider.sendMessage(targetChatId, message);
        await this.stateRepo.markSent('telegram', item.item.id);
        return true;
    }
    formatMessage(item) {
        const severityStr = item.analysis?.severity ? `[${item.analysis.severity.toUpperCase()}] ` : '';
        let message = `${severityStr}${item.item.title}\n\n`;
        if (item.analysis) {
            message += `${item.analysis.summary}\n\n`;
            if (item.analysis.keyPoints.length > 0) {
                message += `Key points:\n`;
                for (const kp of item.analysis.keyPoints) {
                    message += `• ${kp}\n`;
                }
                message += `\n`;
            }
        }
        else {
            message += `(No AI analysis available)\n\n`;
        }
        message += `Source: ${item.item.source}\n`;
        if (item.item.relatedSources && item.item.relatedSources.length > 0) {
            message += `Related Sources: ${item.item.relatedSources.join(', ')}\n`;
        }
        message += `Published: ${item.item.publishedAt || 'Unknown'}\n\n`;
        message += `Evidence: ${item.validation.status}`;
        return message;
    }
}
exports.TelegramService = TelegramService;
//# sourceMappingURL=TelegramService.js.map