import { Provider, ProviderMetadata } from '../core/Provider';

export interface N8nExecutionProviderOptions {
  n8nBaseUrl: string;
  webhookPath: string;
}

export class N8nExecutionProvider implements Provider {
  public readonly metadata: ProviderMetadata;
  private n8nBaseUrl: string;
  private webhookPath: string;

  constructor(metadata: ProviderMetadata, options: N8nExecutionProviderOptions) {
    this.metadata = metadata;
    this.n8nBaseUrl = options.n8nBaseUrl.replace(/\/$/, '');
    this.webhookPath = options.webhookPath.startsWith('/') ? options.webhookPath : `/${options.webhookPath}`;
  }

  public async healthCheck(): Promise<boolean> { return true; }
  public async configure(): Promise<void> {}

  public async execute(prompt: string, context?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const url = `${this.n8nBaseUrl}${this.webhookPath}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...context })
      });

      if (!response.ok) {
        throw new Error(`N8n execution failed with status: ${response.status}`);
      }

      let result;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch (e) {
        result = text;
      }
      return { source: 'n8n', success: true, result };
    } catch (e) {
      throw new Error(`Failed to execute n8n workflow: ${(e as Error).message}`);
    }
  }

  public async run(executionId: string): Promise<Record<string, unknown>> {
    return this.execute(`Run for executionId: ${executionId}`, { executionId });
  }
}
