"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalFileStorage = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
class LocalFileStorage {
    metadata = {
        id: 'local-fs',
        name: 'Local File System Storage',
        capabilities: ['storage'],
        executionMode: 'local',
        costModel: 'free',
        privacyModel: 'strict',
        availability: 'available',
        requiresCredentials: false
    };
    storageDir;
    constructor(options) {
        if (typeof options === 'string') {
            this.storageDir = options;
        }
        else {
            this.storageDir = options.storageDir;
        }
    }
    async configure() {
        await promises_1.default.mkdir(this.storageDir, { recursive: true });
    }
    async healthCheck() {
        try {
            await promises_1.default.access(this.storageDir);
            return true;
        }
        catch {
            return false;
        }
    }
    getFilePath(fileId) {
        // Basic sanitization
        const safeId = path_1.default.basename(fileId);
        return path_1.default.join(this.storageDir, safeId);
    }
    async upload(fileName, content, mimeType) {
        const fileId = crypto_1.default.randomUUID() + '-' + fileName;
        const filePath = this.getFilePath(fileId);
        const buffer = typeof content === 'string' ? Buffer.from(content) : content;
        await promises_1.default.writeFile(filePath, buffer);
        const stats = await promises_1.default.stat(filePath);
        const checksum = crypto_1.default.createHash('sha256').update(buffer).digest('hex');
        return {
            id: fileId,
            name: fileName,
            mimeType,
            sizeBytes: stats.size,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
            checksum
        };
    }
    async download(fileId) {
        return await promises_1.default.readFile(this.getFilePath(fileId));
    }
    async delete(fileId) {
        try {
            await promises_1.default.unlink(this.getFilePath(fileId));
            return true;
        }
        catch {
            return false;
        }
    }
    async exists(fileId) {
        try {
            await promises_1.default.access(this.getFilePath(fileId));
            return true;
        }
        catch {
            return false;
        }
    }
    async getMetadata(fileId) {
        try {
            const stats = await promises_1.default.stat(this.getFilePath(fileId));
            return {
                id: fileId,
                name: fileId.substring(fileId.indexOf('-') + 1),
                mimeType: 'application/octet-stream', // Hardcoded as we don't store metadata separate from the file here
                sizeBytes: stats.size,
                createdAt: stats.birthtime,
                updatedAt: stats.mtime
            };
        }
        catch {
            return null;
        }
    }
}
exports.LocalFileStorage = LocalFileStorage;
//# sourceMappingURL=LocalFileStorage.js.map