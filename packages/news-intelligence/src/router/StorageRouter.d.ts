import { FileStorageProvider } from '../storage/FileStorageProvider';
import { StorageRequirement, PrivacyRequirement } from '../planner/Planner';
export declare class StorageRouter {
    private providers;
    registerProvider(provider: FileStorageProvider): void;
    route(requirement: StorageRequirement, privacy: PrivacyRequirement): Promise<FileStorageProvider>;
}
//# sourceMappingURL=StorageRouter.d.ts.map