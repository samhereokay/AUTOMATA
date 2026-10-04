import { Provider } from '../core/Provider';
export type StoragePolicy = 'LOCAL_ONLY' | 'CLOUD_ONLY' | 'HYBRID' | 'PER_DATA_TYPE';
export interface StructuredStorageProvider extends Provider {
    /**
     * Save a record to structured storage.
     */
    saveRecord(collection: string, id: string, data: any): Promise<void>;
    /**
     * Retrieve a record from structured storage.
     */
    getRecord(collection: string, id: string): Promise<any | null>;
    /**
     * Delete a record from structured storage.
     */
    deleteRecord(collection: string, id: string): Promise<boolean>;
}
//# sourceMappingURL=StorageProvider.d.ts.map