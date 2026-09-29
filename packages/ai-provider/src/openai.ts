import { AIProvider, GenerationOptions } from './types';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, endpoint: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async getModels(): Promise<string[]> {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];
  }

  async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    const model = options?.model || 'gpt-4o-mini';
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature,
        max_tokens: options?.maxTokens
      })
    });
    
    if (!response.ok) throw new Error(`OpenAI generation failed: ${response.statusText}`);
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateJSON<T>(prompt: string, schema?: any, options?: GenerationOptions): Promise<T> {
    const model = options?.model || 'gpt-4o-mini';
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature || 0,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) throw new Error(`OpenAI JSON generation failed: ${response.statusText}`);
    const data = await response.json();
    try {
      return JSON.parse(data.choices[0].message.content) as T;
    } catch (e) {
      throw new Error(`Failed to parse JSON response from OpenAI: ${data.choices[0].message.content}`);
    }
  }
}
