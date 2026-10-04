import { FileStorageProvider, FileMetadata } from './FileStorageProvider';
import { ProviderMetadata } from '../core/Provider';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface LocalFileStorageOptions {
  storageDir: string;
}

export class LocalFileStorage implements FileStorageProvider {
  public readonly metadata: ProviderMetadata = {
    id: 'local-fs',
    name: 'Local File System Storage',
    capabilities: ['storage'],
    executionMode: 'local',
    costModel: 'free',
    privacyModel: 'strict',
    availability: 'available',
    requiresCredentials: false
  };

  private storageDir: string;

  constructor(options: string | LocalFileStorageOptions) {
    if (typeof options === 'string') {
      this.storageDir = options;
    } else {
      this.storageDir = options.storageDir;
    }
  }

  public async configure(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await fs.access(this.storageDir);
      return true;
    } catch {
      return false;
    }
  }

  private getFilePath(fileId: string): string {
    // Basic sanitization
    const safeId = path.basename(fileId);
    return path.join(this.storageDir, safeId);
  }

  public async upload(fileName: string, content: Buffer | string, mimeType?: string): Promise<FileMetadata> {
    const fileId = crypto.randomUUID() + '-' + fileName;
    const filePath = this.getFilePath(fileId);
    
    const buffer = typeof content === 'string' ? Buffer.from(content) : content;
    await fs.writeFile(filePath, buffer);

    const stats = await fs.stat(filePath);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

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

  public async download(fileId: string): Promise<Buffer> {
    return await fs.readFile(this.getFilePath(fileId));
  }

  public async delete(fileId: string): Promise<boolean> {
    try {
      await fs.unlink(this.getFilePath(fileId));
      return true;
    } catch {
      return false;
    }
  }

  public async exists(fileId: string): Promise<boolean> {
    try {
      await fs.access(this.getFilePath(fileId));
      return true;
    } catch {
      return false;
    }
  }

  public async getMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const stats = await fs.stat(this.getFilePath(fileId));
      return {
        id: fileId,
        name: fileId.substring(fileId.indexOf('-') + 1),
        mimeType: 'application/octet-stream', // Hardcoded as we don't store metadata separate from the file here
        sizeBytes: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime
      };
    } catch {
      return null;
    }
  }
}
