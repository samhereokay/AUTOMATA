export type CapabilityType = 
  | 'ai'
  | 'research'
  | 'news-intelligence'
  | 'storage'
  | 'memory'
  | 'documents'
  | 'design'
  | 'coding'
  | 'notification'
  | 'embedding';

export interface Capability {
  readonly type: CapabilityType;
  readonly description: string;
}
