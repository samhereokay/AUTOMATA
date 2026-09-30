"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryNotificationStateRepository = void 0;
class InMemoryNotificationStateRepository {
    sent = new Set();
    async initialize() { }
    async close() { }
    getKey(channel, id) {
        return `${channel}:${id}`;
    }
    async hasBeenSent(channel, canonicalNewsId) {
        return this.sent.has(this.getKey(channel, canonicalNewsId));
    }
    async markSent(channel, canonicalNewsId) {
        this.sent.add(this.getKey(channel, canonicalNewsId));
    }
}
exports.InMemoryNotificationStateRepository = InMemoryNotificationStateRepository;
//# sourceMappingURL=InMemoryNotificationStateRepository.js.map