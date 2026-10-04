import { Provider } from '../core/Provider';

export interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
  checksum?: string;
}

export interface FileStorageProvider extends Provider {
  /**
   * Upload a file to storage.
   */
  upload(fileName: string, content: Buffer | string, mimeType: string): Promise<FileMetadata>;

  /**
   * Download a file from storage.
   */
  download(fileId: string): Promise<Buffer>;

  /**
   * Delete a file from storage.
   */
  delete(fileId: string): Promise<boolean>;

  /**
   * Check if a file exists.
   */
  exists(fileId: string): Promise<boolean>;

  /**
   * Retrieve metadata for a file.
   */
  getMetadata(fileId: string): Promise<FileMetadata | null>;
}
