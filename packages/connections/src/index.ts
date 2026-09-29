import { Connection, ConnectionManager } from './types';

// Mock implementation for Phase 1. 
// In production, this would use an AES-encrypted PostgreSQL database table and n8n API client.
export class LocalConnectionManager implements ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private secretStore: Map<string, Record<string, string>> = new Map();

  async createConnection(userId: string, provider: string, name: string, secrets: Record<string, string>): Promise<Connection> {
    const id = crypto.randomUUID();
    const conn: Connection = {
      id,
      userId,
      provider,
      name,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // In a real system, secrets would be encrypted before storing.
    this.secretStore.set(id, secrets);
    this.connections.set(id, conn);
    
    return conn;
  }

  async getConnection(id: string): Promise<Connection | undefined> {
    return this.connections.get(id);
  }

  async listConnections(userId: string): Promise<Connection[]> {
    return Array.from(this.connections.values()).filter(c => c.userId === userId);
  }

  async deleteConnection(id: string): Promise<void> {
    this.connections.delete(id);
    this.secretStore.delete(id);
  }

  async resolveForExecution(connectionId: string): Promise<string> {
    const conn = this.connections.get(connectionId);
    if (!conn) throw new Error("Connection not found");
    
    // In a real system, if conn.n8nCredentialId is empty, this is where we might call n8n API 
    // to create the credential and store the returned ID, ensuring n8n knows the secret.
    return conn.n8nCredentialId || `mock_n8n_cred_${connectionId}`;
  }
}

export * from './types';
