import { NotificationStateRepository } from '../NotificationStateRepository';

export class InMemoryNotificationStateRepository implements NotificationStateRepository {
  private sent = new Set<string>();

  public async initialize(): Promise<void> {}
  public async close(): Promise<void> {}

  private getKey(channel: string, id: string): string {
    return `${channel}:${id}`;
  }

  public async hasBeenSent(channel: string, canonicalNewsId: string): Promise<boolean> {
    return this.sent.has(this.getKey(channel, canonicalNewsId));
  }

  public async markSent(channel: string, canonicalNewsId: string): Promise<void> {
    this.sent.add(this.getKey(channel, canonicalNewsId));
  }
}
