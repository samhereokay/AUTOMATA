import { AIProvider, GenerationOptions } from './types';

export class OllamaProvider implements AIProvider {
  name = 'ollama';
  private endpoint: string;
  private preferredModel: string | undefined;

  constructor(endpoint: string = 'http://localhost:11434', model?: string) {
    this.endpoint = endpoint;
    this.preferredModel = model;
  }


  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/version`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models.map((m: any) => m.name);
    } catch {
      return [];
    }
  }

  async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    // Basic implementation for generating text via Ollama
    const model = options?.model || await this.getDefaultModel();
    if (!model) throw new Error("No model available in Ollama");

    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens
        }
      })
    });
    
    if (!response.ok) throw new Error(`Ollama generation failed: ${response.statusText}`);
    const data = await response.json();
    return data.response;
  }

  async generateJSON<T>(prompt: string, schema?: any, options?: GenerationOptions): Promise<T> {
    const model = options?.model || await this.getDefaultModel();
    if (!model) throw new Error("No model available in Ollama");

    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: options?.temperature || 0,
        }
      })
    });

    if (!response.ok) throw new Error(`Ollama JSON generation failed: ${response.statusText}`);
    const data = await response.json();
    try {
      return JSON.parse(data.response) as T;
    } catch (e) {
      throw new Error(`Failed to parse JSON response from Ollama: ${data.response}`);
    }
  }

  private async getDefaultModel(): Promise<string | undefined> {
    if (this.preferredModel) return this.preferredModel;
    const models = await this.getModels();
    return models.length > 0 ? models[0] : undefined;
  }
}
