export interface AIProvider {
  name: string;
  generateText(prompt: string, options?: GenerationOptions): Promise<string>;
  generateJSON<T>(prompt: string, schema?: any, options?: GenerationOptions): Promise<T>;
  isAvailable(): Promise<boolean>;
  getModels(): Promise<string[]>;
}

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
