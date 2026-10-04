import { FileStorageProvider, FileMetadata } from './FileStorageProvider';
import { ProviderMetadata } from '../core/Provider';
export interface LocalFileStorageOptions {
    storageDir: string;
}
export declare class LocalFileStorage implements FileStorageProvider {
    readonly metadata: ProviderMetadata;
    private storageDir;
    constructor(options: string | LocalFileStorageOptions);
    configure(): Promise<void>;
    healthCheck(): Promise<boolean>;
    private getFilePath;
    upload(fileName: string, content: Buffer | string, mimeType?: string): Promise<FileMetadata>;
    download(fileId: string): Promise<Buffer>;
    delete(fileId: string): Promise<boolean>;
    exists(fileId: string): Promise<boolean>;
    getMetadata(fileId: string): Promise<FileMetadata | null>;
}
//# sourceMappingURL=LocalFileStorage.d.ts.map