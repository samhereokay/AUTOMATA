import { Provider } from '../core/Provider';

export interface EmbeddingProvider extends Provider {
  /**
   * Generate an embedding vector for a single string.
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embedding vectors for an array of strings.
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Optional dimensionality of the embeddings
   */
  dimensions?: number;

  /**
   * Get health status
   */
  health?(): 'AVAILABLE' | 'UNAVAILABLE';
}
