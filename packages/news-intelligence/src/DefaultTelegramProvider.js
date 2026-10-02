"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTelegramProvider = void 0;
class DefaultTelegramProvider {
    token;
    constructor(token) {
        this.token = token;
    }
    async sendMessage(chatId, message) {
        if (!this.token) {
            throw new Error('Telegram token not configured');
        }
        const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
            }),
        });
        if (!response.ok) {
            const data = await response.text();
            throw new Error(`Telegram API Error: ${response.status} ${data}`);
        }
    }
}
exports.DefaultTelegramProvider = DefaultTelegramProvider;
//# sourceMappingURL=DefaultTelegramProvider.js.map