import { AIProvider } from './AIAnalyzer';

export interface LocalAIProviderOptions {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export class LocalAIProvider implements AIProvider {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;
  private fetchFn: typeof fetch;

  constructor(options?: LocalAIProviderOptions) {
    this.baseUrl = options?.baseUrl || 'http://127.0.0.1:11434/v1';
    this.model = options?.model || 'qwen2.5:3b';
    this.timeoutMs = options?.timeoutMs || 30000;
    this.fetchFn = options?.fetchFn || fetch;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/models`);
      return response.ok;
    } catch {
      return false;
    }
  }

  public async generate(prompt: string): Promise<string> {
    return this.executePrompt([{ role: 'user', content: prompt }]);
  }

  public async executePrompt(messages: { role: string; content: string }[]): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`AI Provider HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Malformed provider response');
      }

      let content = data.choices[0].message.content;
      if (!content) {
        throw new Error('Empty content in provider response');
      }

      return content;
    } catch (e: any) {
      if (e.name === 'AbortError' || (e.cause && e.cause.name === 'AbortError')) {
        throw new Error(`AI Provider timeout after ${this.timeoutMs}ms`);
      }
      throw new Error(`AI Provider failed: ${e.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public async analyze(input: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that strictly returns valid JSON output. Extract the required fields into a single JSON object with the following keys: "summary" (string), "keyPoints" (array of strings), "entities" (array of strings), "technologies" (array of strings), "tags" (array of strings), and "severity" (string: "low", "medium", "high", or "critical"). Do not include any other text.'
            },
            {
              role: 'user',
              content: `Please analyze the following news item:\n\n${input}`
            }
          ],
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`AI Provider HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Malformed provider response');
      }

      let content = data.choices[0].message.content;
      if (!content) {
        throw new Error('Empty content in provider response');
      }

      // Strip markdown JSON wrapping if present
      content = content.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();

      // Log the content so we can debug it
      console.log('AI Provider generated raw output:', content);

      return content;
    } catch (e: any) {
      if (e.name === 'AbortError' || (e.cause && e.cause.name === 'AbortError')) {
        throw new Error(`AI Provider timeout after ${this.timeoutMs}ms`);
      }
      if (e.cause && e.cause.code === 'ECONNREFUSED') {
        throw new Error(`AI Provider unavailable: connection refused to ${this.baseUrl}`);
      }
      // rethrow our own formatted errors
      if (e.message.startsWith('AI Provider') || e.message.includes('provider response')) {
        throw e;
      }
      throw new Error(`AI Provider failed: ${e.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
