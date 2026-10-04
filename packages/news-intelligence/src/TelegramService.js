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
    /**
     * Returns true if the Telegram provider is configured with credentials.
     * Used to distinguish 'skipped' from 'failed' in verification.
     */
    isConfigured() {
        return this.provider.isConfigured();
    }
    /**
     * Send a notification for a single analyzed news item.
     * Returns true if sent, false if already sent (dedup) or skipped.
     * Throws if configured but delivery fails.
     */
    async notify(item, executionId, chatId) {
        const targetChatId = chatId || this.defaultChatId;
        const sent = await this.stateRepo.hasBeenSent('telegram', item.item.id);
        if (sent) {
            return false; // Already notified this canonical story
        }
        const message = this.formatMessage(item, executionId);
        await this.provider.sendMessage(targetChatId, message);
        await this.stateRepo.markSent('telegram', item.item.id);
        return true;
    }
    /**
     * Format a news item as the canonical Automation OS Telegram alert.
     * Follows the spec template: 🔐 CYBERSECURITY ALERT header.
     * Fields absent from AI analysis are shown as 'Not provided'.
     */
    formatMessage(item, executionId) {
        const na = 'Not provided';
        const severity = item.analysis?.severity
            ? item.analysis.severity.charAt(0).toUpperCase() + item.analysis.severity.slice(1)
            : na;
        const category = item.item.category
            ? item.item.category.charAt(0).toUpperCase() + item.item.category.slice(1).replace(/-/g, ' ')
            : na;
        const published = item.item.publishedAt
            ? new Date(item.item.publishedAt).toUTCString()
            : 'Unknown';
        // 'Why it matters' comes from AI key points, grounded in source content
        const whyItMatters = item.analysis?.keyPoints && item.analysis.keyPoints.length > 0
            ? item.analysis.keyPoints[0]
            : na;
        const summary = item.analysis?.summary || na;
        let message = `🔐 CYBERSECURITY ALERT\n\n`;
        message += `Title:\n${item.item.title}\n\n`;
        message += `Category:\n${category}\n\n`;
        message += `Severity:\n${severity}\n\n`;
        message += `Source:\n${item.item.source}\n\n`;
        message += `Published:\n${published}\n\n`;
        message += `Summary:\n${summary}\n\n`;
        message += `Why it matters:\n${whyItMatters}\n\n`;
        message += `Read:\n${item.item.url}\n`;
        if (executionId) {
            message += `\nExecution:\n${executionId}`;
        }
        return message;
    }
}
exports.TelegramService = TelegramService;
//# sourceMappingURL=TelegramService.js.map