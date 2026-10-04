import { MemoryRequirement } from '../planner/Planner';
import { logger } from '../logger';
import { StructuredMemoryRepository } from '../memory/StructuredMemoryRepository';
import { SemanticMemoryRepository } from '../memory/SemanticMemoryRepository';
import { MemoryScope } from '../memory/MemoryService';

export class MemoryRouter {
  constructor(
    private semanticMemory: SemanticMemoryRepository,
    private structuredMemory: StructuredMemoryRepository
  ) {}

  public async route(requirement: MemoryRequirement): Promise<void> {
    if (!requirement.required) return;
    logger.info('Memory routing completed', { scopes: requirement.scopes });
  }

  // Structured Memory Methods
  public async storeStructured(scope: MemoryScope, scopeId: string, type: string, key: string, value: Record<string, unknown>): Promise<void> {
    await this.structuredMemory.set(scope, scopeId, type, key, value);
  }

  public async retrieveStructured(scope: MemoryScope, scopeId: string, type: string, key: string): Promise<Record<string, unknown> | null> {
    return await this.structuredMemory.get(scope, scopeId, type, key);
  }

  public async updateStructured(scope: MemoryScope, scopeId: string, type: string, key: string, value: Record<string, unknown>): Promise<void> {
    await this.structuredMemory.set(scope, scopeId, type, key, value);
  }

  public async deleteStructured(scope: MemoryScope, scopeId: string, type: string, key: string): Promise<void> {
    await this.structuredMemory.delete(scope, scopeId, type, key);
  }

  public async searchStructured(scope: MemoryScope, scopeId: string, type: string, key: string): Promise<Record<string, unknown> | null> {
    // Return exact match as basic search for structured data
    return await this.retrieveStructured(scope, scopeId, type, key);
  }
}
