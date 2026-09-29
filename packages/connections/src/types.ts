export interface Connection {
  id: string;
  userId: string;
  provider: string; // e.g., 'telegram', 'elevenlabs', 'google_drive'
  name: string;
  n8nCredentialId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionManager {
  createConnection(userId: string, provider: string, name: string, secrets: Record<string, string>): Promise<Connection>;
  getConnection(id: string): Promise<Connection | undefined>;
  listConnections(userId: string): Promise<Connection[]>;
  deleteConnection(id: string): Promise<void>;
  
  // Resolves the connection to n8n specific credential payload if needed, 
  // or fetches the mapped n8nCredentialId so the execution manager can pass it.
  resolveForExecution(connectionId: string): Promise<string>;
}
