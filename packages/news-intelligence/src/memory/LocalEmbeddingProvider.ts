import { EmbeddingProvider } from './EmbeddingProvider';
import { logger } from '../logger';
import { ProviderMetadata } from '../core/Provider';

export class LocalEmbeddingProvider implements EmbeddingProvider {
  public provider = 'ollama';
  public model: string;
  public dimensions: number = 2048; // Default, will be updated via tags if possible.
  public availability: 'AVAILABLE' | 'UNAVAILABLE' = 'UNAVAILABLE';
  private baseUrl: string;
  public readonly metadata: ProviderMetadata;

  constructor(baseUrl: string = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1') {
    // We rewrite the v1 endpoint to the base server endpoint since we need /api/tags
    this.baseUrl = baseUrl.replace('/v1', '');
    const envModel = process.env.OLLAMA_EMBEDDING_MODEL;
    this.model = envModel || 'none';
    this.metadata = {
      id: 'local-embedding-provider',
      name: 'Local Ollama Embeddings',
      capabilities: ['embedding'],
      executionMode: 'local',
      costModel: 'free',
      privacyModel: 'strict',
      availability: 'unavailable',
      requiresCredentials: false
    };
  }

  public async healthCheck(): Promise<boolean> {
    return this.availability === 'AVAILABLE';
  }

  public async configure(): Promise<void> {}

  public async execute(prompt: string, context?: Record<string, unknown>): Promise<Record<string, unknown>> {
    throw new Error('Not implemented for EmbeddingProvider');
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  public async init(): Promise<void> {
    if (this.model === 'none') {
      logger.info('No OLLAMA_EMBEDDING_MODEL configured. EmbeddingProvider will remain UNAVAILABLE.');
      this.availability = 'UNAVAILABLE';
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models from Ollama: ${response.status}`);
      }
      
      const data = await response.json();
      const modelExists = data.models?.some((m: any) => m.name === this.model || m.name.startsWith(this.model + ':'));
      
      if (!modelExists) {
        logger.warn(`Configured embedding model ${this.model} is not installed in Ollama. EmbeddingProvider will remain UNAVAILABLE. Do not download it automatically.`);
        this.availability = 'UNAVAILABLE';
        return;
      }

      // Test embedding capability
      const embedTestResponse = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt: 'test' })
      });

      if (!embedTestResponse.ok) {
        logger.warn(`Model ${this.model} exists, but embedding test failed (${embedTestResponse.status}). EmbeddingProvider UNAVAILABLE.`);
        this.availability = 'UNAVAILABLE';
        return;
      }

      const embedData = await embedTestResponse.json();
      if (embedData.error) {
        logger.warn(`Model ${this.model} exists, but embedding test returned error: ${embedData.error}. EmbeddingProvider UNAVAILABLE.`);
        this.availability = 'UNAVAILABLE';
        return;
      }

      if (embedData.embedding && Array.isArray(embedData.embedding)) {
        this.dimensions = embedData.embedding.length;
        this.availability = 'AVAILABLE';
        logger.info(`EmbeddingProvider AVAILABLE. Model: ${this.model}, Dimensions: ${this.dimensions}`);
      } else {
        logger.warn(`Model ${this.model} did not return a valid embedding array. EmbeddingProvider UNAVAILABLE.`);
        this.availability = 'UNAVAILABLE';
      }

    } catch (error) {
      logger.error('Failed to initialize LocalEmbeddingProvider:', error);
      this.availability = 'UNAVAILABLE';
    }
  }

  public async embed(text: string): Promise<number[]> {
    if (this.availability === 'UNAVAILABLE') {
      throw new Error(`Embedding capability is unavailable. Current model: ${this.model}`);
    }

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text })
    });

    if (!response.ok) {
      throw new Error(`Embedding request failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Embedding error: ${data.error}`);
    }

    return data.embedding;
  }

  public health(): 'AVAILABLE' | 'UNAVAILABLE' {
    return this.availability;
  }
}
