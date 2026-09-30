import { TelegramProvider } from './TelegramService';

export class DefaultTelegramProvider implements TelegramProvider {
  constructor(private token: string) {}

  public async sendMessage(chatId: string, message: string): Promise<void> {
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
