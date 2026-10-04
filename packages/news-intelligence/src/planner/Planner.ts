import { CapabilityType } from '../core/Capability';
import { MemoryScope } from '../memory/MemoryService';

export interface MemoryRequirement {
  required: boolean;
  scopes?: MemoryScope[];
}

export interface StorageRequirement {
  required: boolean;
  type?: string; // E.g. 'document', 'database'
}

export interface PrivacyRequirement {
  cloud_allowed: boolean;
}

export interface ExecutionPlan {
  intent: string;
  capabilities: CapabilityType[];
  memory: MemoryRequirement;
  storage: StorageRequirement;
  privacy: PrivacyRequirement;
  verificationRequirements: string[];
}

export interface Planner {
  /**
   * Translates a natural language prompt into a structured execution plan.
   * This is generally powered by an AI Provider capable of intent classification.
   */
  createPlan(prompt: string): Promise<ExecutionPlan>;
}
